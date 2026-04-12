import Foundation
import Supabase

/// Single shared Supabase client for the entire app.
///
/// Initialised lazily at first access from the keys in
/// `AppEnvironment` (which reads from Info.plist ← Config.xcconfig).
/// When running in preview / placeholder mode the client is `nil`
/// and all stores should guard on `AppEnvironment.shared.isPreview`.
enum SupabaseManager {

    /// The shared client — `nil` when keys are missing or preview mode.
    nonisolated(unsafe) static let client: SupabaseClient? = {
        let env = AppEnvironment.shared
        guard !env.isPreview else { return nil }

        return SupabaseClient(
            supabaseURL: env.supabaseURL,
            supabaseKey: env.supabaseAnonKey
        )
    }()

    /// Non-optional accessor for convenience. Crashes only if called
    /// while `isPreview` is true — stores guard against that already.
    static var requireClient: SupabaseClient {
        guard let client else {
            fatalError("SupabaseManager.client is nil — are you in preview mode?")
        }
        return client
    }
}
