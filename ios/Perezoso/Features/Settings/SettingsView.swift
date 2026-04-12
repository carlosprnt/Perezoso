import SwiftUI

/// App settings screen.
///
/// Sections: user profile, Perezoso Pro upgrade CTA, appearance,
/// notifications toggle, preferred currency, and destructive actions
/// (sign out, delete account). Uses rounded typography and adaptive
/// accent colors matching the web design.
struct SettingsView: View {
    @Environment(AuthStore.self) private var auth
    @Environment(SubscriptionsStore.self) private var store
    @Environment(PreferencesStore.self) private var prefs

    @State private var showPaywall = false
    @State private var showDeleteConfirmation = false
    @State private var showSignOutConfirmation = false
    @State private var notificationsEnabled = true
    @State private var selectedAppearance: AppearanceMode = .system

    // MARK: - Body

    var body: some View {
        ScrollView {
            VStack(spacing: Spacing.xl) {
                // Title (when presented as sheet)
                HStack {
                    Text("Ajustes")
                        .font(.title)
                        .foregroundStyle(Color.textPrimary)
                    Spacer()
                }

                profileSection
                if !(auth.profile?.isPro ?? false) {
                    proSection
                }
                appearanceSection
                notificationsSection
                currencySection
                dangerSection
                versionFooter
            }
            .padding(.horizontal, Spacing.xl)
            .padding(.top, Spacing.md)
            .padding(.bottom, 120)
        }
        .background(Color.background)
        .sheet(isPresented: $showPaywall) {
            PaywallView()
                .presentationDragIndicator(.visible)
                .presentationCornerRadius(Radius.sheet)
        }
        .confirmationDialog(
            "¿Cerrar sesión?",
            isPresented: $showSignOutConfirmation,
            titleVisibility: .visible
        ) {
            Button("Cerrar sesión", role: .destructive) {
                Task { await auth.signOut() }
            }
            Button("Cancelar", role: .cancel) {}
        }
        .confirmationDialog(
            "¿Eliminar cuenta?",
            isPresented: $showDeleteConfirmation,
            titleVisibility: .visible
        ) {
            Button("Eliminar cuenta", role: .destructive) {
                // TODO: call delete-account edge function
            }
            Button("Cancelar", role: .cancel) {}
        } message: {
            Text("Todos tus datos se eliminarán de forma permanente. Esta acción no se puede deshacer.")
        }
    }

    // MARK: - Sections

    private var profileSection: some View {
        SettingsSection(title: "Perfil") {
            HStack(spacing: Spacing.md) {
                Circle()
                    .fill(Color.accentLight)
                    .frame(width: 52, height: 52)
                    .overlay(
                        Text(avatarInitial)
                            .font(.rounded(.bold, size: 20))
                            .foregroundStyle(Color.accent)
                    )

                VStack(alignment: .leading, spacing: 2) {
                    Text(auth.profile?.displayName ?? "Usuario")
                        .font(.bodyMedium)
                        .foregroundStyle(Color.textPrimary)
                    if let email = auth.profile?.email {
                        Text(email)
                            .font(.caption)
                            .foregroundStyle(Color.textMuted)
                    }
                }

                Spacer()

                if auth.profile?.isPro == true {
                    ProBadge()
                }
            }
            .padding(Spacing.lg)
        }
    }

    private var proSection: some View {
        Card(.elevated) {
            VStack(spacing: Spacing.md) {
                HStack {
                    VStack(alignment: .leading, spacing: Spacing.xxs) {
                        Text("Perezoso Pro")
                            .font(.headline)
                            .foregroundStyle(Color.textPrimary)
                        Text("Desbloquea todas las funciones")
                            .font(.caption)
                            .foregroundStyle(Color.textSecondary)
                    }
                    Spacer()
                    Image(systemName: "star.fill")
                        .font(.system(size: 24))
                        .foregroundStyle(Color.accent)
                }

                Divider()

                PrimaryButton(title: "Ver planes Pro") {
                    Haptics.tap()
                    showPaywall = true
                }
            }
            .padding(Spacing.lg)
        }
    }

    private var appearanceSection: some View {
        SettingsSection(title: "Apariencia") {
            VStack(spacing: 0) {
                ForEach(AppearanceMode.allCases) { mode in
                    Button {
                        Haptics.selection()
                        selectedAppearance = mode
                        applyAppearance(mode)
                    } label: {
                        HStack {
                            Label(mode.label, systemImage: mode.icon)
                                .font(.bodyMedium)
                                .foregroundStyle(Color.textPrimary)
                            Spacer()
                            if selectedAppearance == mode {
                                Image(systemName: "checkmark")
                                    .foregroundStyle(Color.accent)
                                    .fontWeight(.semibold)
                            }
                        }
                        .padding(Spacing.lg)
                    }
                    if mode != AppearanceMode.allCases.last {
                        Divider().padding(.leading, Spacing.lg)
                    }
                }
            }
        }
    }

    private var notificationsSection: some View {
        SettingsSection(title: "Notificaciones") {
            HStack {
                Label("Avisos de renovación", systemImage: "bell.fill")
                    .font(.bodyMedium)
                    .foregroundStyle(Color.textPrimary)
                Spacer()
                Toggle("", isOn: $notificationsEnabled)
                    .tint(Color.accent)
                    .labelsHidden()
            }
            .padding(Spacing.lg)
        }
    }

    private var currencySection: some View {
        SettingsSection(title: "Moneda preferida") {
            HStack {
                Label("Moneda", systemImage: "banknote")
                    .font(.bodyMedium)
                    .foregroundStyle(Color.textPrimary)
                Spacer()
                @Bindable var prefsBindable = prefs
                Picker("Moneda", selection: $prefsBindable.preferredCurrency) {
                    ForEach(["EUR", "USD", "GBP", "JPY", "CHF", "MXN"], id: \.self) { code in
                        Text(code).tag(code)
                    }
                }
                .tint(Color.textSecondary)
            }
            .padding(Spacing.lg)
        }
    }

    private var dangerSection: some View {
        SettingsSection(title: "Cuenta") {
            VStack(spacing: 0) {
                Button {
                    Haptics.tap()
                    showSignOutConfirmation = true
                } label: {
                    HStack {
                        Label("Cerrar sesión", systemImage: "rectangle.portrait.and.arrow.right")
                            .font(.bodyMedium)
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.caption)
                            .foregroundStyle(Color.textDisabled)
                    }
                    .foregroundStyle(Color.textPrimary)
                    .padding(Spacing.lg)
                }

                Divider().padding(.leading, Spacing.lg)

                Button {
                    Haptics.notification(.warning)
                    showDeleteConfirmation = true
                } label: {
                    HStack {
                        Label("Eliminar cuenta", systemImage: "trash")
                            .font(.bodyMedium)
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.caption)
                            .foregroundStyle(Color.textDisabled)
                    }
                    .foregroundStyle(Color.danger)
                    .padding(Spacing.lg)
                }
            }
        }
    }

    private var versionFooter: some View {
        VStack(spacing: Spacing.xxs) {
            Text("Perezoso")
                .font(.caption)
                .foregroundStyle(Color.textMuted)
            Text("Version \(appVersion) (\(buildNumber))")
                .font(.micro)
                .foregroundStyle(Color.textDisabled)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, Spacing.sm)
    }

    // MARK: - Helpers

    private var avatarInitial: String {
        String(auth.profile?.firstName.prefix(1).uppercased() ?? "P")
    }

    private var appVersion: String {
        Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
    }

    private var buildNumber: String {
        Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"
    }

    private func applyAppearance(_ mode: AppearanceMode) {
        guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene else { return }
        scene.windows.forEach { window in
            window.overrideUserInterfaceStyle = mode.uiStyle
        }
    }
}

// MARK: - Appearance Mode

private enum AppearanceMode: String, CaseIterable, Identifiable {
    case system, light, dark

    var id: String { rawValue }

    var label: String {
        switch self {
        case .system: "Sistema"
        case .light:  "Claro"
        case .dark:   "Oscuro"
        }
    }

    var icon: String {
        switch self {
        case .system: "circle.lefthalf.filled"
        case .light:  "sun.max.fill"
        case .dark:   "moon.fill"
        }
    }

    var uiStyle: UIUserInterfaceStyle {
        switch self {
        case .system: .unspecified
        case .light:  .light
        case .dark:   .dark
        }
    }
}

// MARK: - Pro Badge

private struct ProBadge: View {
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: "lock.fill")
                .font(.system(size: 9))
            Text("PRO")
                .font(.micro)
        }
        .foregroundStyle(Color.textPrimary)
        .padding(.horizontal, Spacing.sm)
        .padding(.vertical, Spacing.xxs)
        .background(Color(hex: "#EEEEFF"), in: Capsule())
    }
}

// MARK: - Section Container

private struct SettingsSection<Content: View>: View {
    let title: String
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text(title.uppercased())
                .font(.micro)
                .foregroundStyle(Color.textMuted)
                .padding(.horizontal, Spacing.xs)

            Card {
                content()
            }
        }
    }
}

// MARK: - Preview

#Preview {
    SettingsView()
        .environment(AuthStore.preview())
        .environment(SubscriptionsStore.preview())
        .environment(PreferencesStore())
}
