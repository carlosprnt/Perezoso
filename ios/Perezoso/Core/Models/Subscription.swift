import Foundation

/// Codable domain model matching the `subscriptions` table in Supabase.
///
/// All property names use camelCase in Swift; the Supabase decoder is
/// configured with `.convertFromSnakeCase` so the JSON mapping is
/// automatic.
struct Subscription: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let userId: UUID
    var name: String
    var amount: Decimal
    var currency: String          // ISO 4217: EUR, USD, GBP…
    var billingPeriod: BillingPeriod
    var billingIntervalCount: Int
    var nextBillingDate: Date
    var status: Status
    var category: Category
    var logoUrl: String?
    var notes: String?
    var trialEndDate: Date?
    var sharedWith: Int?
    var cardColor: String?        // Matches web card_color presets
    var createdAt: Date?
    var updatedAt: Date?

    // MARK: - Enums

    enum BillingPeriod: String, Codable, CaseIterable, Sendable {
        case monthly, yearly, weekly, quarterly

        var localizedName: String {
            switch self {
            case .monthly:   "Mensual"
            case .yearly:    "Anual"
            case .weekly:    "Semanal"
            case .quarterly: "Trimestral"
            }
        }
    }

    enum Status: String, Codable, CaseIterable, Sendable {
        case active, paused, cancelled, trial
    }

    enum Category: String, Codable, CaseIterable, Sendable {
        case streaming, music, gaming, productivity, cloud,
             finance, health, education, news, social,
             food, shopping, utilities, other

        /// SF Symbol name for this category.
        var symbolName: String {
            switch self {
            case .streaming:    "play.tv.fill"
            case .music:        "music.note"
            case .gaming:       "gamecontroller.fill"
            case .productivity: "hammer.fill"
            case .cloud:        "cloud.fill"
            case .finance:      "banknote.fill"
            case .health:       "heart.fill"
            case .education:    "graduationcap.fill"
            case .news:         "newspaper.fill"
            case .social:       "person.2.fill"
            case .food:         "fork.knife"
            case .shopping:     "bag.fill"
            case .utilities:    "wrench.and.screwdriver.fill"
            case .other:        "square.grid.2x2.fill"
            }
        }

        var localizedName: String {
            switch self {
            case .streaming:    "Streaming"
            case .music:        "Música"
            case .gaming:       "Gaming"
            case .productivity: "Productividad"
            case .cloud:        "Cloud"
            case .finance:      "Finanzas"
            case .health:       "Salud"
            case .education:    "Educación"
            case .news:         "Noticias"
            case .social:       "Social"
            case .food:         "Comida"
            case .shopping:     "Compras"
            case .utilities:    "Utilidades"
            case .other:        "Otros"
            }
        }
    }
}

// MARK: - Computed helpers

extension Subscription {
    /// Monthly-equivalent cost for comparisons across billing periods.
    var monthlyEquivalent: Decimal {
        let periods: Decimal = switch billingPeriod {
        case .weekly:    Decimal(billingIntervalCount) / Decimal(4.33)
        case .monthly:   Decimal(billingIntervalCount)
        case .quarterly: Decimal(billingIntervalCount) * 3
        case .yearly:    Decimal(billingIntervalCount) * 12
        }
        guard periods > 0 else { return amount }
        return amount / periods
    }

    /// Yearly cost for the dashboard total.
    var yearlyEquivalent: Decimal {
        monthlyEquivalent * 12
    }

    /// Days until the next billing date from today.
    var daysUntilBilling: Int {
        Calendar.current.dateComponents([.day], from: .now, to: nextBillingDate).day ?? 0
    }

    /// Whether the subscription renews within the next 7 days.
    var isRenewingSoon: Bool {
        daysUntilBilling >= 0 && daysUntilBilling <= 7
    }

    /// Progress through the current billing period (0.0 to 1.0).
    var billingProgress: Double {
        let totalDays: Double = switch billingPeriod {
        case .weekly:    7 * Double(billingIntervalCount)
        case .monthly:   30 * Double(billingIntervalCount)
        case .quarterly: 90 * Double(billingIntervalCount)
        case .yearly:    365 * Double(billingIntervalCount)
        }
        let remaining = max(0, Double(daysUntilBilling))
        let elapsed = totalDays - remaining
        return min(1.0, max(0.0, elapsed / totalDays))
    }

    /// The card color preset for this subscription.
    var colorPreset: CardColorPreset {
        CardColorPreset.preset(for: cardColor)
    }
}

// MARK: - Mock data for previews

extension Subscription {
    static let mock = Subscription(
        id: UUID(),
        userId: UUID(),
        name: "Netflix",
        amount: 12.99,
        currency: "EUR",
        billingPeriod: .monthly,
        billingIntervalCount: 1,
        nextBillingDate: Calendar.current.date(byAdding: .day, value: 5, to: .now)!,
        status: .active,
        category: .streaming,
        logoUrl: "https://cdn.simpleicons.org/netflix",
        notes: nil,
        trialEndDate: nil,
        sharedWith: nil,
        cardColor: nil,
        createdAt: .now,
        updatedAt: .now
    )

    static let mockList: [Subscription] = [
        .mock,
        .init(id: UUID(), userId: UUID(), name: "Spotify", amount: 9.99,
              currency: "EUR", billingPeriod: .monthly, billingIntervalCount: 1,
              nextBillingDate: Calendar.current.date(byAdding: .day, value: 12, to: .now)!,
              status: .active, category: .music,
              logoUrl: "https://cdn.simpleicons.org/spotify",
              cardColor: "lime"),
        .init(id: UUID(), userId: UUID(), name: "iCloud+", amount: 2.99,
              currency: "EUR", billingPeriod: .monthly, billingIntervalCount: 1,
              nextBillingDate: Calendar.current.date(byAdding: .day, value: 20, to: .now)!,
              status: .active, category: .cloud,
              logoUrl: "https://cdn.simpleicons.org/icloud",
              cardColor: "ice"),
        .init(id: UUID(), userId: UUID(), name: "ChatGPT Plus", amount: 20.00,
              currency: "USD", billingPeriod: .monthly, billingIntervalCount: 1,
              nextBillingDate: Calendar.current.date(byAdding: .day, value: 2, to: .now)!,
              status: .active, category: .productivity,
              logoUrl: "https://cdn.simpleicons.org/openai",
              cardColor: "black"),
        .init(id: UUID(), userId: UUID(), name: "YouTube Premium", amount: 11.99,
              currency: "EUR", billingPeriod: .monthly, billingIntervalCount: 1,
              nextBillingDate: Calendar.current.date(byAdding: .day, value: 15, to: .now)!,
              status: .active, category: .streaming,
              logoUrl: "https://cdn.simpleicons.org/youtube",
              cardColor: "navy"),
    ]
}
