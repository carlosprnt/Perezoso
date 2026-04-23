import Foundation

// MARK: - Shared data model (mirrors WidgetSharedData from TypeScript)

struct WidgetSharedData: Codable {
    let subscriptions: [WidgetSubscription]
    let currency: String
    let updatedAt: String
}

struct WidgetSubscription: Codable, Identifiable {
    let id: String
    let name: String
    let price: Double
    let currency: String
    let billingPeriod: String
    let nextBillingDate: String
    let status: String
    let category: String
    let cardColor: String?
    let monthlyEquivalent: Double
    let logoUrl: String?

    var nextDate: Date? {
        let fmt = DateFormatter()
        fmt.dateFormat = "yyyy-MM-dd"
        return fmt.date(from: String(nextBillingDate.prefix(10)))
    }

    var daysUntilNext: Int {
        guard let next = nextDate else { return 999 }
        return Calendar.current.dateComponents([.day], from: Calendar.current.startOfDay(for: Date()), to: Calendar.current.startOfDay(for: next)).day ?? 999
    }

    var formattedPrice: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = currency
        formatter.maximumFractionDigits = 2
        return formatter.string(from: NSNumber(value: price)) ?? "\(currency) \(price)"
    }

    var formattedMonthly: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = currency
        formatter.maximumFractionDigits = 2
        return formatter.string(from: NSNumber(value: monthlyEquivalent)) ?? "\(currency) \(monthlyEquivalent)"
    }
}

// MARK: - Data loader

let appGroupID = "group.com.perezoso.app"

func loadWidgetData() -> WidgetSharedData? {
    guard let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroupID) else { return nil }
    let fileURL = container.appendingPathComponent("widget-data.json")
    guard let data = try? Data(contentsOf: fileURL) else { return nil }
    return try? JSONDecoder().decode(WidgetSharedData.self, from: data)
}

// MARK: - Sample data for previews

let sampleSubscriptions: [WidgetSubscription] = [
    WidgetSubscription(id: "1", name: "Netflix", price: 15.99, currency: "EUR", billingPeriod: "monthly", nextBillingDate: "2026-04-28", status: "active", category: "streaming", cardColor: nil, monthlyEquivalent: 15.99, logoUrl: nil),
    WidgetSubscription(id: "2", name: "Spotify", price: 9.99, currency: "EUR", billingPeriod: "monthly", nextBillingDate: "2026-05-01", status: "active", category: "music", cardColor: nil, monthlyEquivalent: 9.99, logoUrl: nil),
    WidgetSubscription(id: "3", name: "iCloud+", price: 2.99, currency: "EUR", billingPeriod: "monthly", nextBillingDate: "2026-05-03", status: "active", category: "cloud", cardColor: nil, monthlyEquivalent: 2.99, logoUrl: nil),
    WidgetSubscription(id: "4", name: "ChatGPT Plus", price: 20.00, currency: "EUR", billingPeriod: "monthly", nextBillingDate: "2026-05-05", status: "active", category: "ai", cardColor: nil, monthlyEquivalent: 20.00, logoUrl: nil),
]

let sampleData = WidgetSharedData(subscriptions: sampleSubscriptions, currency: "EUR", updatedAt: "2026-04-23T12:00:00Z")
