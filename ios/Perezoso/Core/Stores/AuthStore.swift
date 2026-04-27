import Foundation
import Observation
import Supabase
import AuthenticationServices
import UIKit

/// Observable auth state for the whole app.
///
/// `PerezosoApp` injects this into the environment once; every view
/// reads it via `@Environment(AuthStore.self)` and reacts
/// automatically when `state` changes.
@Observable
final class AuthStore: @unchecked Sendable {

    // MARK: - Public state

    enum AuthState: Equatable {
        case unknown   // bootstrap in progress
        case signedOut
        case signedIn
    }

    nonisolated(unsafe) private(set) var state: AuthState = .unknown
    private(set) var session: Session?
    private(set) var profile: Profile?

    /// Convenience — true when a valid session exists.
    var isAuthenticated: Bool { state == .signedIn }

    // MARK: - Private OAuth helpers

    private var webAuthSession: ASWebAuthenticationSession?
    private let webAuthContextProvider = WebAuthContextProvider()

    // MARK: - Bootstrap

    /// Called once at app launch from `.task {}` in PerezosoApp.
    /// Checks whether a saved session exists in Keychain and
    /// refreshes it with Supabase. Sets `state` accordingly.
    func bootstrap() async {
        // In preview mode (no real keys) skip network and show UI
        guard !AppEnvironment.shared.isPreview else {
            state = .signedOut
            return
        }

        do {
            // Race the session check against a 5-second timeout so
            // the app never gets stuck on a white screen.
            session = try await withThrowingTaskGroup(of: Session.self) { group in
                group.addTask {
                    try await SupabaseManager.requireClient.auth.session
                }
                group.addTask {
                    try await Task.sleep(for: .seconds(5))
                    throw CancellationError()
                }
                guard let result = try await group.next() else {
                    throw CancellationError()
                }
                group.cancelAll()
                return result
            }
            await fetchProfile()
            state = .signedIn
        } catch {
            session = nil
            profile = nil
            state = .signedOut
        }

        // Listen for future auth state changes (sign-in, sign-out,
        // token refresh) and update state reactively.
        Task { [weak self] in
            for await (event, newSession) in SupabaseManager.requireClient.auth.authStateChanges {
                guard let self else { return }
                switch event {
                case .signedIn:
                    self.session = newSession
                    await self.fetchProfile()
                    self.state = .signedIn
                case .signedOut:
                    self.session = nil
                    self.profile = nil
                    self.state = .signedOut
                default:
                    break
                }
            }
        }
    }

    // MARK: - Sign in with Apple

    /// Starts the native Sign in with Apple flow and exchanges the
    /// credential with Supabase. Supabase creates the user
    /// automatically on first sign-in.
    func signInWithApple(_ authorization: ASAuthorization) async throws {
        guard
            let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
            let idTokenData = credential.identityToken,
            let idToken = String(data: idTokenData, encoding: .utf8)
        else {
            throw AuthError.missingAppleCredential
        }
        let session = try await SupabaseManager.requireClient.auth.signInWithIdToken(
            credentials: .init(provider: .apple, idToken: idToken)
        )
        self.session = session
        await fetchProfile()
        state = .signedIn
    }

    // MARK: - Sign in with Google (OAuth via ASWebAuthenticationSession)

    /// Opens an in-app browser (ASWebAuthenticationSession) pointing
    /// at Supabase's Google OAuth endpoint, waits for the redirect
    /// callback, then exchanges the code for a session.
    @MainActor
    func signInWithGoogle() async throws {
        // 1. Build the OAuth authorization URL
        let oauthURL = try SupabaseManager.requireClient.auth.getOAuthSignInURL(
            provider: .google,
            redirectTo: URL(string: "perezoso://auth/callback")
        )

        // 2. Present ASWebAuthenticationSession and wait for callback
        let callbackURL: URL = try await withCheckedThrowingContinuation { continuation in
            let session = ASWebAuthenticationSession(
                url: oauthURL,
                callbackURLScheme: "perezoso"
            ) { [weak self] url, error in
                self?.webAuthSession = nil
                if let error {
                    continuation.resume(throwing: error)
                } else if let url {
                    continuation.resume(returning: url)
                } else {
                    continuation.resume(throwing: AuthError.oauthFailed)
                }
            }
            session.presentationContextProvider = webAuthContextProvider
            session.prefersEphemeralWebBrowserSession = false
            self.webAuthSession = session
            session.start()
        }

        // 3. Exchange the callback URL for a Supabase session
        let newSession = try await SupabaseManager.requireClient.auth.session(from: callbackURL)
        self.session = newSession
        await fetchProfile()
        state = .signedIn
    }

    // MARK: - Sign out

    func signOut() async {
        try? await SupabaseManager.requireClient.auth.signOut()
        session = nil
        profile = nil
        state = .signedOut
    }

    // MARK: - Profile

    private func fetchProfile() async {
        guard let userId = session?.user.id else { return }
        do {
            profile = try await SupabaseManager.requireClient
                .from("profiles")
                .select()
                .eq("id", value: userId.uuidString)
                .single()
                .execute()
                .value
        } catch {
            profile = nil
        }
    }

    // MARK: - Errors

    enum AuthError: LocalizedError {
        case missingAppleCredential
        case oauthFailed

        var errorDescription: String? {
            switch self {
            case .missingAppleCredential:
                "Could not retrieve Apple ID credential."
            case .oauthFailed:
                "OAuth authentication failed. Please try again."
            }
        }
    }
}

// MARK: - Web Auth Presentation Context

/// Provides the key window as the presentation anchor for
/// ASWebAuthenticationSession. Kept as a separate NSObject subclass
/// because the protocol requires NSObjectProtocol conformance.
private class WebAuthContextProvider: NSObject, ASWebAuthenticationPresentationContextProviding {
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        // This delegate method is always called on the main thread.
        MainActor.assumeIsolated {
            guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                  let window = scene.windows.first
            else { return UIWindow() }
            return window
        }
    }
}

// MARK: - Preview helpers

extension AuthStore {
    static func preview(state: AuthState = .signedIn) -> AuthStore {
        let store = AuthStore()
        store.state = state
        store.profile = state == .signedIn ? .mock : nil
        return store
    }
}
