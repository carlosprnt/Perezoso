import Foundation

/// Reads environment-sensitive keys from Info.plist at runtime.
///
/// The actual values live in `Config.xcconfig` (gitignored) and are
/// injected into Info.plist by the build system via `$(SUPABASE_URL)`
/// variable expansion. This keeps secrets out of source control while
/// making them available to Swift without a code-gen step.
struct AppEnvironment {
    static let shared = AppEnvironment()

    let supabaseURL: URL
    let supabaseAnonKey: String
    let revenueCatKey: String

    private init() {
        guard
            let urlString = Self.plistValue("SUPABASE_URL"),
            let url = URL(string: urlString)
        else {
            fatalError(
                "SUPABASE_URL missing from Info.plist. "
                + "Did you create ios/Config.xcconfig from Config.xcconfig.example?"
            )
        }
        guard let anonKey = Self.plistValue("SUPABASE_ANON_KEY"), !anonKey.isEmpty else {
            fatalError("SUPABASE_ANON_KEY missing from Info.plist.")
        }
        guard let rcKey = Self.plistValue("REVENUECAT_IOS_KEY"), !rcKey.isEmpty else {
            fatalError("REVENUECAT_IOS_KEY missing from Info.plist.")
        }
        self.supabaseURL = url
        self.supabaseAnonKey = anonKey
        self.revenueCatKey = rcKey
    }

    private static func plistValue(_ key: String) -> String? {
        Bundle.main.infoDictionary?[key] as? String
    }
}
