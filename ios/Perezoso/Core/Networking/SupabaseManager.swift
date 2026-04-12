import Foundation
import Supabase

/// Single shared Supabase client for the entire app.
///
/// Initialised lazily at first access from the keys in
/// `AppEnvironment` (which reads from Info.plist ← Config.xcconfig).
/// When running in preview / placeholder mode the client still gets
/// created with dummy values — but `AuthStore.bootstrap()` will
/// skip using it, so the app never crashes.
enum SupabaseManager {
    /// The shared client. Use this from stores and services.
    /// Lazy `nonisolated(unsafe)` avoids eager `static let` init that
    /// can crash the Supabase SDK if keys are placeholders.
    nonisolated(unsafe) static private(set) lazy var client: SupabaseClient = {
        let env = AppEnvironment.shared
        return SupabaseClient(
            supabaseURL: env.supabaseURL,
            supabaseKey: env.supabaseAnonKey,
            options: .init(
                db: .init(
                    encoder: {
                        let e = JSONEncoder()
                        e.keyEncodingStrategy = .convertToSnakeCase
                        e.dateEncodingStrategy = .iso8601
                        return e
                    }(),
                    decoder: {
                        let d = JSONDecoder()
                        d.keyDecodingStrategy = .convertFromSnakeCase
                        d.dateDecodingStrategy = .iso8601
                        return d
                    }()
                ),
                auth: .init(
                    redirectToURL: URL(string: "perezoso://auth/callback")
                )
            )
        )
    }()
}
