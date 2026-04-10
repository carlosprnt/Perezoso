import Foundation

/// Reads environment-sensitive keys from Info.plist at runtime.
///
/// The actual values live in `Config.xcconfig` (gitignored) and are
/// injected into Info.plist by the build system via `$(SUPABASE_URL)`
/// variable expansion. This keeps secrets out of source control while
/// making them available to Swift without a code-gen step.
///
/// In Debug builds, if keys are missing the app falls back to dummy
/// values so the UI can be previewed in the Simulator without
/// configuring a real backend. Auth and network calls will fail
/// gracefully — everything else (onboarding carousel, design system,
/// navigation) works.
struct AppEnvironment {
    static let shared = AppEnvironment()

    let supabaseURL: URL
    let supabaseAnonKey: String
    let revenueCatKey: String

    /// `true` when running with placeholder keys (no real backend).
    let isPreview: Bool

    private init() {
        let urlString = Self.plistValue("SUPABASE_URL")
        let anonKey = Self.plistValue("SUPABASE_ANON_KEY")
        let rcKey = Self.plistValue("REVENUECAT_IOS_KEY")

        let hasValidKeys = urlString != nil
            && URL(string: urlString!) != nil
            && anonKey != nil && !anonKey!.isEmpty
            && rcKey != nil && !rcKey!.isEmpty

        #if DEBUG
        if hasValidKeys {
            self.supabaseURL = URL(string: urlString!)!
            self.supabaseAnonKey = anonKey!
            self.revenueCatKey = rcKey!
            self.isPreview = false
        } else {
            // Fallback so the UI can be explored in Simulator
            self.supabaseURL = URL(string: "https://placeholder.supabase.co")!
            self.supabaseAnonKey = "placeholder"
            self.revenueCatKey = "placeholder"
            self.isPreview = true
        }
        #else
        guard let urlString, let url = URL(string: urlString) else {
            fatalError(
                "SUPABASE_URL missing from Info.plist. "
                + "Did you create ios/Config.xcconfig from Config.xcconfig.example?"
            )
        }
        guard let anonKey, !anonKey.isEmpty else {
            fatalError("SUPABASE_ANON_KEY missing from Info.plist.")
        }
        guard let rcKey, !rcKey.isEmpty else {
            fatalError("REVENUECAT_IOS_KEY missing from Info.plist.")
        }
        self.supabaseURL = url
        self.supabaseAnonKey = anonKey
        self.revenueCatKey = rcKey
        self.isPreview = false
        #endif
    }

    private static func plistValue(_ key: String) -> String? {
        guard let value = Bundle.main.infoDictionary?[key] as? String,
              !value.isEmpty,
              !value.hasPrefix("$(") // unexpanded xcconfig variable
        else { return nil }
        return value
    }
}
