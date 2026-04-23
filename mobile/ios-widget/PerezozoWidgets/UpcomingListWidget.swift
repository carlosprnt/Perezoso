import WidgetKit
import SwiftUI

// MARK: - Upcoming List Widget (Medium)
// Shows the next 4 upcoming subscription payments in a compact list.

struct UpcomingListEntry: TimelineEntry {
    let date: Date
    let subscriptions: [WidgetSubscription]
}

struct UpcomingListProvider: TimelineProvider {
    func placeholder(in context: Context) -> UpcomingListEntry {
        UpcomingListEntry(date: Date(), subscriptions: sampleSubscriptions)
    }

    func getSnapshot(in context: Context, completion: @escaping (UpcomingListEntry) -> Void) {
        let data = loadWidgetData()
        let subs = (data?.subscriptions ?? sampleSubscriptions)
            .sorted { $0.daysUntilNext < $1.daysUntilNext }
        completion(UpcomingListEntry(date: Date(), subscriptions: Array(subs.prefix(4))))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<UpcomingListEntry>) -> Void) {
        let data = loadWidgetData()
        let subs = (data?.subscriptions ?? [])
            .sorted { $0.daysUntilNext < $1.daysUntilNext }
        let entry = UpcomingListEntry(date: Date(), subscriptions: Array(subs.prefix(4)))
        let refreshDate = Calendar.current.date(byAdding: .hour, value: 1, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(refreshDate)))
    }
}

struct UpcomingListWidgetView: View {
    @Environment(\.colorScheme) var colorScheme
    var entry: UpcomingListEntry

    private var bg: Color { colorScheme == .dark ? WidgetColors.darkBg : WidgetColors.lightBg }
    private var textPrimary: Color { colorScheme == .dark ? WidgetColors.darkText : WidgetColors.lightText }
    private var textMuted: Color { colorScheme == .dark ? WidgetColors.darkTextMuted : WidgetColors.lightTextMuted }
    private var border: Color { colorScheme == .dark ? WidgetColors.darkBorder : WidgetColors.lightBorder }

    var body: some View {
        if entry.subscriptions.isEmpty {
            VStack(spacing: 8) {
                Image(systemName: "creditcard")
                    .font(.system(size: 28))
                    .foregroundColor(textMuted)
                Text(WidgetStrings.noUpcoming)
                    .font(.system(size: 14, weight: .medium, design: .rounded))
                    .foregroundColor(textMuted)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .containerBackground(bg, for: .widget)
        } else {
            VStack(alignment: .leading, spacing: 0) {
                // Header
                HStack {
                    Text(WidgetStrings.upcomingHeader)
                        .font(.system(size: 10, weight: .bold, design: .rounded))
                        .tracking(0.8)
                        .foregroundColor(textMuted)
                    Spacer()
                    Text("\(entry.subscriptions.count)")
                        .font(.system(size: 11, weight: .bold, design: .rounded))
                        .foregroundColor(textMuted)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(
                            Capsule().fill(border)
                        )
                }
                .padding(.bottom, 8)

                // List rows
                ForEach(Array(entry.subscriptions.enumerated()), id: \.element.id) { index, sub in
                    UpcomingRow(sub: sub, textPrimary: textPrimary, textMuted: textMuted)

                    if index < entry.subscriptions.count - 1 {
                        Divider()
                            .background(border)
                            .padding(.leading, 36)
                    }
                }
            }
            .containerBackground(bg, for: .widget)
        }
    }
}

struct UpcomingRow: View {
    let sub: WidgetSubscription
    let textPrimary: Color
    let textMuted: Color

    var body: some View {
        HStack(spacing: 10) {
            // Category initial
            RoundedRectangle(cornerRadius: 5)
                .fill(WidgetColors.categoryColor(for: sub.category))
                .frame(width: 26, height: 26)
                .overlay(
                    Text(String(sub.name.prefix(1)).uppercased())
                        .font(.system(size: 11, weight: .bold, design: .rounded))
                        .foregroundColor(WidgetColors.categoryTextColor(for: sub.category))
                )

            VStack(alignment: .leading, spacing: 1) {
                Text(sub.name)
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                    .foregroundColor(textPrimary)
                    .lineLimit(1)
                Text(WidgetStrings.daysText(sub.daysUntilNext))
                    .font(.system(size: 10, weight: .medium, design: .rounded))
                    .foregroundColor(textMuted)
            }

            Spacer()

            Text(sub.formattedPrice)
                .font(.system(size: 13, weight: .bold, design: .rounded))
                .foregroundColor(textPrimary)
        }
        .padding(.vertical, 5)
    }
}

struct UpcomingListWidget: Widget {
    let kind = "UpcomingListWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: UpcomingListProvider()) { entry in
            UpcomingListWidgetView(entry: entry)
        }
        .configurationDisplayName(WidgetStrings.upcomingTitle)
        .description(WidgetStrings.upcomingDesc)
        .supportedFamilies([.systemMedium])
    }
}
