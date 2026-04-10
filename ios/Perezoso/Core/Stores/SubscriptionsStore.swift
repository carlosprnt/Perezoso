import Foundation
import Observation

/// Observable store for the user's subscriptions.
///
/// Fetches from Supabase, caches in memory, provides computed
/// aggregations (monthly total, upcoming renewals, category
/// breakdown, etc.) that the dashboard and list views consume.
@Observable
final class SubscriptionsStore: @unchecked Sendable {

    // MARK: - State

    private(set) var subscriptions: [Subscription] = []
    private(set) var isLoading = false
    private(set) var error: String?

    // MARK: - Computed

    var activeSubscriptions: [Subscription] {
        subscriptions.filter { $0.status == .active || $0.status == .trial }
    }

    var monthlyTotal: Decimal {
        activeSubscriptions.reduce(0) { $0 + $1.monthlyEquivalent }
    }

    var yearlyTotal: Decimal {
        monthlyTotal * 12
    }

    var upcomingRenewals: [Subscription] {
        activeSubscriptions
            .filter { $0.daysUntilBilling >= 0 && $0.daysUntilBilling <= 30 }
            .sorted { $0.nextBillingDate < $1.nextBillingDate }
    }

    var renewingSoon: [Subscription] {
        activeSubscriptions.filter(\.isRenewingSoon)
    }

    var byCategory: [Subscription.Category: [Subscription]] {
        Dictionary(grouping: activeSubscriptions, by: \.category)
    }

    // MARK: - CRUD

    func fetch() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil
        do {
            subscriptions = try await SupabaseManager.client
                .from("subscriptions")
                .select()
                .order("next_billing_date", ascending: true)
                .execute()
                .value
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func create(_ subscription: Subscription) async throws {
        try await SupabaseManager.client
            .from("subscriptions")
            .insert(subscription)
            .execute()
        await fetch()
    }

    func update(_ subscription: Subscription) async throws {
        try await SupabaseManager.client
            .from("subscriptions")
            .update(subscription)
            .eq("id", value: subscription.id.uuidString)
            .execute()
        await fetch()
    }

    func delete(id: UUID) async throws {
        try await SupabaseManager.client
            .from("subscriptions")
            .delete()
            .eq("id", value: id.uuidString)
            .execute()
        subscriptions.removeAll { $0.id == id }
    }
}

// MARK: - Preview helpers

extension SubscriptionsStore {
    static func preview() -> SubscriptionsStore {
        let store = SubscriptionsStore()
        store.subscriptions = Subscription.mockList
        return store
    }
}
