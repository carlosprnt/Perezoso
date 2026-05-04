import Foundation
import Observation

/// Lightweight local preferences kept in UserDefaults.
/// No server round-trip — purely device-local settings.
@Observable
final class PreferencesStore {
    var hasSeenOnboarding: Bool {
        didSet { UserDefaults.standard.set(hasSeenOnboarding, forKey: "hasSeenOnboarding") }
    }
    var preferredCurrency: String {
        didSet { UserDefaults.standard.set(preferredCurrency, forKey: "preferredCurrency") }
    }

    init() {
        self.hasSeenOnboarding = UserDefaults.standard.bool(forKey: "hasSeenOnboarding")
        self.preferredCurrency = UserDefaults.standard.string(forKey: "preferredCurrency") ?? "EUR"
    }
}
