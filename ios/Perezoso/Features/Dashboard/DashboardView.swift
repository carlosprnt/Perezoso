import SwiftUI

/// Main dashboard — the first screen after login.
///
/// Mirrors the web app's `/dashboard`: greeting header with avatar,
/// spending summary hero card, upcoming renewals, and category
/// breakdown. Uses the floating nav so no TabView chrome.
struct DashboardView: View {
    @Environment(AuthStore.self) private var auth
    @Environment(SubscriptionsStore.self) private var store

    var onCalendarTap: (() -> Void)?
    var onSettingsTap: (() -> Void)?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.xl) {
                // ── Header: greeting + actions ───────────────
                headerRow

                // ── Spending hero card ───────────────────────
                spendingHero

                // ── Quick stats row ──────────────────────────
                statsRow

                // ── Upcoming renewals ────────────────────────
                if !store.renewingSoon.isEmpty {
                    upcomingSection
                }

                // ── Category breakdown ───────────────────────
                if !store.subscriptions.isEmpty {
                    categoryBreakdown
                }
            }
            .padding(.horizontal, Spacing.xl)
            .padding(.top, Spacing.md)
            .padding(.bottom, 120) // clear the floating nav
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

    // MARK: - Header

    private var headerRow: some View {
        HStack(alignment: .center) {
            Text("Hola, \(auth.profile?.firstName ?? "").")
                .font(.rounded(.bold, size: 17))
                .foregroundStyle(Color.textPrimary)

            Spacer()

            // Avatar / Settings button
            Button {
                Haptics.tap(.light)
                onSettingsTap?()
            } label: {
                Circle()
                    .fill(Color.accentLight)
                    .frame(width: 40, height: 40)
                    .overlay(
                        Text(auth.profile?.firstName.prefix(1).uppercased() ?? "P")
                            .font(.rounded(.bold, size: 16))
                            .foregroundStyle(Color.accent)
                    )
            }
        }
    }

    // MARK: - Spending Hero (narrative prose — matches web DashboardSummaryHero)

    private var spendingHero: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            // "Este mes gastas" + big monthly amount
            buildNarrativeText()
                .fixedSize(horizontal: false, vertical: true)

            // Supporting line: active subs count
            let total = store.activeSubscriptions.count
            Group {
                Text("Tienes ")
                    .foregroundStyle(Color.textSecondary) +
                Text("\(total)")
                    .foregroundStyle(Color.textPrimary) +
                Text(" \(total == 1 ? "suscripción activa" : "suscripciones activas").")
                    .foregroundStyle(Color.textSecondary)
            }
            .font(.rounded(.bold, size: 18))
        }
        .padding(.bottom, Spacing.sm)
    }

    @ViewBuilder
    private func buildNarrativeText() -> some View {
        let monthly = CurrencyFormat.string(for: store.monthlyTotal, currency: "EUR")
        let annual = CurrencyFormat.string(for: store.yearlyTotal, currency: "EUR")

        VStack(alignment: .leading, spacing: 0) {
            // Line 1: "Este mes gastas"
            Text("Este mes gastas")
                .font(.rounded(.heavy, size: 25))
                .foregroundStyle(Color.textSecondary)

            // Line 2: big monthly amount
            Text(monthly)
                .font(.system(size: 50, weight: .bold, design: .rounded))
                .foregroundStyle(Color.textPrimary)
                .contentTransition(.numericText())

            // Line 3: "Eso al año es"
            Text("Eso al año es")
                .font(.rounded(.heavy, size: 25))
                .foregroundStyle(Color.textSecondary)
                .padding(.top, 2)

            // Line 4: big annual amount
            Text(annual)
                .font(.system(size: 50, weight: .bold, design: .rounded))
                .foregroundStyle(Color.textPrimary)
                .contentTransition(.numericText())
        }
    }

    // MARK: - Upcoming Renewals

    private var upcomingSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack {
                Text("Próximas renovaciones")
                    .font(.headline)
                    .foregroundStyle(Color.textPrimary)
                Spacer()
                Text("\(store.renewingSoon.count)")
                    .font(.caption)
                    .foregroundStyle(Color.textMuted)
                    .padding(.horizontal, Spacing.sm)
                    .padding(.vertical, 2)
                    .background(Color.accentLight, in: Capsule())
            }

            ForEach(store.renewingSoon) { sub in
                Card {
                    HStack(spacing: Spacing.md) {
                        LogoAvatar(name: sub.name, logoURL: URL(string: sub.logoUrl ?? ""), size: 40)

                        VStack(alignment: .leading, spacing: 2) {
                            Text(sub.name)
                                .font(.bodyMedium)
                                .foregroundStyle(Color.textPrimary)
                            Text(renewalLabel(for: sub))
                                .font(.caption)
                                .foregroundStyle(Color.textMuted)
                        }

                        Spacer()

                        Text(CurrencyFormat.string(for: sub.amount, currency: sub.currency))
                            .font(.bodyMedium)
                            .foregroundStyle(Color.textPrimary)
                    }
                    .padding(Spacing.lg)
                }
            }
        }
    }

    // MARK: - Category Breakdown

    private var categoryBreakdown: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Por categoría")
                .font(.headline)
                .foregroundStyle(Color.textPrimary)

            Card {
                VStack(spacing: 0) {
                    ForEach(topCategories, id: \.category) { item in
                        HStack(spacing: Spacing.md) {
                            RoundedRectangle(cornerRadius: 4, style: .continuous)
                                .fill(item.category.categoryColor)
                                .frame(width: 4, height: 28)

                            Image(systemName: item.category.symbolName)
                                .font(.system(size: 14))
                                .foregroundStyle(Color.textMuted)
                                .frame(width: 20)

                            Text(item.category.localizedName)
                                .font(.bodyMedium)
                                .foregroundStyle(Color.textPrimary)

                            Spacer()

                            Text(CurrencyFormat.string(for: item.total, currency: "EUR"))
                                .font(.bodyMedium)
                                .foregroundStyle(Color.textPrimary)

                            Text("\(item.count)")
                                .font(.micro)
                                .foregroundStyle(Color.textMuted)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.accentLight, in: Capsule())
                        }
                        .padding(.horizontal, Spacing.lg)
                        .padding(.vertical, Spacing.md)

                        if item.category != topCategories.last?.category {
                            Divider().padding(.leading, Spacing.lg)
                        }
                    }
                }
            }
        }
    }

    // MARK: - Helpers

    private struct CategorySummary {
        let category: Subscription.Category
        let count: Int
        let total: Decimal
    }

    private var topCategories: [CategorySummary] {
        let grouped = Dictionary(grouping: store.activeSubscriptions, by: \.category)
        return grouped.map { cat, subs in
            CategorySummary(
                category: cat,
                count: subs.count,
                total: subs.reduce(0) { $0 + $1.monthlyEquivalent }
            )
        }
        .sorted { $0.total > $1.total }
        .prefix(6)
        .map { $0 }
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
