import SwiftUI

/// Auth-gated root view — smooth cross-fade between login and main app.
struct RootView: View {
    @Environment(AuthStore.self) private var auth

    var body: some View {
        ZStack {
            switch auth.state {
            case .unknown:
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

/// Custom navigation with floating pill nav bar.
/// Uses custom overlays for all secondary screens — no native sheets.
struct MainTabView: View {
    @State private var selectedTab: AppTab = .dashboard
    @State private var showAddSheet = false
    @State private var showCalendar = false
    @State private var showSettings = false

    var body: some View {
        ZStack(alignment: .bottom) {
            // ── Active tab content ──────────────────────────
            Group {
                switch selectedTab {
                case .dashboard:
                    DashboardView(
                        onCalendarTap: { showCalendar = true },
                        onSettingsTap: { showSettings = true }
                    )
                case .subscriptions:
                    SubscriptionsListView()
                case .calendar:
                    CalendarView()
                case .settings:
                    SettingsView()
                }
            }
            .transition(.opacity)
            .animation(.easeInOut(duration: 0.15), value: selectedTab)

            // ── Floating nav bar ────────────────────────────
            FloatingNavBar(selectedTab: $selectedTab) {
                showAddSheet = true
            }
            .padding(.bottom, 16)
        }
        .ignoresSafeArea(.keyboard)
        // All overlays are custom — no native .sheet()
        .overlay {
            CustomBottomSheet(isPresented: $showAddSheet, height: .full, title: "Nueva suscripción") {
                SubscriptionFormView(mode: .create)
            }
        }
        .overlay {
            CustomBottomSheet(isPresented: $showCalendar, height: .full) {
                CalendarView()
            }
        }
        .overlay {
            CustomBottomSheet(isPresented: $showSettings, height: .full) {
                SettingsView()
            }
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
