import SwiftUI

/// Monthly calendar grid with subscription renewal indicators.
///
/// Shows a 7-column grid of day cells with dots on dates that have
/// one or more renewals. Tapping a date with renewals reveals a
/// small list of those subscriptions below the grid.
struct CalendarView: View {
    @Environment(SubscriptionsStore.self) private var store

    @State private var displayedMonth: Date = {
        let cal = Calendar.current
        let comps = cal.dateComponents([.year, .month], from: .now)
        return cal.date(from: comps)!
    }()

    @State private var selectedDate: Date?

    // MARK: - Body

    var body: some View {
        ScrollView {
            VStack(spacing: Spacing.xl) {
                // Title (when not embedded in NavigationStack)
                HStack {
                    Text("Calendario")
                        .font(.title)
                        .foregroundStyle(Color.textPrimary)
                    Spacer()
                }

                monthHeader
                weekdayRow
                dayGrid
                if let date = selectedDate {
                    renewalList(for: date)
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                }
            }
            .padding(.horizontal, Spacing.xl)
            .padding(.top, Spacing.md)
            .padding(.bottom, 120)
        }
        .background(Color.background)
        .animation(.spring(response: 0.35, dampingFraction: 0.8), value: displayedMonth)
        .animation(.spring(response: 0.3, dampingFraction: 0.85), value: selectedDate)
    }

    // MARK: - Subviews

    private var monthHeader: some View {
        HStack {
            Button {
                Haptics.selection()
                displayedMonth = calendar.date(byAdding: .month, value: -1, to: displayedMonth)!
                selectedDate = nil
            } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(Color.textPrimary)
                    .frame(width: 40, height: 40)
                    .background(Color.surface)
                    .clipShape(Circle())
                    .overlay(Circle().stroke(Color.borderLight, lineWidth: 1))
            }

            Spacer()

            Text(monthYearLabel)
                .font(.headline)
                .foregroundStyle(Color.textPrimary)

            Spacer()

            Button {
                Haptics.selection()
                displayedMonth = calendar.date(byAdding: .month, value: 1, to: displayedMonth)!
                selectedDate = nil
            } label: {
                Image(systemName: "chevron.right")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(Color.textPrimary)
                    .frame(width: 40, height: 40)
                    .background(Color.surface)
                    .clipShape(Circle())
                    .overlay(Circle().stroke(Color.borderLight, lineWidth: 1))
            }
        }
    }

    private var weekdayRow: some View {
        LazyVGrid(columns: gridColumns, spacing: 0) {
            ForEach(["L", "M", "X", "J", "V", "S", "D"], id: \.self) { label in
                Text(label)
                    .font(.micro)
                    .foregroundStyle(Color.textMuted)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.xs)
            }
        }
    }

    private var dayGrid: some View {
        Card {
            LazyVGrid(columns: gridColumns, spacing: 0) {
                ForEach(calendarCells, id: \.self) { date in
                    if let date {
                        DayCell(
                            date: date,
                            isToday: calendar.isDateInToday(date),
                            isSelected: selectedDate.map { calendar.isDate($0, inSameDayAs: date) } ?? false,
                            renewalCount: renewals(on: date).count
                        )
                        .onTapGesture {
                            Haptics.selection()
                            let subs = renewals(on: date)
                            if !subs.isEmpty {
                                selectedDate = calendar.isDate(date, inSameDayAs: selectedDate ?? .distantPast)
                                    ? nil
                                    : date
                            }
                        }
                    } else {
                        Color.clear
                            .frame(height: 44)
                    }
                }
            }
            .padding(Spacing.sm)
        }
    }

    private func renewalList(for date: Date) -> some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text(dayLabel(for: date))
                .font(.headline)
                .foregroundStyle(Color.textPrimary)

            ForEach(renewals(on: date)) { sub in
                Card {
                    HStack(spacing: Spacing.md) {
                        LogoAvatar(
                            name: sub.name,
                            logoURL: URL(string: sub.logoUrl ?? ""),
                            size: 40
                        )
                        VStack(alignment: .leading, spacing: 2) {
                            Text(sub.name)
                                .font(.bodyMedium)
                                .foregroundStyle(Color.textPrimary)
                            Text(sub.category.localizedName)
                                .font(.caption)
                                .foregroundStyle(Color.textMuted)
                        }
                        Spacer()
                        Text(CurrencyFormat.string(for: sub.amount, currency: sub.currency))
                            .font(.bodyMedium)
                            .foregroundStyle(Color.textPrimary)
                    }
                    .padding(Spacing.md)
                }
            }
        }
    }

    // MARK: - Helpers

    private let calendar = Calendar.current
    private let gridColumns = Array(repeating: GridItem(.flexible(), spacing: 0), count: 7)

    private var monthYearLabel: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        formatter.locale = Locale(identifier: "es_ES")
        let raw = formatter.string(from: displayedMonth)
        return raw.prefix(1).uppercased() + raw.dropFirst()
    }

    /// Returns an array of `Date?` values aligned to a Mon-first grid.
    private var calendarCells: [Date?] {
        guard let range = calendar.range(of: .day, in: .month, for: displayedMonth),
              let firstDay = calendar.date(from: calendar.dateComponents([.year, .month], from: displayedMonth))
        else { return [] }

        let firstWeekday = (calendar.component(.weekday, from: firstDay) + 5) % 7
        var cells: [Date?] = Array(repeating: nil, count: firstWeekday)
        for day in range {
            let date = calendar.date(byAdding: .day, value: day - 1, to: firstDay)!
            cells.append(date)
        }
        while cells.count % 7 != 0 { cells.append(nil) }
        return cells
    }

    private func renewals(on date: Date) -> [Subscription] {
        store.subscriptions.filter {
            calendar.isDate($0.nextBillingDate, inSameDayAs: date)
        }
    }

    private func dayLabel(for date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "d 'de' MMMM"
        formatter.locale = Locale(identifier: "es_ES")
        return formatter.string(from: date)
    }
}

// MARK: - Day Cell

private struct DayCell: View {
    let date: Date
    let isToday: Bool
    let isSelected: Bool
    let renewalCount: Int

    private var day: Int {
        Calendar.current.component(.day, from: date)
    }

    var body: some View {
        VStack(spacing: 2) {
            ZStack {
                if isSelected {
                    Circle()
                        .fill(Color.accent)
                        .frame(width: 34, height: 34)
                } else if isToday {
                    Circle()
                        .stroke(Color.accent, lineWidth: 1.5)
                        .frame(width: 34, height: 34)
                }

                Text("\(day)")
                    .font(.rounded(.medium, size: 14))
                    .foregroundStyle(
                        isSelected ? Color.accentForeground :
                        isToday ? Color.accent :
                        Color.textPrimary
                    )
            }

            // Renewal dots
            HStack(spacing: 2) {
                ForEach(0..<min(renewalCount, 3), id: \.self) { _ in
                    Circle()
                        .fill(isSelected ? Color.accentForeground.opacity(0.8) : Color.accent)
                        .frame(width: 4, height: 4)
                }
            }
            .frame(height: 6)
        }
        .frame(height: 44)
    }
}

// MARK: - Preview

#Preview {
    CalendarView()
        .environment(SubscriptionsStore.preview())
}
