import SwiftUI

/// Auth-gated root view. Shows the login / onboarding flow when the
/// user is not authenticated, and the main tab bar otherwise.
///
/// Auth state changes produce a smooth cross-fade between the two
/// branches — no navigation push, because "logged in" and "not
/// logged in" are fundamentally different app states, not sibling
/// screens.
struct RootView: View {
    @Environment(AuthStore.self) private var auth

    var body: some View {
        ZStack {
            switch auth.state {
            case .unknown:
                // First launch / bootstrap in progress — show a
                // background-only splash matching the app chrome.
                Color.background
                    .ignoresSafeArea()
                    .transition(.opacity)

            case .signedOut:
                LoginView()
                    .transition(.opacity)

            case .signedIn:
                MainTabView()
                    .transition(.opacity)
            }
        }
        .animation(.smooth(duration: 0.3), value: auth.state)
    }
}

/// The main tab bar shown to authenticated users. Mirrors the
/// primary navigation of the web app: Dashboard · Subscriptions ·
/// Calendar · Settings.
struct MainTabView: View {
    @State private var selectedTab: Tab = .dashboard

    enum Tab: Hashable {
        case dashboard
        case subscriptions
        case calendar
        case settings
    }

    var body: some View {
        TabView(selection: $selectedTab) {
            DashboardView()
                .tabItem {
                    Label("Inicio", systemImage: "house.fill")
                }
                .tag(Tab.dashboard)

            SubscriptionsListView()
                .tabItem {
                    Label("Suscripciones", systemImage: "rectangle.stack.fill")
                }
                .tag(Tab.subscriptions)

            CalendarView()
                .tabItem {
                    Label("Calendario", systemImage: "calendar")
                }
                .tag(Tab.calendar)

            SettingsView()
                .tabItem {
                    Label("Ajustes", systemImage: "gearshape.fill")
                }
                .tag(Tab.settings)
        }
    }
}

#Preview("Signed in") {
    RootView()
        .environment(AuthStore.preview(state: .signedIn))
        .environment(SubscriptionsStore.preview())
        .environment(PreferencesStore())
}

#Preview("Signed out") {
    RootView()
        .environment(AuthStore.preview(state: .signedOut))
        .environment(SubscriptionsStore.preview())
        .environment(PreferencesStore())
}
