import Foundation

/// Formats `Decimal` amounts with the correct currency symbol and
/// locale rules. Caches formatters per currency to avoid re-creating
/// them on every cell render.
enum CurrencyFormat {
    private static var cache: [String: NumberFormatter] = [:]

    /// Formats `12.99` + `"EUR"` → `"12,99 €"` (in `es` locale).
    static func string(for amount: Decimal, currency: String) -> String {
        let formatter = formatter(for: currency)
        return formatter.string(from: amount as NSDecimalNumber) ?? "\(amount)"
    }

    /// Short format without decimals: `12.99` → `13 €`.
    static func shortString(for amount: Decimal, currency: String) -> String {
        let formatter = formatter(for: currency)
        formatter.maximumFractionDigits = 0
        defer { formatter.maximumFractionDigits = 2 }
        return formatter.string(from: amount as NSDecimalNumber) ?? "\(amount)"
    }

    private static func formatter(for currency: String) -> NumberFormatter {
        if let cached = cache[currency] { return cached }
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.currencyCode = currency
        f.locale = Locale.current
        f.minimumFractionDigits = 2
        f.maximumFractionDigits = 2
        cache[currency] = f
        return f
    }
}
