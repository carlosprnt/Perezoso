import Foundation
import Observation
import Supabase
import AuthenticationServices

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

    private(set) var state: AuthState = .unknown
    private(set) var session: Session?
    private(set) var profile: Profile?

    /// Convenience — true when a valid session exists.
    var isAuthenticated: Bool { state == .signedIn }

    // MARK: - Bootstrap

    /// Called once at app launch from `.task {}` in PerezosoApp.
    /// Checks whether a saved session exists in Keychain and
    /// refreshes it with Supabase. Sets `state` accordingly.
    func bootstrap() async {
        do {
            session = try await SupabaseManager.client.auth.session
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
            for await (event, newSession) in SupabaseManager.client.auth.authStateChanges {
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
        let session = try await SupabaseManager.client.auth.signInWithIdToken(
            credentials: .init(provider: .apple, idToken: idToken)
        )
        self.session = session
        await fetchProfile()
        state = .signedIn
    }

    // MARK: - Sign in with Google (OAuth via ASWebAuthenticationSession)

    func signInWithGoogle() async throws {
        try await SupabaseManager.client.auth.signInWithOAuth(
            provider: .google,
            queryParams: [
                ("access_type", "offline"),
                ("prompt", "select_account"),
            ]
        ) { url in
            // On iOS the Supabase SDK opens the URL in
            // ASWebAuthenticationSession automatically.
            await UIApplication.shared.open(url)
        }
    }

    // MARK: - Sign out

    func signOut() async {
        try? await SupabaseManager.client.auth.signOut()
        session = nil
        profile = nil
        state = .signedOut
    }

    // MARK: - Profile

    private func fetchProfile() async {
        guard let userId = session?.user.id else { return }
        do {
            profile = try await SupabaseManager.client
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

        var errorDescription: String? {
            switch self {
            case .missingAppleCredential:
                "Could not retrieve Apple ID credential."
            }
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
