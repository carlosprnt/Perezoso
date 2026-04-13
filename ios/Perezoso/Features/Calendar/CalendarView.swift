import SwiftUI

/// Monthly calendar grid matching the web's CalendarView.tsx.
///
/// Web spec:
/// - Day cells: 80px min-height, 12px radius, 5px gap
/// - Day number: 13px medium, black if has subs / gray if not
/// - Logo: 32px CellLogo centered in cell, "+N" badge if >1
/// - Today: 1.5px solid black border
/// - Month header: animated title + circular nav buttons (40x40)
/// - Month summary: total cost | renewal count (13px, pipe separator)
/// - Swipe left/right for month navigation
/// - Tapping day opens CalendarDaySheet
struct CalendarView: View {
    @Environment(SubscriptionsStore.self) private var store

    @State private var displayedMonth: Date = {
        let cal = Calendar.current
        let comps = cal.dateComponents([.year, .month], from: .now)
        return cal.date(from: comps)!
    }()

    @State private var selectedDate: Date?
    @State private var showDaySheet = false

    var body: some View {
        ScrollView {
            VStack(spacing: Spacing.xl) {
                HStack {
                    Text("Calendario")
                        .font(.title)
                        .foregroundStyle(Color.textPrimary)
                    Spacer()
                }

                monthHeader
                monthSummary
                weekdayRow
                dayGrid
            }
            .padding(.horizontal, Spacing.xl)
            .padding(.top, Spacing.md)
            .padding(.bottom, 120)
        }
        .background(Color.background)
        .gesture(
            DragGesture(minimumDistance: 50)
                .onEnded { value in
                    if value.translation.width < -50 {
                        Haptics.selection()
                        withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) {
                            displayedMonth = calendar.date(byAdding: .month, value: 1, to: displayedMonth)!
                            selectedDate = nil
                        }
                    } else if value.translation.width > 50 {
                        Haptics.selection()
                        withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) {
                            displayedMonth = calendar.date(byAdding: .month, value: -1, to: displayedMonth)!
                            selectedDate = nil
                        }
                    }
                }
        )
        .overlay {
            if showDaySheet, let date = selectedDate {
                CustomBottomSheet(
                    isPresented: $showDaySheet,
                    title: dayLabel(for: date)
                ) {
                    calendarDaySheet(for: date)
                }
            }
        }
        .animation(.spring(response: 0.35, dampingFraction: 0.8), value: displayedMonth)
    }

    // MARK: - Month Header

    private var monthHeader: some View {
        HStack {
            Button {
                Haptics.selection()
                withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) {
                    displayedMonth = calendar.date(byAdding: .month, value: -1, to: displayedMonth)!
                    selectedDate = nil
                }
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
                .font(.rounded(.bold, size: 28))
                .foregroundStyle(Color.textPrimary)
                .id(monthYearLabel) // Triggers animation on change
                .transition(.asymmetric(
                    insertion: .move(edge: .trailing).combined(with: .opacity),
                    removal: .move(edge: .leading).combined(with: .opacity)
                ))

            Spacer()

            Button {
                Haptics.selection()
                withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) {
                    displayedMonth = calendar.date(byAdding: .month, value: 1, to: displayedMonth)!
                    selectedDate = nil
                }
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

    // MARK: - Month Summary

    private var monthSummary: some View {
        HStack(spacing: Spacing.md) {
            let monthRenewals = allMonthRenewals
            let totalCost = monthRenewals.reduce(Decimal.zero) { $0 + $1.amount }

            Text(CurrencyFormat.string(for: totalCost, currency: "EUR"))
                .font(.rounded(.medium, size: 13))
                .foregroundStyle(Color.textMuted)

            Rectangle()
                .fill(Color.border)
                .frame(width: 1, height: 12)

            Text("\(monthRenewals.count) renovaciones")
                .font(.rounded(.medium, size: 13))
                .foregroundStyle(Color.textMuted)
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Weekday Row

    private var weekdayRow: some View {
        LazyVGrid(columns: gridColumns, spacing: 0) {
            ForEach(["L", "M", "X", "J", "V", "S", "D"], id: \.self) { label in
                Text(label)
                    .font(.rounded(.medium, size: 11))
                    .foregroundStyle(Color.textMuted)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.xxs)
            }
        }
    }

    // MARK: - Day Grid

    private var dayGrid: some View {
        LazyVGrid(columns: gridColumns, spacing: 5) {
            ForEach(calendarCells, id: \.self) { date in
                if let date {
                    let subs = renewals(on: date)
                    let isToday = calendar.isDateInToday(date)
                    let isSelected = selectedDate.map { calendar.isDate($0, inSameDayAs: date) } ?? false

                    CalendarDayCell(
                        date: date,
                        isToday: isToday,
                        isSelected: isSelected,
                        subscriptions: subs
                    )
                    .onTapGesture {
                        Haptics.selection()
                        if !subs.isEmpty {
                            selectedDate = date
                            showDaySheet = true
                        }
                    }
                } else {
                    Color.clear
                        .frame(minHeight: 80)
                }
            }
        }
    }

    // MARK: - Calendar Day Sheet

    private func calendarDaySheet(for date: Date) -> some View {
        VStack(spacing: Spacing.md) {
            ForEach(renewals(on: date)) { sub in
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
                .padding(.horizontal, Spacing.xl)
            }
        }
        .padding(.vertical, Spacing.lg)
        .padding(.bottom, Spacing.xxxl)
    }

    // MARK: - Helpers

    private let calendar = Calendar.current
    private let gridColumns = Array(repeating: GridItem(.flexible(), spacing: 5), count: 7)

    private var monthYearLabel: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        formatter.locale = Locale(identifier: "es_ES")
        let raw = formatter.string(from: displayedMonth)
        return raw.prefix(1).uppercased() + raw.dropFirst()
    }

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
        store.activeSubscriptions.filter {
            calendar.isDate($0.nextBillingDate, inSameDayAs: date)
        }
    }

    private var allMonthRenewals: [Subscription] {
        store.activeSubscriptions.filter { sub in
            let comps = calendar.dateComponents([.year, .month], from: sub.nextBillingDate)
            let displayComps = calendar.dateComponents([.year, .month], from: displayedMonth)
            return comps.year == displayComps.year && comps.month == displayComps.month
        }
    }

    private func dayLabel(for date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "d 'de' MMMM"
        formatter.locale = Locale(identifier: "es_ES")
        return formatter.string(from: date)
    }
}

// MARK: - Calendar Day Cell

/// Day cell matching web: 80px min-height, 12px radius,
/// day number top-left, logo centered, +N badge if multiple.
private struct CalendarDayCell: View {
    let date: Date
    let isToday: Bool
    let isSelected: Bool
    let subscriptions: [Subscription]

    private var day: Int {
        Calendar.current.component(.day, from: date)
    }

    private var hasSubs: Bool { !subscriptions.isEmpty }

    var body: some View {
        VStack(spacing: 4) {
            // Day number (top)
            Text("\(day)")
                .font(.rounded(.medium, size: 13))
                .foregroundStyle(
                    hasSubs
                        ? Color.textPrimary
                        : Color(hex: "#A0A0A0")
                )
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.leading, 6)
                .padding(.top, 6)

            Spacer()

            // Logo or empty
            if let first = subscriptions.first {
                ZStack(alignment: .bottomTrailing) {
                    LogoAvatar(
                        name: first.name,
                        logoURL: URL(string: first.logoUrl ?? ""),
                        size: 32
                    )

                    if subscriptions.count > 1 {
                        Text("+\(subscriptions.count - 1)")
                            .font(.rounded(.semibold, size: 9))
                            .foregroundStyle(Color.textMuted)
                            .padding(.horizontal, 4)
                            .padding(.vertical, 1)
                            .background(Color.surfaceSecondary, in: Capsule())
                            .offset(x: 6, y: 4)
                    }
                }
                .padding(.bottom, 6)
            } else {
                Spacer()
            }
        }
        .frame(minHeight: 80)
        .background(Color.surfaceSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(
                    isToday ? Color.accent : Color.clear,
                    lineWidth: 1.5
                )
        )
    }
}

#Preview {
    CalendarView()
        .environment(SubscriptionsStore.preview())
}
