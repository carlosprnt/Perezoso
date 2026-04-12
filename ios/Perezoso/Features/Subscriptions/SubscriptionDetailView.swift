import SwiftUI

/// Detail sheet for a single subscription.
///
/// Shows the subscription's logo, name, amount, billing period,
/// next billing date, category, status badge, and notes.
/// Uses the card color preset as background for the hero section.
struct SubscriptionDetailView: View {
    @Environment(SubscriptionsStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    let subscription: Subscription

    @State private var showEditSheet = false
    @State private var showDeleteConfirmation = false
    @State private var isDeleting = false

    private var preset: CardColorPreset { subscription.colorPreset }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Spacing.lg) {
                    // ── Colored hero header ───────────────────
                    heroCard

                    // ── Details list ──────────────────────────
                    Card {
                        VStack(spacing: 0) {
                            DetailRow(
                                icon: "calendar",
                                label: "Próxima facturación",
                                value: formattedNextBillingDate
                            )
                            Divider().padding(.leading, Spacing.xxl + Spacing.md)

                            DetailRow(
                                icon: subscription.category.symbolName,
                                label: "Categoría",
                                value: subscription.category.localizedName
                            )
                            Divider().padding(.leading, Spacing.xxl + Spacing.md)

                            DetailRow(
                                icon: "arrow.triangle.2.circlepath",
                                label: "Periodo",
                                value: subscription.billingPeriod.localizedName
                            )

                            if let notes = subscription.notes, !notes.isEmpty {
                                Divider().padding(.leading, Spacing.xxl + Spacing.md)
                                DetailRow(
                                    icon: "note.text",
                                    label: "Notas",
                                    value: notes
                                )
                            }
                        }
                    }

                    // ── Monthly equivalent ────────────────────
                    if subscription.billingPeriod != .monthly {
                        Card {
                            HStack {
                                Text("Equivalente mensual")
                                    .font(.bodyMedium)
                                    .foregroundStyle(Color.textSecondary)
                                Spacer()
                                Text(CurrencyFormat.string(for: subscription.monthlyEquivalent,
                                                           currency: subscription.currency))
                                    .font(.bodyMedium)
                                    .foregroundStyle(Color.textPrimary)
                            }
                            .padding(Spacing.lg)
                        }
                    }

                    // ── Actions ───────────────────────────────
                    VStack(spacing: Spacing.sm) {
                        SecondaryButton(title: "Editar suscripción") {
                            Haptics.tap(.light)
                            showEditSheet = true
                        }

                        DangerButton(title: "Eliminar suscripción", isLoading: isDeleting) {
                            Haptics.notification(.warning)
                            showDeleteConfirmation = true
                        }
                    }
                }
                .padding(.horizontal, Spacing.lg)
                .padding(.bottom, Spacing.xxxl)
            }
            .background(Color.background)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 22))
                            .foregroundStyle(Color.textMuted)
                    }
                }
            }
        }
        .sheet(isPresented: $showEditSheet) {
            SubscriptionFormView(mode: .edit(subscription))
                .presentationDragIndicator(.visible)
                .presentationCornerRadius(Radius.sheet)
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

    // MARK: - Hero Card

    private var heroCard: some View {
        VStack(spacing: Spacing.lg) {
            LogoAvatar(
                name: subscription.name,
                logoURL: URL(string: subscription.logoUrl ?? ""),
                size: 72
            )

            VStack(spacing: Spacing.xs) {
                Text(subscription.name)
                    .font(.rounded(.bold, size: 22))
                    .foregroundStyle(Color(hex: preset.text))

                StatusBadge(status: subscription.status)
            }

            VStack(spacing: Spacing.xxs) {
                Text(CurrencyFormat.string(for: subscription.amount,
                                           currency: subscription.currency))
                    .font(.system(size: 40, weight: .bold, design: .serif))
                    .foregroundStyle(Color(hex: preset.text))

                Text(billingPeriodLabel)
                    .font(.bodyRegular)
                    .foregroundStyle(Color(hex: preset.subtitle))
            }

            // Progress bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(
                            preset.isDark
                                ? Color.white.opacity(0.15)
                                : Color.black.opacity(0.08)
                        )
                        .frame(height: 4)
                    Capsule()
                        .fill(
                            preset.isDark
                                ? Color.white.opacity(0.70)
                                : Color.black.opacity(0.35)
                        )
                        .frame(width: geo.size.width * subscription.billingProgress, height: 4)
                }
            }
            .frame(height: 4)
        }
        .padding(Spacing.xxl)
        .frame(maxWidth: .infinity)
        .background(Color(hex: preset.background))
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(
                    preset.id == "white" ? Color(hex: preset.border) : Color.clear,
                    lineWidth: 1
                )
        )
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
            dismiss()
        } catch {
            Haptics.notification(.error)
        }
        isDeleting = false
    }
}

// MARK: - Status Badge

private struct StatusBadge: View {
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

// MARK: - Detail Row

private struct DetailRow: View {
    let icon: String
    let label: String
    let value: String

    var body: some View {
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
                .multilineTextAlignment(.trailing)
        }
        .padding(Spacing.lg)
    }
}

// MARK: - Preview

#Preview {
    SubscriptionDetailView(subscription: .mock)
        .environment(SubscriptionsStore.preview())
}
