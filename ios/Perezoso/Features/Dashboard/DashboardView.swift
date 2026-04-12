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
            VStack(alignment: .leading, spacing: 2) {
                Text("Hola, \(auth.profile?.firstName ?? "").")
                    .font(.title)
                    .foregroundStyle(Color.textPrimary)
            }

            Spacer()

            // Calendar button
            Button {
                Haptics.tap(.light)
                onCalendarTap?()
            } label: {
                Image(systemName: "calendar")
                    .font(.system(size: 18, weight: .medium))
                    .foregroundStyle(Color.textMuted)
                    .frame(width: 40, height: 40)
                    .background(Color.surface)
                    .clipShape(Circle())
                    .overlay(Circle().stroke(Color.borderLight, lineWidth: 1))
            }

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

    // MARK: - Spending Hero

    private var spendingHero: some View {
        Card(.elevated) {
            VStack(alignment: .leading, spacing: Spacing.md) {
                Text("Este mes gastas")
                    .font(.bodyRegular)
                    .foregroundStyle(Color.textSecondary)

                Text(CurrencyFormat.string(for: store.monthlyTotal, currency: "EUR"))
                    .font(.system(size: 50, weight: .bold, design: .serif))
                    .foregroundStyle(Color.textPrimary)
                    .contentTransition(.numericText())

                Text("Eso al año es \(CurrencyFormat.string(for: store.yearlyTotal, currency: "EUR")).")
                    .font(.largeStatement)
                    .foregroundStyle(Color.textPrimary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(Spacing.xl)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    // MARK: - Quick Stats

    private var statsRow: some View {
        HStack(spacing: Spacing.md) {
            statCard(
                value: "\(store.activeSubscriptions.count)",
                label: "Activas",
                icon: "rectangle.stack.fill"
            )
            statCard(
                value: "\(store.renewingSoon.count)",
                label: "Por renovar",
                icon: "clock.fill"
            )
        }
    }

    private func statCard(value: String, label: String, icon: String) -> some View {
        Card {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack {
                    Image(systemName: icon)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(Color.accent)
                    Spacer()
                }
                Text(value)
                    .font(.rounded(.bold, size: 28))
                    .foregroundStyle(Color.textPrimary)
                Text(label)
                    .font(.caption)
                    .foregroundStyle(Color.textMuted)
            }
            .padding(Spacing.lg)
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
