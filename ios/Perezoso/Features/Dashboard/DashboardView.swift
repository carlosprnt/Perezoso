import SwiftUI

/// Main dashboard — the first screen after login.
///
/// Mirrors the web app's `/dashboard`: greeting, spending summary
/// hero, upcoming renewals, and quick-action buttons.
struct DashboardView: View {
    @Environment(AuthStore.self) private var auth
    @Environment(SubscriptionsStore.self) private var store

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.xl) {
                    // ── Greeting ──────────────────────────────
                    HStack {
                        Text("Hola, \(auth.profile?.firstName ?? "").")
                            .font(.title)
                            .foregroundStyle(.textPrimary)
                        Spacer()
                        // avatar placeholder
                        Circle()
                            .fill(Color.surfaceSecondary)
                            .frame(width: 40, height: 40)
                            .overlay(
                                Text(auth.profile?.firstName.prefix(1).uppercased() ?? "P")
                                    .font(.inter(.bold, size: 16))
                                    .foregroundStyle(.textMuted)
                            )
                    }

                    // ── Spending summary hero ─────────────────
                    Card(.elevated) {
                        VStack(alignment: .leading, spacing: Spacing.sm) {
                            Text("Este mes gastas")
                                .font(.bodyRegular)
                                .foregroundStyle(.textSecondary)
                            Text(CurrencyFormat.string(for: store.monthlyTotal, currency: "EUR"))
                                .font(.heroNumber)
                                .foregroundStyle(.textPrimary)
                            Text("Eso al año es \(CurrencyFormat.string(for: store.yearlyTotal, currency: "EUR")).")
                                .font(.bodyRegular)
                                .foregroundStyle(.textSecondary)

                            Divider().padding(.vertical, Spacing.xs)

                            HStack {
                                Label("**\(store.activeSubscriptions.count)** suscripciones activas",
                                      systemImage: "rectangle.stack.fill")
                                    .font(.caption)
                                    .foregroundStyle(.accent)
                            }
                        }
                        .padding(Spacing.xl)
                    }

                    // ── Upcoming renewals ─────────────────────
                    if !store.renewingSoon.isEmpty {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            Text("Próximas renovaciones")
                                .font(.headline)
                                .foregroundStyle(.textPrimary)

                            ForEach(store.renewingSoon) { sub in
                                HStack(spacing: Spacing.md) {
                                    LogoAvatar(name: sub.name, logoURL: URL(string: sub.logoUrl ?? ""), size: 40)

                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(sub.name)
                                            .font(.bodyMedium)
                                            .foregroundStyle(.textPrimary)
                                        Text(renewalLabel(for: sub))
                                            .font(.caption)
                                            .foregroundStyle(.textMuted)
                                    }

                                    Spacer()

                                    Text(CurrencyFormat.string(for: sub.amount, currency: sub.currency))
                                        .font(.bodyMedium)
                                        .foregroundStyle(.textPrimary)
                                }
                                .padding(Spacing.md)
                                .background(Color.surface)
                                .clipShape(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous))
                                .overlay(
                                    RoundedRectangle(cornerRadius: Radius.lg, style: .continuous)
                                        .stroke(Color.borderLight, lineWidth: 1)
                                )
                            }
                        }
                    }
                }
                .padding(.horizontal, Spacing.lg)
                .padding(.top, Spacing.md)
                .padding(.bottom, 100) // clear the tab bar
            }
            .background(Color.background)
            .refreshable {
                await store.fetch()
            }
            .task {
                if store.subscriptions.isEmpty {
                    await store.fetch()
                }
            }
        }
    }

    private func renewalLabel(for sub: Subscription) -> String {
        let days = sub.daysUntilBilling
        if days == 0 { return "Se renueva hoy" }
        if days == 1 { return "Se renueva mañana" }
        return "Se renueva en \(days) días"
    }
}

#Preview {
    DashboardView()
        .environment(AuthStore.preview())
        .environment(SubscriptionsStore.preview())
}
