import WidgetKit
import SwiftUI

// MARK: - Next Payment Widget (Small)
// Shows the next upcoming subscription: name, price, days until charge.

struct NextPaymentEntry: TimelineEntry {
    let date: Date
    let subscription: WidgetSubscription?
}

struct NextPaymentProvider: TimelineProvider {
    func placeholder(in context: Context) -> NextPaymentEntry {
        NextPaymentEntry(date: Date(), subscription: sampleSubscriptions.first)
    }

    func getSnapshot(in context: Context, completion: @escaping (NextPaymentEntry) -> Void) {
        let data = loadWidgetData()
        let next = data?.subscriptions
            .sorted { $0.daysUntilNext < $1.daysUntilNext }
            .first
        completion(NextPaymentEntry(date: Date(), subscription: next ?? sampleSubscriptions.first))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<NextPaymentEntry>) -> Void) {
        let data = loadWidgetData()
        let next = data?.subscriptions
            .sorted { $0.daysUntilNext < $1.daysUntilNext }
            .first
        let entry = NextPaymentEntry(date: Date(), subscription: next)
        let refreshDate = Calendar.current.date(byAdding: .hour, value: 1, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(refreshDate)))
    }
}

struct NextPaymentWidgetView: View {
    @Environment(\.colorScheme) var colorScheme
    var entry: NextPaymentEntry

    private var bg: Color { colorScheme == .dark ? WidgetColors.darkBg : WidgetColors.lightBg }
    private var textPrimary: Color { colorScheme == .dark ? WidgetColors.darkText : WidgetColors.lightText }
    private var textMuted: Color { colorScheme == .dark ? WidgetColors.darkTextMuted : WidgetColors.lightTextMuted }

    var body: some View {
        if let sub = entry.subscription {
            VStack(alignment: .leading, spacing: 6) {
                // Category pill
                Text(sub.category.uppercased())
                    .font(.system(size: 9, weight: .bold, design: .rounded))
                    .tracking(0.8)
                    .foregroundColor(.white)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 3)
                    .background(
                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color.black)
                    )

                Spacer(minLength: 0)

                // Subscription name
                Text(sub.name)
                    .font(.system(size: 17, weight: .bold, design: .rounded))
                    .foregroundColor(textPrimary)
                    .lineLimit(1)

                // Price
                Text(sub.formattedPrice)
                    .font(.system(size: 28, weight: .heavy, design: .rounded))
                    .foregroundColor(textPrimary)
                    .minimumScaleFactor(0.6)
                    .lineLimit(1)

                // Days until
                HStack(spacing: 4) {
                    Image(systemName: "calendar")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(textMuted)
                    Text(WidgetStrings.daysText(sub.daysUntilNext))
                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                        .foregroundColor(textMuted)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .containerBackground(bg, for: .widget)
        } else {
            VStack(spacing: 8) {
                Image(systemName: "creditcard")
                    .font(.system(size: 24))
                    .foregroundColor(textMuted)
                Text(WidgetStrings.noSubscriptions)
                    .font(.system(size: 13, weight: .medium, design: .rounded))
                    .foregroundColor(textMuted)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .containerBackground(bg, for: .widget)
        }
    }
}

struct NextPaymentWidget: Widget {
    let kind = "NextPaymentWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: NextPaymentProvider()) { entry in
            NextPaymentWidgetView(entry: entry)
        }
        .configurationDisplayName(WidgetStrings.nextPaymentTitle)
        .description(WidgetStrings.nextPaymentDesc)
        .supportedFamilies([.systemSmall])
    }
}
