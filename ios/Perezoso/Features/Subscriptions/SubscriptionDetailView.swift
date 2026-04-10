import SwiftUI

/// Detail sheet for a single subscription.
///
/// Shows the subscription's logo, name, amount, billing period,
/// next billing date, category, status badge, and notes.
/// An "Editar" toolbar button opens `SubscriptionFormView` in edit mode.
struct SubscriptionDetailView: View {
    @Environment(SubscriptionsStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    let subscription: Subscription

    @State private var showEditSheet = false
    @State private var showDeleteConfirmation = false
    @State private var isDeleting = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Spacing.lg) {
                    // ── Hero header ────────────────────────────
                    VStack(spacing: Spacing.md) {
                        LogoAvatar(
                            name: subscription.name,
                            logoURL: URL(string: subscription.logoUrl ?? ""),
                            size: 72
                        )

                        Text(subscription.name)
                            .font(.title)
                            .foregroundStyle(.textPrimary)

                        StatusBadge(status: subscription.status)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, Spacing.xl)

                    // ── Amount card ────────────────────────────
                    Card(.elevated) {
                        VStack(spacing: Spacing.sm) {
                            Text(CurrencyFormat.string(for: subscription.amount,
                                                       currency: subscription.currency))
                                .font(.heroNumber)
                                .foregroundStyle(.textPrimary)

                            Text(billingPeriodLabel)
                                .font(.bodyRegular)
                                .foregroundStyle(.textSecondary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(Spacing.xl)
                    }

                    // ── Details list ───────────────────────────
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
                                value: subscription.billingPeriod.rawValue.capitalized
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

                    // ── Monthly equivalent (if yearly/quarterly) ──
                    if subscription.billingPeriod != .monthly {
                        Card {
                            HStack {
                                Text("Equivalente mensual")
                                    .font(.bodyMedium)
                                    .foregroundStyle(.textSecondary)
                                Spacer()
                                Text(CurrencyFormat.string(for: subscription.monthlyEquivalent,
                                                           currency: subscription.currency))
                                    .font(.bodyMedium)
                                    .foregroundStyle(.textPrimary)
                            }
                            .padding(Spacing.lg)
                        }
                    }

                    // ── Danger zone ────────────────────────────
                    Button(role: .destructive) {
                        Haptics.notification(.warning)
                        showDeleteConfirmation = true
                    } label: {
                        Label("Eliminar suscripción", systemImage: "trash")
                            .font(.bodyMedium)
                            .frame(maxWidth: .infinity)
                            .frame(height: 48)
                    }
                    .tint(.danger)
                    .buttonStyle(.bordered)
                    .clipShape(.capsule)
                }
                .padding(.horizontal, Spacing.lg)
                .padding(.bottom, Spacing.xxxl)
            }
            .background(Color.background)
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button("Editar") {
                        Haptics.tap(.light)
                        showEditSheet = true
                    }
                    .font(.bodyMedium)
                    .tint(.accent)
                }
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cerrar") {
                        dismiss()
                    }
                    .font(.bodyMedium)
                    .tint(.textSecondary)
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
        case .active:    .success
        case .paused:    .warning
        case .cancelled: .danger
        case .trial:     .accent
        }
    }

    private var background: Color {
        switch status {
        case .active:    Color(light: "#D1FAE5", dark: "#022C22")
        case .paused:    Color(light: "#FEF3C7", dark: "#2D1F00")
        case .cancelled: Color(light: "#FEE2E2", dark: "#2D0000")
        case .trial:     .accentLight
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
                .foregroundStyle(.textMuted)
                .frame(width: Spacing.xl)

            Text(label)
                .font(.bodyRegular)
                .foregroundStyle(.textSecondary)

            Spacer()

            Text(value)
                .font(.bodyMedium)
                .foregroundStyle(.textPrimary)
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
