import SwiftUI

/// Custom full-screen subscription detail overlay matching the web's
/// SubscriptionDetailOverlay.tsx — NOT a native sheet.
///
/// Features:
/// - Full-screen slide-up overlay with dark backdrop
/// - Brand-tinted gradient header
/// - Floating close button with backdrop blur
/// - Logo hero with status badge
/// - Cost display (monthly + annual)
/// - Billing info card with progress bar
/// - Inline edit mode via custom bottom sheet
struct SubscriptionDetailOverlay: View {
    @Environment(SubscriptionsStore.self) private var store
    let subscription: Subscription
    @Binding var isPresented: Bool

    @State private var showEditSheet = false
    @State private var showDeleteConfirmation = false
    @State private var isDeleting = false

    private var preset: CardColorPreset { subscription.colorPreset }

    var body: some View {
        FullScreenOverlay(
            isPresented: $isPresented,
            tintColor: Color(hex: preset.background)
        ) {
            VStack(spacing: Spacing.xl) {
                // ── Hero section ──────────────────────────
                heroSection

                // ── Cost display ──────────────────────────
                costSection

                // ── Billing info ──────────────────────────
                billingSection

                // ── Category & details ────────────────────
                detailsSection

                // ── Notes ─────────────────────────────────
                if let notes = subscription.notes, !notes.isEmpty {
                    notesSection(notes)
                }

                // ── Actions ───────────────────────────────
                actionsSection
            }
            .padding(.horizontal, Spacing.xl)
            .padding(.top, Spacing.lg)
            .padding(.bottom, Spacing.xxxl)
        }
        .overlay {
            // Edit sheet as custom bottom sheet
            CustomBottomSheet(isPresented: $showEditSheet, height: .full, title: "Editar suscripción") {
                SubscriptionFormView(mode: .edit(subscription))
                    .environment(store)
            }
        }
        .confirmationDialog(
            "¿Eliminar \(subscription.name)?",
            isPresented: $showDeleteConfirmation,
            titleVisibility: .visible
        ) {
            Button("Eliminar", role: .destructive) {
                Task { await deleteSubscription() }
            }
            Button("Cancelar", role: .cancel) {}
        } message: {
            Text("Esta acción no se puede deshacer.")
        }
    }

    // MARK: - Hero

    private var heroSection: some View {
        VStack(spacing: Spacing.md) {
            LogoAvatar(
                name: subscription.name,
                logoURL: URL(string: subscription.logoUrl ?? ""),
                size: 72
            )

            Text(subscription.name)
                .font(.rounded(.bold, size: 22))
                .foregroundStyle(Color.textPrimary)

            StatusBadge(status: subscription.status)
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Cost

    private var costSection: some View {
        VStack(spacing: Spacing.xs) {
            Text(CurrencyFormat.string(for: subscription.amount, currency: subscription.currency))
                .font(.system(size: 44, weight: .bold, design: .serif))
                .foregroundStyle(Color.textPrimary)

            Text(billingPeriodLabel)
                .font(.bodyRegular)
                .foregroundStyle(Color.textSecondary)

            if subscription.billingPeriod != .monthly {
                Text("≈ \(CurrencyFormat.string(for: subscription.monthlyEquivalent, currency: subscription.currency))/mes")
                    .font(.caption)
                    .foregroundStyle(Color.textMuted)
            }
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Billing Info

    private var billingSection: some View {
        Card {
            VStack(spacing: Spacing.lg) {
                // Next billing
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Próxima facturación")
                            .font(.caption)
                            .foregroundStyle(Color.textMuted)
                        Text(formattedNextBillingDate)
                            .font(.bodyMedium)
                            .foregroundStyle(Color.textPrimary)
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("Faltan")
                            .font(.caption)
                            .foregroundStyle(Color.textMuted)
                        Text(daysLabel)
                            .font(.rounded(.bold, size: 17))
                            .foregroundStyle(Color.accent)
                    }
                }

                // Progress bar
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Capsule()
                            .fill(Color.accentLight)
                            .frame(height: 6)
                        Capsule()
                            .fill(Color.accent)
                            .frame(width: geo.size.width * subscription.billingProgress, height: 6)
                    }
                }
                .frame(height: 6)

                // Billing cycle
                HStack {
                    Text("Ciclo")
                        .font(.caption)
                        .foregroundStyle(Color.textMuted)
                    Spacer()
                    Text(subscription.billingPeriod.localizedName)
                        .font(.bodyMedium)
                        .foregroundStyle(Color.textPrimary)
                }

                // Amount
                HStack {
                    Text("Importe")
                        .font(.caption)
                        .foregroundStyle(Color.textMuted)
                    Spacer()
                    Text(CurrencyFormat.string(for: subscription.amount, currency: subscription.currency))
                        .font(.bodyMedium)
                        .foregroundStyle(Color.textPrimary)
                }
            }
            .padding(Spacing.xl)
        }
    }

    // MARK: - Details

    private var detailsSection: some View {
        Card {
            VStack(spacing: 0) {
                detailRow(
                    icon: subscription.category.symbolName,
                    label: "Categoría",
                    value: subscription.category.localizedName
                )
                Divider().padding(.leading, Spacing.xxl + Spacing.lg)
                detailRow(
                    icon: "arrow.triangle.2.circlepath",
                    label: "Periodo",
                    value: subscription.billingPeriod.localizedName
                )
            }
        }
    }

    private func detailRow(icon: String, label: String, value: String) -> some View {
        HStack(spacing: Spacing.md) {
            Image(systemName: icon)
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(Color.textMuted)
                .frame(width: Spacing.xl)
            Text(label)
                .font(.bodyRegular)
                .foregroundStyle(Color.textSecondary)
            Spacer()
            Text(value)
                .font(.bodyMedium)
                .foregroundStyle(Color.textPrimary)
        }
        .padding(Spacing.lg)
    }

    // MARK: - Notes

    private func notesSection(_ notes: String) -> some View {
        Card {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                Text("Notas")
                    .font(.caption)
                    .foregroundStyle(Color.textMuted)
                Text(notes)
                    .font(.bodyRegular)
                    .foregroundStyle(Color.textPrimary)
            }
            .padding(Spacing.lg)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    // MARK: - Actions

    private var actionsSection: some View {
        VStack(spacing: Spacing.sm) {
            PrimaryButton(title: "Editar suscripción") {
                Haptics.tap(.light)
                showEditSheet = true
            }
            DangerButton(title: "Eliminar suscripción", isLoading: isDeleting) {
                Haptics.notification(.warning)
                showDeleteConfirmation = true
            }
        }
    }

    // MARK: - Helpers

    private var billingPeriodLabel: String {
        switch subscription.billingPeriod {
        case .monthly:   "al mes"
        case .yearly:    "al año"
        case .weekly:    "a la semana"
        case .quarterly: "cada trimestre"
        }
    }

    private var daysLabel: String {
        let d = subscription.daysUntilBilling
        if d == 0 { return "Hoy" }
        if d == 1 { return "1 día" }
        return "\(d) días"
    }

    private var formattedNextBillingDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .long
        formatter.timeStyle = .none
        formatter.locale = Locale(identifier: "es_ES")
        return formatter.string(from: subscription.nextBillingDate)
    }

    private func deleteSubscription() async {
        isDeleting = true
        do {
            try await store.delete(id: subscription.id)
            Haptics.notification(.success)
            isPresented = false
        } catch {
            Haptics.notification(.error)
        }
        isDeleting = false
    }
}

// MARK: - Status Badge

struct StatusBadge: View {
    let status: Subscription.Status

    var body: some View {
        Text(label)
            .font(.micro)
            .foregroundStyle(foreground)
            .padding(.horizontal, Spacing.sm)
            .padding(.vertical, Spacing.xxs)
            .background(background, in: Capsule())
    }

    private var label: String {
        switch status {
        case .active:    "Activa"
        case .paused:    "Pausada"
        case .cancelled: "Cancelada"
        case .trial:     "Prueba"
        }
    }

    private var foreground: Color {
        switch status {
        case .active:    Color.success
        case .paused:    Color.warning
        case .cancelled: Color.danger
        case .trial:     Color.accent
        }
    }

    private var background: Color {
        switch status {
        case .active:    Color(light: "#D1FAE5", dark: "#022C22")
        case .paused:    Color(light: "#FEF3C7", dark: "#2D1F00")
        case .cancelled: Color(light: "#FEE2E2", dark: "#2D0000")
        case .trial:     Color.accentLight
        }
    }
}

#Preview {
    SubscriptionDetailOverlay(
        subscription: .mock,
        isPresented: .constant(true)
    )
    .environment(SubscriptionsStore.preview())
}
