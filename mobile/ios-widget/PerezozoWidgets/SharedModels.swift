import Foundation
import UIKit

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

    /// Raw next billing date as parsed from the snapshot JSON. May be in
    /// the past if the app hasn't written a fresh snapshot since the last
    /// renewal — prefer `effectiveNextDate` for display.
    var nextDate: Date? {
        let fmt = DateFormatter()
        fmt.dateFormat = "yyyy-MM-dd"
        return fmt.date(from: String(nextBillingDate.prefix(10)))
    }

    /// `nextDate` rolled forward by successive billing periods until it
    /// lands on or after today. Mirrors `advanceRenewalDate` in
    /// TypeScript so widgets stay accurate when the app hasn't been
    /// opened in days. No-op for paused/cancelled subs.
    var effectiveNextDate: Date? {
        guard var d = nextDate else { return nil }
        let cal = Calendar.current
        let today = cal.startOfDay(for: Date())
        if cal.startOfDay(for: d) >= today { return d }
        guard status == "active" || status == "trial" else { return d }
        var safety = 0
        while cal.startOfDay(for: d) < today && safety < 1000 {
            switch billingPeriod {
            case "weekly":
                d = cal.date(byAdding: .day, value: 7, to: d) ?? d
            case "quarterly":
                d = cal.date(byAdding: .month, value: 3, to: d) ?? d
            case "yearly":
                d = cal.date(byAdding: .year, value: 1, to: d) ?? d
            default: // monthly + any unknown
                d = cal.date(byAdding: .month, value: 1, to: d) ?? d
            }
            safety += 1
        }
        return d
    }

    var daysUntilNext: Int {
        guard let next = effectiveNextDate else { return 999 }
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

private func sampleDate(daysFromNow: Int) -> String {
    let fmt = DateFormatter()
    fmt.dateFormat = "yyyy-MM-dd"
    let date = Calendar.current.date(byAdding: .day, value: daysFromNow, to: Date()) ?? Date()
    return fmt.string(from: date)
}

let sampleSubscriptions: [WidgetSubscription] = [
    WidgetSubscription(id: "1", name: "Netflix", price: 15.99, currency: "EUR", billingPeriod: "monthly", nextBillingDate: sampleDate(daysFromNow: 3), status: "active", category: "streaming", cardColor: nil, monthlyEquivalent: 15.99, logoUrl: nil),
    WidgetSubscription(id: "2", name: "Spotify", price: 9.99, currency: "EUR", billingPeriod: "monthly", nextBillingDate: sampleDate(daysFromNow: 7), status: "active", category: "music", cardColor: nil, monthlyEquivalent: 9.99, logoUrl: nil),
    WidgetSubscription(id: "3", name: "iCloud+", price: 2.99, currency: "EUR", billingPeriod: "monthly", nextBillingDate: sampleDate(daysFromNow: 12), status: "active", category: "cloud", cardColor: nil, monthlyEquivalent: 2.99, logoUrl: nil),
    WidgetSubscription(id: "4", name: "ChatGPT Plus", price: 20.00, currency: "EUR", billingPeriod: "monthly", nextBillingDate: sampleDate(daysFromNow: 18), status: "active", category: "ai", cardColor: nil, monthlyEquivalent: 20.00, logoUrl: nil),
]

let sampleData = WidgetSharedData(subscriptions: sampleSubscriptions, currency: "EUR", updatedAt: ISO8601DateFormatter().string(from: Date()))

// MARK: - Logo downloading for widgets

func downloadLogos(for subs: [WidgetSubscription], completion: @escaping ([String: UIImage]) -> Void) {
    let group = DispatchGroup()
    var logos: [String: UIImage] = [:]
    let lock = NSLock()

    for sub in subs {
        guard let urlString = sub.logoUrl, let url = URL(string: urlString) else { continue }
        group.enter()
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForResource = 5
        URLSession(configuration: config).dataTask(with: url) { data, _, _ in
            if let data = data, let image = UIImage(data: data) {
                lock.lock()
                logos[sub.id] = image
                lock.unlock()
            }
            group.leave()
        }.resume()
    }

    group.notify(queue: .global()) {
        completion(logos)
    }
}
