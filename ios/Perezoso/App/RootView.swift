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

/// The main navigation shown to authenticated users.
///
/// Replaces the standard TabView with a custom floating pill
/// navigation bar matching the web app's mobile UI.
/// Shows: Dashboard · Subscriptions (with floating + button).
/// Calendar and Settings are accessible from the dashboard header.
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
        .sheet(isPresented: $showAddSheet) {
            SubscriptionFormView(mode: .create)
                .presentationDragIndicator(.visible)
                .presentationCornerRadius(Radius.sheet)
        }
        .sheet(isPresented: $showCalendar) {
            CalendarView()
                .presentationDragIndicator(.visible)
                .presentationCornerRadius(Radius.sheet)
        }
        .sheet(isPresented: $showSettings) {
            SettingsView()
                .presentationDragIndicator(.visible)
                .presentationCornerRadius(Radius.sheet)
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
