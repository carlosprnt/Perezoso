import SwiftUI

/// Main dashboard matching the web app's `/dashboard` exactly.
///
/// Web layout audit:
/// - Section gap: 8px (gap-[8px])
/// - Hero padding-bottom: 20px (pb-5)
/// - Greeting margin-bottom: 12px (mb-3)
/// - Insight cards: bg-white rounded-[32px] px-4 py-3, NO border
/// - Upcoming items: space-y-3.5 (14px), NO card wrapper, plain flex rows
/// - Categories: in card, segmented bar h-12
/// - Top expensive: 185px cards, rounded-[32px], NO border, p-4
struct DashboardView: View {
    @Environment(AuthStore.self) private var auth
    @Environment(SubscriptionsStore.self) private var store

    var onCalendarTap: (() -> Void)?
    var onSettingsTap: (() -> Void)?

    @State private var showAddSheet = false
    @State private var selectedPlatform: QuickAddPlatformInfo?

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 8) {
                // 1. Header (mb-3 = 12px below greeting)
                // Web: header fades at 0-130px scroll, blur 0→8px
                headerRow
                    .scrollDrivenBlur()
                    .padding(.bottom, 4)

                if store.subscriptions.isEmpty && !store.isLoading {
                    // Empty state: big hero text + QuickAddPlatforms
                    emptyDashboardHero
                        .fadeEntrance(delay: 0.1)
                } else {
                    // 2. Spending hero (pb-5 = 20px)
                    // Web: fades over 220px scroll with blur 0→12px
                    spendingHero
                        .scrollDrivenBlur(maxBlur: 12)
                        .staggeredEntrance(index: 0, stagger: MotionTiming.sectionStagger, offsetY: 40)

                    // 3. Insight cards
                    if !store.activeSubscriptions.isEmpty {
                        insightCards
                            .scrollDrivenBlur()
                            .staggeredEntrance(index: 1, stagger: MotionTiming.sectionStagger, offsetY: 40)
                    }

                    // 4. Upcoming renewals
                    if !store.upcomingRenewals.isEmpty {
                        upcomingSection
                            .scrollDrivenBlur()
                            .staggeredEntrance(index: 2, stagger: MotionTiming.sectionStagger, offsetY: 40)
                    }

                    // 5. Categories bar chart
                    if !store.activeSubscriptions.isEmpty {
                        topCategoriesSection
                            .scrollDrivenBlur()
                            .staggeredEntrance(index: 3, stagger: MotionTiming.sectionStagger, offsetY: 40)
                    }

                    // 6. Top expensive horizontal scroll (mt-3 = 12px)
                    if store.activeSubscriptions.count > 1 {
                        topExpensiveSection
                            .padding(.top, 4)
                            .scrollDrivenBlur()
                            .staggeredEntrance(index: 4, stagger: MotionTiming.sectionStagger, offsetY: 40)
                    }
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
        .overlay {
            CustomBottomSheet(
                isPresented: $showAddSheet,
                height: .full,
                title: "Nueva suscripción"
            ) {
                SubscriptionFormView(mode: .create, prefill: selectedPlatform)
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

    // MARK: - Empty State Hero (web: text-[45px] font-extrabold leading-[1.15] tracking-tight)

    private var emptyDashboardHero: some View {
        VStack(alignment: .leading, spacing: Spacing.xl) {
            Text("Aún no tienes ninguna suscripción añadida.")
                .font(.system(size: 45, weight: .heavy, design: .rounded))
                .foregroundStyle(Color.textPrimary)
                .lineSpacing(45 * 0.15)
                .tracking(-0.5)
                .fixedSize(horizontal: false, vertical: true)

            QuickAddPlatforms(
                onSelect: { platform in
                    selectedPlatform = platform
                    showAddSheet = true
                },
                onAddManually: {
                    selectedPlatform = nil
                    showAddSheet = true
                }
            )
        }
    }

    // MARK: - Spending Hero (narrative prose — web: pb-5 mb-3)

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
        .padding(.bottom, Spacing.md)
    }

    @ViewBuilder
    private func buildNarrativeText() -> some View {
        let monthly = CurrencyFormat.string(for: store.monthlyTotal, currency: "EUR")
        let annual = CurrencyFormat.string(for: store.yearlyTotal, currency: "EUR")

        VStack(alignment: .leading, spacing: 0) {
            Text("Este mes gastas")
                .font(.rounded(.heavy, size: 25))
                .foregroundStyle(Color.textSecondary)
                .tracking(-0.3)

            Text(monthly)
                .font(.system(size: 50, weight: .bold, design: .rounded))
                .foregroundStyle(Color.textPrimary)
                .contentTransition(.numericText())

            Text("Eso al ano es")
                .font(.rounded(.heavy, size: 25))
                .foregroundStyle(Color.textSecondary)
                .tracking(-0.3)
                .padding(.top, 2)

            Text(annual)
                .font(.system(size: 50, weight: .bold, design: .rounded))
                .foregroundStyle(Color.textPrimary)
                .contentTransition(.numericText())
        }
    }

    // MARK: - Insight Cards (web: gap-2 = 8px, NO border, rounded-[32px])

    private var insightCards: some View {
        VStack(spacing: 8) {
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

    // MARK: - Upcoming Renewals (web: space-y-3.5 = 14px, NO card wrappers)

    private var upcomingSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Proximas renovaciones")
                .font(.rounded(.bold, size: 17))
                .foregroundStyle(Color.textPrimary)
                .tracking(-0.3)

            VStack(spacing: 14) {
                ForEach(Array(store.upcomingRenewals.prefix(3))) { sub in
                    Button {
                        Haptics.tap(.light)
                    } label: {
                        HStack(spacing: Spacing.md) {
                            LogoAvatar(name: sub.name, logoURL: URL(string: sub.logoUrl ?? ""), size: 40)

                            VStack(alignment: .leading, spacing: 2) {
                                Text(sub.name)
                                    .font(.rounded(.bold, size: 17))
                                    .foregroundStyle(Color.textPrimary)
                                    .lineLimit(1)
                                Text(CurrencyFormat.string(for: sub.amount, currency: sub.currency))
                                    .font(.rounded(.regular, size: 12))
                                    .foregroundStyle(Color.textMuted)
                            }

                            Spacer()

                            Text(renewalDaysLabel(for: sub))
                                .font(.rounded(.regular, size: 14))
                                .foregroundStyle(Color.textSecondary)
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    // MARK: - Top Categories (segmented bar chart + legend)

    private var topCategoriesSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Por categoria")
                .font(.rounded(.bold, size: 17))
                .foregroundStyle(Color.textPrimary)
                .tracking(-0.3)

            VStack(spacing: 0) {
                // Segmented bar
                categoriesBar
                    .padding(.bottom, Spacing.lg)

                // Legend rows (space-y-0.5 = 2px)
                VStack(spacing: 2) {
                    ForEach(displayCategories, id: \.category) { item in
                        HStack(spacing: 10) {
                            Circle()
                                .fill(item.color)
                                .frame(width: 10, height: 10)

                            Text(item.label)
                                .font(.rounded(.regular, size: 13))
                                .foregroundStyle(Color.textPrimary)
                                .lineLimit(1)

                            Spacer()

                            Text("\(item.pct)%")
                                .font(.rounded(.regular, size: 11))
                                .foregroundStyle(Color(hex: "#8E8E93"))

                            Text(CurrencyFormat.string(for: item.total, currency: "EUR"))
                                .font(.rounded(.semibold, size: 13))
                                .foregroundStyle(Color.textPrimary)
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                    }
                }
            }
        }
    }

    private var categoriesBar: some View {
        GeometryReader { geo in
            HStack(spacing: 3) {
                ForEach(Array(displayCategories.enumerated()), id: \.element.category) { idx, item in
                    let segColor = idx == 0 ? Color(hex: "#FEF08A") : item.color
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(segColor)
                        .frame(width: max(8, geo.size.width * CGFloat(item.pct) / 100 - 3))
                }
            }
        }
        .frame(height: 48)
    }

    // MARK: - Top Expensive (web: gap-3=12px, 185px, rounded-[32px], NO border, p-4=16px)

    private var topExpensiveSection: some View {
        VStack(alignment: .leading, spacing: Spacing.lg) {
            Text("Mas caras")
                .font(.rounded(.bold, size: 17))
                .foregroundStyle(Color.textPrimary)
                .tracking(-0.3)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(Array(store.activeSubscriptions
                        .sorted { $0.monthlyEquivalent > $1.monthlyEquivalent }
                        .prefix(8)
                        .enumerated()), id: \.element.id) { idx, sub in

                        Button {
                            Haptics.tap(.light)
                        } label: {
                            VStack(alignment: .leading, spacing: 0) {
                                Text("#\(idx + 1)")
                                    .font(.rounded(.bold, size: 11))
                                    .foregroundStyle(Color(hex: "#B0B0B0"))
                                    .textCase(.uppercase)
                                    .tracking(0.5)

                                LogoAvatar(
                                    name: sub.name,
                                    logoURL: URL(string: sub.logoUrl ?? ""),
                                    size: 48
                                )
                                .padding(.top, 8)
                                .padding(.bottom, 12)

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
                                .padding(.top, 6)
                            }
                            .padding(Spacing.lg)
                            .frame(width: 185, alignment: .leading)
                            .background(Color.surface)
                            .clipShape(RoundedRectangle(cornerRadius: Radius.card, style: .continuous))
                        }
                        .buttonStyle(.plain)
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

    private func renewalDaysLabel(for sub: Subscription) -> String {
        let d = sub.daysUntilBilling
        if d == 0 { return "Hoy" }
        if d == 1 { return "Manana" }
        return "En \(d) dias"
    }
}

// MARK: - Insight Card Row (web: NO border, rounded-[32px], px-4 py-3)

private struct InsightCardRow: View {
    let iconName: String
    let iconBg: Color
    let label: String
    let value: String
    let rightTop: String
    let rightBottom: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: iconName)
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(Color.textPrimary)
                .frame(width: 40, height: 40)
                .background(iconBg)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))

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
    }
}

#Preview {
    DashboardView()
        .environment(AuthStore.preview())
        .environment(SubscriptionsStore.preview())
}
