import SwiftUI

/// Main dashboard matching the web app's `/dashboard` exactly.
///
/// Sections (in order):
/// 1. Header: greeting + avatar
/// 2. Spending hero: narrative prose (Este mes gastas + big amount + Eso al ano es + big amount)
/// 3. Active subs count
/// 4. Insight cards: 3 horizontal cards (highest cost, top category, shared plans)
/// 5. Upcoming renewals: max 3 upcoming
/// 6. Categories bar chart: segmented horizontal bar + legend
/// 7. Top expensive: horizontal scroll cards
struct DashboardView: View {
    @Environment(AuthStore.self) private var auth
    @Environment(SubscriptionsStore.self) private var store

    var onCalendarTap: (() -> Void)?
    var onSettingsTap: (() -> Void)?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.xl) {
                // 1. Header
                headerRow

                // 2. Spending hero
                spendingHero

                // 3. Insight cards
                if !store.activeSubscriptions.isEmpty {
                    insightCards
                }

                // 4. Upcoming renewals
                if !store.upcomingRenewals.isEmpty {
                    upcomingSection
                }

                // 5. Categories bar chart
                if !store.activeSubscriptions.isEmpty {
                    topCategoriesSection
                }

                // 6. Top expensive horizontal scroll
                if store.activeSubscriptions.count > 1 {
                    topExpensiveSection
                }
            }
            .padding(.horizontal, Spacing.xl)
            .padding(.top, Spacing.md)
            .padding(.bottom, 120)
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

    // MARK: - Spending Hero (narrative prose)

    private var spendingHero: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            buildNarrativeText()
                .fixedSize(horizontal: false, vertical: true)

            let total = store.activeSubscriptions.count
            Group {
                Text("Tienes ")
                    .foregroundStyle(Color.textSecondary) +
                Text("\(total)")
                    .foregroundStyle(Color.textPrimary) +
                Text(" \(total == 1 ? "suscripcion activa" : "suscripciones activas").")
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
            Text("Este mes gastas")
                .font(.rounded(.heavy, size: 25))
                .foregroundStyle(Color.textSecondary)

            Text(monthly)
                .font(.system(size: 50, weight: .bold, design: .rounded))
                .foregroundStyle(Color.textPrimary)
                .contentTransition(.numericText())

            Text("Eso al ano es")
                .font(.rounded(.heavy, size: 25))
                .foregroundStyle(Color.textSecondary)
                .padding(.top, 2)

            Text(annual)
                .font(.system(size: 50, weight: .bold, design: .rounded))
                .foregroundStyle(Color.textPrimary)
                .contentTransition(.numericText())
        }
    }

    // MARK: - Insight Cards (3 cards matching web's Insights.tsx)

    private var insightCards: some View {
        VStack(spacing: Spacing.sm) {
            // Card 1: Highest cost subscription
            if let expensive = store.activeSubscriptions.sorted(by: { $0.monthlyEquivalent > $1.monthlyEquivalent }).first {
                InsightCardRow(
                    iconName: "arrow.up.right",
                    iconBg: Color.surfaceSecondary,
                    label: "Mayor gasto",
                    value: expensive.name,
                    rightTop: "\(CurrencyFormat.string(for: expensive.monthlyEquivalent, currency: expensive.currency))/mes",
                    rightBottom: expensive.category.localizedName
                )
            }

            // Card 2: Top category
            if let topCat = topCategories.first {
                InsightCardRow(
                    iconName: topCat.category.symbolName,
                    iconBg: topCat.category.categoryColor,
                    label: "Categoria principal",
                    value: topCat.category.localizedName,
                    rightTop: "\(CurrencyFormat.string(for: topCat.total, currency: "EUR"))/mes",
                    rightBottom: "\(topCat.count) suscripciones"
                )
            }

            // Card 3: Shared plans
            let sharedSubs = store.activeSubscriptions.filter { ($0.sharedWith ?? 0) > 0 }
            if !sharedSubs.isEmpty {
                let sharedSavings = sharedSubs.reduce(Decimal.zero) { acc, sub in
                    let full = sub.monthlyEquivalent
                    let shared = (sub.sharedWith ?? 1) > 1
                        ? full / Decimal(sub.sharedWith ?? 1)
                        : full
                    return acc + (full - shared)
                }
                InsightCardRow(
                    iconName: "person.2.fill",
                    iconBg: Color.surfaceSecondary,
                    label: "Planes compartidos",
                    value: "\(sharedSubs.count) planes",
                    rightTop: CurrencyFormat.string(for: sharedSavings, currency: "EUR"),
                    rightBottom: "/mes ahorro"
                )
            }
        }
    }

    // MARK: - Upcoming Renewals

    private var upcomingSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack {
                Text("Proximas renovaciones")
                    .font(.headline)
                    .foregroundStyle(Color.textPrimary)
                Spacer()
                Text("\(store.upcomingRenewals.prefix(3).count)")
                    .font(.caption)
                    .foregroundStyle(Color.textMuted)
                    .padding(.horizontal, Spacing.sm)
                    .padding(.vertical, 2)
                    .background(Color.accentLight, in: Capsule())
            }

            ForEach(Array(store.upcomingRenewals.prefix(3))) { sub in
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

    // MARK: - Top Categories (segmented bar chart + legend)

    private var topCategoriesSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Por categoria")
                .font(.headline)
                .foregroundStyle(Color.textPrimary)

            Card {
                VStack(spacing: Spacing.lg) {
                    // Segmented bar
                    categoriesBar
                        .padding(.horizontal, Spacing.lg)
                        .padding(.top, Spacing.lg)

                    // Legend rows
                    VStack(spacing: 2) {
                        ForEach(displayCategories, id: \.category) { item in
                            HStack(spacing: Spacing.md) {
                                Circle()
                                    .fill(item.color)
                                    .frame(width: 10, height: 10)

                                Text(item.label)
                                    .font(.rounded(.regular, size: 13))
                                    .foregroundStyle(Color.textPrimary)

                                Spacer()

                                Text("\(item.pct)%")
                                    .font(.rounded(.regular, size: 11))
                                    .foregroundStyle(Color.textMuted)

                                Text(CurrencyFormat.string(for: item.total, currency: "EUR"))
                                    .font(.rounded(.semibold, size: 13))
                                    .foregroundStyle(Color.textPrimary)
                            }
                            .padding(.horizontal, Spacing.lg)
                            .padding(.vertical, Spacing.xs)
                        }
                    }
                    .padding(.bottom, Spacing.lg)
                }
            }
        }
    }

    private var categoriesBar: some View {
        GeometryReader { geo in
            HStack(spacing: 3) {
                ForEach(displayCategories, id: \.category) { item in
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(item.color)
                        .frame(width: max(8, geo.size.width * CGFloat(item.pct) / 100 - 3))
                }
            }
        }
        .frame(height: 48)
    }

    // MARK: - Top Expensive (horizontal scroll)

    private var topExpensiveSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Mas caras")
                .font(.headline)
                .foregroundStyle(Color.textPrimary)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: Spacing.md) {
                    ForEach(Array(store.activeSubscriptions
                        .sorted { $0.monthlyEquivalent > $1.monthlyEquivalent }
                        .prefix(8)
                        .enumerated()), id: \.element.id) { idx, sub in

                        VStack(alignment: .leading, spacing: 0) {
                            Text("#\(idx + 1)")
                                .font(.rounded(.bold, size: 11))
                                .foregroundStyle(Color.textDisabled)
                                .textCase(.uppercase)

                            LogoAvatar(
                                name: sub.name,
                                logoURL: URL(string: sub.logoUrl ?? ""),
                                size: 40
                            )
                            .padding(.top, Spacing.sm)
                            .padding(.bottom, Spacing.md)

                            Text(sub.name)
                                .font(.rounded(.bold, size: 14))
                                .foregroundStyle(Color.textPrimary)
                                .lineLimit(1)

                            HStack(alignment: .firstTextBaseline, spacing: 2) {
                                Text(CurrencyFormat.string(for: sub.monthlyEquivalent, currency: sub.currency))
                                    .font(.rounded(.bold, size: 15))
                                    .foregroundStyle(Color.textPrimary)
                                Text("/mes")
                                    .font(.rounded(.regular, size: 12))
                                    .foregroundStyle(Color.textMuted)
                            }
                            .padding(.top, Spacing.xs)
                        }
                        .padding(Spacing.lg)
                        .frame(width: 185, alignment: .leading)
                        .background(Color.surface)
                        .clipShape(RoundedRectangle(cornerRadius: Radius.card, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: Radius.card, style: .continuous)
                                .stroke(Color.borderLight, lineWidth: 1)
                        )
                    }
                }
            }
        }
    }

    // MARK: - Data Helpers

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
    }

    private struct DisplayCategory {
        let category: Subscription.Category
        let label: String
        let color: Color
        let total: Decimal
        let pct: Int
    }

    private var displayCategories: [DisplayCategory] {
        let all = topCategories
        let total = store.monthlyTotal
        guard total > 0 else { return [] }

        let totalDouble = NSDecimalNumber(decimal: total).doubleValue

        let top4 = all.prefix(4)
        var result = top4.map { item in
            let itemDouble = NSDecimalNumber(decimal: item.total).doubleValue
            return DisplayCategory(
                category: item.category,
                label: item.category.localizedName,
                color: item.category.categoryColor,
                total: item.total,
                pct: Int((itemDouble / totalDouble * 100).rounded())
            )
        }

        // "Resto" bucket
        let restTotal = all.dropFirst(4).reduce(Decimal.zero) { $0 + $1.total }
        if restTotal > 0 {
            let restDouble = NSDecimalNumber(decimal: restTotal).doubleValue
            result.append(DisplayCategory(
                category: .other,
                label: "Resto",
                color: Color(hex: "#D1D5DB"),
                total: restTotal,
                pct: Int((restDouble / totalDouble * 100).rounded())
            ))
        }

        return result
    }

    private func renewalLabel(for sub: Subscription) -> String {
        let days = sub.daysUntilBilling
        if days == 0 { return "Se renueva hoy" }
        if days == 1 { return "Se renueva manana" }
        return "Se renueva en \(days) dias"
    }
}

// MARK: - Insight Card Row

/// Single insight card matching web's InsightCell:
/// bg-white rounded-[32px] px-4 py-3, icon(40x40 rounded-2xl) + label+value + right column
private struct InsightCardRow: View {
    let iconName: String
    let iconBg: Color
    let label: String
    let value: String
    let rightTop: String
    let rightBottom: String

    var body: some View {
        HStack(spacing: Spacing.md) {
            // Icon tile 40x40
            Image(systemName: iconName)
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(Color.textPrimary)
                .frame(width: 40, height: 40)
                .background(iconBg)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))

            // Label + value
            VStack(alignment: .leading, spacing: 2) {
                Text(label)
                    .font(.rounded(.regular, size: 12))
                    .foregroundStyle(Color.textMuted)
                Text(value)
                    .font(.rounded(.bold, size: 17))
                    .foregroundStyle(Color.textPrimary)
                    .lineLimit(1)
            }

            Spacer()

            // Right column
            VStack(alignment: .trailing, spacing: 2) {
                Text(rightTop)
                    .font(.rounded(.semibold, size: 12))
                    .foregroundStyle(Color.textPrimary)
                Text(rightBottom)
                    .font(.rounded(.regular, size: 12))
                    .foregroundStyle(Color.textMuted)
            }
            .layoutPriority(-1)
        }
        .padding(.horizontal, Spacing.lg)
        .padding(.vertical, Spacing.md)
        .background(Color.surface)
        .clipShape(RoundedRectangle(cornerRadius: Radius.card, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: Radius.card, style: .continuous)
                .stroke(Color.borderLight, lineWidth: 1)
        )
    }
}

#Preview {
    DashboardView()
        .environment(AuthStore.preview())
        .environment(SubscriptionsStore.preview())
}
