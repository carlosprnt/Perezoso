import Testing
@testable import Perezoso

/// Placeholder unit test suite.
///
/// These tests will be fleshed out as the app's business logic
/// grows. For now they serve as a compile-time check that the
/// test target links correctly against the main module.
struct PerezosoTests {

    // MARK: - Subscription model

    @Test("Monthly equivalent for a monthly subscription equals its amount")
    func monthlyEquivalentMonthly() {
        let sub = Subscription.mock  // amount = 12.99, billingPeriod = .monthly
        #expect(sub.monthlyEquivalent == sub.amount)
    }

    @Test("Yearly equivalent is 12× the monthly equivalent")
    func yearlyEquivalent() {
        let sub = Subscription.mock
        #expect(sub.yearlyEquivalent == sub.monthlyEquivalent * 12)
    }

    @Test("daysUntilBilling is non-negative for a future next billing date")
    func daysUntilBillingNonNegative() {
        let sub = Subscription.mock  // nextBillingDate = now + 5 days
        #expect(sub.daysUntilBilling >= 0)
    }

    @Test("isRenewingSoon is true when nextBillingDate is within 7 days")
    func renewingSoon() {
        let sub = Subscription.mock  // nextBillingDate = now + 5 days
        #expect(sub.isRenewingSoon == true)
    }

    // MARK: - Currency formatter

    @Test("CurrencyFormat.string returns a non-empty string")
    func currencyFormatNonEmpty() {
        let result = CurrencyFormat.string(for: 12.99, currency: "EUR")
        #expect(!result.isEmpty)
    }

    // MARK: - Subscriptions store

    @Test("SubscriptionsStore.preview() populates mock subscriptions")
    func previewStoreHasSubscriptions() {
        let store = SubscriptionsStore.preview()
        #expect(!store.subscriptions.isEmpty)
    }

    @Test("monthlyTotal is positive when there are active subscriptions")
    func monthlyTotalPositive() {
        let store = SubscriptionsStore.preview()
        #expect(store.monthlyTotal > 0)
    }
}
