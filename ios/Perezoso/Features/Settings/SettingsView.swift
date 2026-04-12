import SwiftUI

/// Settings screen matching the web's SettingsView.tsx exactly.
///
/// Web spec:
/// - Sections in white card containers (rounded-2xl)
/// - Rows: px-4 py-4, gap-3 between icon & label
/// - IconTile: 40x40, rounded-[10px], colored background, 15px icon
/// - Perezoso Plus banner with shimmer border
/// - User card: 48x48 avatar, name + email
/// - Currency: coins icon, native select overlay
/// - Notifications: bell icon, iOS toggle
/// - Appearance: moon icon, theme select
/// - Support: star + share rows
/// - Contact: twitter + email rows
/// - Danger: trash icon, red text
struct SettingsView: View {
    @Environment(AuthStore.self) private var auth
    @Environment(SubscriptionsStore.self) private var store
    @Environment(PreferencesStore.self) private var prefs

    @State private var showPaywall = false
    @State private var showDeleteConfirmation = false
    @State private var showSignOutConfirmation = false
    @State private var notificationsEnabled = true
    @State private var selectedAppearance: AppearanceMode = .system

    var body: some View {
        ScrollView {
            VStack(spacing: Spacing.md) {
                // Title
                HStack {
                    Text("Ajustes")
                        .font(.rounded(.bold, size: 22))
                        .foregroundStyle(Color.textPrimary)
                    Spacer()
                }
                .padding(.bottom, Spacing.sm)

                // Perezoso Plus banner
                if !(auth.profile?.isPro ?? false) {
                    proBanner
                }

                // User card
                userCard

                // Currency + Notifications
                preferencesGroup

                // Appearance
                appearanceGroup

                // Support
                supportGroup

                // Contact
                contactGroup

                // Danger zone
                dangerGroup

                // Version
                versionFooter
            }
            .padding(.horizontal, Spacing.xl)
            .padding(.top, Spacing.md)
            .padding(.bottom, 120)
        }
        .background(Color.background)
        .overlay {
            CustomBottomSheet(isPresented: $showPaywall, height: .tall, title: "Perezoso Plus") {
                PaywallView()
            }
        }
        .confirmationDialog(
            "Cerrar sesion?",
            isPresented: $showSignOutConfirmation,
            titleVisibility: .visible
        ) {
            Button("Cerrar sesion", role: .destructive) {
                Task { await auth.signOut() }
            }
            Button("Cancelar", role: .cancel) {}
        }
        .confirmationDialog(
            "Eliminar cuenta?",
            isPresented: $showDeleteConfirmation,
            titleVisibility: .visible
        ) {
            Button("Eliminar cuenta", role: .destructive) {
                // TODO: call delete-account edge function
            }
            Button("Cancelar", role: .cancel) {}
        } message: {
            Text("Todos tus datos se eliminaran de forma permanente. Esta accion no se puede deshacer.")
        }
    }

    // MARK: - Pro Banner

    private var proBanner: some View {
        SettingsCard {
            HStack(spacing: Spacing.md) {
                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    Text("Perezoso Plus")
                        .font(.rounded(.bold, size: 20))
                        .foregroundStyle(Color.textPrimary)
                    Text("Desbloquea todas las funciones")
                        .font(.rounded(.regular, size: 13))
                        .foregroundStyle(Color.textSecondary)
                }

                Spacer()

                Button {
                    Haptics.tap()
                    showPaywall = true
                } label: {
                    Text("Mejorar")
                        .font(.rounded(.semibold, size: 14))
                        .foregroundStyle(Color.accentForeground)
                        .padding(.horizontal, Spacing.xl)
                        .frame(height: 40)
                        .background(Color.accent, in: Capsule())
                }
            }
            .padding(Spacing.xl)
        }
    }

    // MARK: - User Card

    private var userCard: some View {
        SettingsCard {
            HStack(spacing: Spacing.md) {
                Circle()
                    .fill(Color.accentLight)
                    .frame(width: 48, height: 48)
                    .overlay(
                        Text(avatarInitial)
                            .font(.rounded(.bold, size: 20))
                            .foregroundStyle(Color.accent)
                    )

                VStack(alignment: .leading, spacing: 2) {
                    Text(auth.profile?.displayName ?? "Usuario")
                        .font(.rounded(.semibold, size: 15))
                        .foregroundStyle(Color.textPrimary)
                    if let email = auth.profile?.email {
                        Text(email)
                            .font(.rounded(.regular, size: 13))
                            .foregroundStyle(Color.textMuted)
                            .lineLimit(1)
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

    // MARK: - Preferences Group (Currency + Notifications)

    private var preferencesGroup: some View {
        SettingsCard {
            VStack(spacing: 0) {
                // Currency
                SettingsRow(
                    icon: "dollarsign.circle.fill",
                    iconColor: Color(hex: "#16A34A"),
                    iconBg: .white,
                    label: "Moneda"
                ) {
                    @Bindable var prefsBindable = prefs
                    HStack(spacing: Spacing.xs) {
                        Text(prefsBindable.preferredCurrency)
                            .font(.rounded(.regular, size: 15))
                            .foregroundStyle(Color.textSecondary)
                        Image(systemName: "chevron.right")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(Color(hex: "#C7C7CC"))
                    }
                    .overlay {
                        Picker("", selection: $prefsBindable.preferredCurrency) {
                            ForEach(["EUR", "USD", "GBP", "JPY", "CHF", "MXN"], id: \.self) { code in
                                Text(code).tag(code)
                            }
                        }
                        .labelsHidden()
                        .opacity(0.02)
                    }
                }

                Divider().padding(.leading, Spacing.lg + 40 + Spacing.md)

                // Notifications
                SettingsRow(
                    icon: "bell.fill",
                    iconColor: .white,
                    iconBg: Color(hex: "#EF4444"),
                    label: "Notificaciones"
                ) {
                    Toggle("", isOn: $notificationsEnabled)
                        .tint(Color(hex: "#34C759"))
                        .labelsHidden()
                }
            }
        }
    }

    // MARK: - Appearance Group

    private var appearanceGroup: some View {
        SettingsCard {
            SettingsRow(
                icon: "moon.fill",
                iconColor: Color(hex: "#374151"),
                iconBg: .white,
                label: "Apariencia"
            ) {
                HStack(spacing: Spacing.xs) {
                    Text(selectedAppearance.label)
                        .font(.rounded(.regular, size: 15))
                        .foregroundStyle(Color.textSecondary)
                    Image(systemName: "chevron.right")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Color(hex: "#C7C7CC"))
                }
                .overlay {
                    Picker("", selection: $selectedAppearance) {
                        ForEach(AppearanceMode.allCases) { mode in
                            Text(mode.label).tag(mode)
                        }
                    }
                    .labelsHidden()
                    .opacity(0.02)
                }
            }
        }
        .onChange(of: selectedAppearance) { _, newValue in
            applyAppearance(newValue)
        }
    }

    // MARK: - Support Group

    private var supportGroup: some View {
        SettingsCard {
            VStack(spacing: 0) {
                SettingsRow(
                    icon: "star.fill",
                    iconColor: Color(hex: "#F59E0B"),
                    iconBg: .white,
                    label: "Dejar una resena"
                ) {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Color(hex: "#C7C7CC"))
                }

                Divider().padding(.leading, Spacing.lg + 40 + Spacing.md)

                SettingsRow(
                    icon: "square.and.arrow.up",
                    iconColor: Color.textPrimary,
                    iconBg: .white,
                    label: "Compartir con un amigo"
                ) {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Color(hex: "#C7C7CC"))
                }
            }
        }
    }

    // MARK: - Contact Group

    private var contactGroup: some View {
        SettingsCard {
            VStack(spacing: 0) {
                SettingsRow(
                    icon: "at",
                    iconColor: Color.textPrimary,
                    iconBg: .white,
                    label: "@carlosprnt"
                ) {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Color(hex: "#C7C7CC"))
                }

                Divider().padding(.leading, Spacing.lg + 40 + Spacing.md)

                SettingsRow(
                    icon: "envelope.fill",
                    iconColor: Color.textPrimary,
                    iconBg: .white,
                    label: "hello@carlospariente.com"
                ) {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Color(hex: "#C7C7CC"))
                }
            }
        }
    }

    // MARK: - Danger Group

    private var dangerGroup: some View {
        SettingsCard {
            VStack(spacing: 0) {
                Button {
                    Haptics.tap()
                    showSignOutConfirmation = true
                } label: {
                    SettingsRow(
                        icon: "rectangle.portrait.and.arrow.right",
                        iconColor: Color.textPrimary,
                        iconBg: .white,
                        label: "Cerrar sesion"
                    ) {
                        Image(systemName: "chevron.right")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(Color(hex: "#C7C7CC"))
                    }
                }

                Divider().padding(.leading, Spacing.lg + 40 + Spacing.md)

                Button {
                    Haptics.notification(.warning)
                    showDeleteConfirmation = true
                } label: {
                    SettingsRow(
                        icon: "trash.fill",
                        iconColor: Color(hex: "#DC2626"),
                        iconBg: Color(hex: "#FEE2E2"),
                        label: "Eliminar cuenta",
                        labelColor: Color(hex: "#DC2626")
                    ) {
                        EmptyView()
                    }
                }
            }
        }
    }

    // MARK: - Version Footer

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

// MARK: - Settings Card Container

/// White card wrapper matching web's Group: bg-[#F2F2F7] dark:bg-[#1C1C1E] rounded-2xl
private struct SettingsCard<Content: View>: View {
    @ViewBuilder let content: () -> Content

    var body: some View {
        content()
            .background(Color.surface)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(Color.borderLight, lineWidth: 1)
            )
    }
}

// MARK: - Settings Row with IconTile

/// Row matching web: flex items-center gap-3 px-4 py-4,
/// IconTile (40x40, rounded-[10px]) + label + right content.
private struct SettingsRow<Right: View>: View {
    let icon: String
    let iconColor: Color
    let iconBg: Color
    let label: String
    var labelColor: Color = .textPrimary
    @ViewBuilder let right: () -> Right

    var body: some View {
        HStack(spacing: Spacing.md) {
            // IconTile: 40x40, rounded-10
            Image(systemName: icon)
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(iconColor)
                .frame(width: 40, height: 40)
                .background(iconBg)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .stroke(Color.borderLight, lineWidth: 0.5)
                )

            Text(label)
                .font(.bodyMedium)
                .foregroundStyle(labelColor)

            Spacer()

            right()
        }
        .padding(.horizontal, Spacing.lg)
        .padding(.vertical, Spacing.lg)
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

#Preview {
    SettingsView()
        .environment(AuthStore.preview())
        .environment(SubscriptionsStore.preview())
        .environment(PreferencesStore())
}
