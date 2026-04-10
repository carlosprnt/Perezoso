import Foundation
import Supabase

/// Single shared Supabase client for the entire app.
///
/// Initialised once at startup from the keys in `AppEnvironment`
/// (which reads from Info.plist ← Config.xcconfig).
enum SupabaseManager {
    /// The shared client. Use this from stores and services.
    static let client = SupabaseClient(
        supabaseURL: AppEnvironment.shared.supabaseURL,
        supabaseKey: AppEnvironment.shared.supabaseAnonKey,
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
}
