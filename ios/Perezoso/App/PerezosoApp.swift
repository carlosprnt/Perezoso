import SwiftUI
import RevenueCat

/// Main application entry point.
///
/// Wires the top-level `@Observable` stores into the environment
/// once, so every screen can read them via `@Environment(...)`.
/// Keeps a single source of truth for auth / subscriptions /
/// preferences — no prop drilling, no context providers.
@main
struct PerezosoApp: App {
    @State private var auth = AuthStore()
    @State private var subscriptions = SubscriptionsStore()
    @State private var preferences = PreferencesStore()

    init() {
        configureRevenueCat()
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(auth)
                .environment(subscriptions)
                .environment(preferences)
                .tint(.accent)
                .task {
                    await auth.bootstrap()
                }
        }
    }

    private func configureRevenueCat() {
        // RevenueCat logs are very noisy at .debug — keep them at .error
        // except when you're actively debugging a purchase flow.
        Purchases.logLevel = .error
        Purchases.configure(withAPIKey: AppEnvironment.shared.revenueCatKey)
    }
}
