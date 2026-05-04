import Foundation

// MARK: - Widget localization
// Mirrors the app's es/en translations for widget-visible strings.

enum WidgetStrings {
    private static var isSpanish: Bool {
        let lang = Locale.current.language.languageCode?.identifier ?? "es"
        return lang == "es"
    }

    // Next Payment Widget
    static var noSubscriptions: String { isSpanish ? "No hay suscripciones" : "No subscriptions" }
    static var nextPaymentTitle: String { isSpanish ? "Próximo cobro" : "Next payment" }
    static var nextPaymentDesc: String { isSpanish ? "Tu próxima suscripción a pagar." : "Your next subscription payment." }

    // Monthly Spend Widget
    static var monthlySpendHeader: String { isSpanish ? "GASTO MENSUAL" : "MONTHLY SPEND" }
    static var perMonth: String { isSpanish ? "/mes" : "/mo" }
    static func activeSubscriptions(_ count: Int) -> String {
        if isSpanish {
            return "\(count) suscripciones activas"
        } else {
            return "\(count) active subscription\(count == 1 ? "" : "s")"
        }
    }
    static var monthlySpendTitle: String { isSpanish ? "Gasto mensual" : "Monthly spend" }
    static var monthlySpendDesc: String { isSpanish ? "Tu gasto total mensual en suscripciones." : "Your total monthly subscription spending." }

    // Upcoming List Widget
    static var upcomingHeader: String { isSpanish ? "PRÓXIMOS 3 COBROS" : "UPCOMING 3 PAYMENTS" }
    static var noUpcoming: String { isSpanish ? "No hay suscripciones próximas" : "No upcoming subscriptions" }
    static var upcomingTitle: String { isSpanish ? "Próximos cobros" : "Upcoming payments" }
    static var upcomingDesc: String { isSpanish ? "Tus próximos 3 cobros." : "Your next 3 upcoming payments." }

    // Days
    static func daysText(_ days: Int) -> String {
        switch days {
        case 0: return isSpanish ? "Hoy" : "Today"
        case 1: return isSpanish ? "Mañana" : "Tomorrow"
        default: return isSpanish ? "En \(days) días" : "In \(days) days"
        }
    }
}
