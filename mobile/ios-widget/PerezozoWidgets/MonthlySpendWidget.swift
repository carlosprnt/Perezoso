import WidgetKit
import SwiftUI

// MARK: - Monthly Spend Widget (Small)
// Shows total active monthly spending.

struct MonthlySpendEntry: TimelineEntry {
    let date: Date
    let totalMonthly: Double
    let currency: String
    let activeCount: Int
}

struct MonthlySpendProvider: TimelineProvider {
    func placeholder(in context: Context) -> MonthlySpendEntry {
        MonthlySpendEntry(date: Date(), totalMonthly: 48.97, currency: "EUR", activeCount: 4)
    }

    func getSnapshot(in context: Context, completion: @escaping (MonthlySpendEntry) -> Void) {
        completion(buildEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<MonthlySpendEntry>) -> Void) {
        let entry = buildEntry()
        let refreshDate = Calendar.current.date(byAdding: .hour, value: 2, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(refreshDate)))
    }

    private func buildEntry() -> MonthlySpendEntry {
        let data = loadWidgetData()
        let subs = data?.subscriptions ?? []
        let total = subs.reduce(0.0) { $0 + $1.monthlyEquivalent }
        let currency = data?.currency ?? "EUR"
        return MonthlySpendEntry(date: Date(), totalMonthly: total, currency: currency, activeCount: subs.count)
    }
}

struct MonthlySpendWidgetView: View {
    @Environment(\.colorScheme) var colorScheme
    var entry: MonthlySpendEntry

    private var bg: Color { colorScheme == .dark ? WidgetColors.darkBg : WidgetColors.lightBg }
    private var textPrimary: Color { colorScheme == .dark ? WidgetColors.darkText : WidgetColors.lightText }
    private var textMuted: Color { colorScheme == .dark ? WidgetColors.darkTextMuted : WidgetColors.lightTextMuted }
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(WidgetStrings.monthlySpendHeader)
                .font(.system(size: 10, weight: .medium))
                .tracking(0.8)
                .foregroundColor(textMuted)

            Spacer(minLength: 0)

            Text(formattedTotal)
                .font(.system(size: 30, weight: .medium))
                .foregroundColor(textPrimary)
                .minimumScaleFactor(0.6)
                .lineLimit(1)

            Text(WidgetStrings.activeSubscriptions(entry.activeCount))
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(textMuted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .containerBackground(bg, for: .widget)
    }

    private var formattedTotal: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = entry.currency
        formatter.maximumFractionDigits = 2
        return formatter.string(from: NSNumber(value: entry.totalMonthly)) ?? "\(entry.currency) \(entry.totalMonthly)"
    }
}

struct MonthlySpendWidget: Widget {
    let kind = "MonthlySpendWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: MonthlySpendProvider()) { entry in
            MonthlySpendWidgetView(entry: entry)
        }
        .configurationDisplayName(WidgetStrings.monthlySpendTitle)
        .description(WidgetStrings.monthlySpendDesc)
        .supportedFamilies([.systemSmall])
    }
}
