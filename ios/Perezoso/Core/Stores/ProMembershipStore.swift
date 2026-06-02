import Foundation
import Observation
import RevenueCat

/// Observable store for the user's Perezoso Pro entitlement, sourced
/// from RevenueCat's `CustomerInfo`.
///
/// Exists alongside `AuthStore.profile.isPro` because there is no
/// RevenueCat → Supabase webhook yet. Until that lands, this store
/// is the source of truth on-device for whether the in-app paywall
/// should be shown and which features are unlocked.
@Observable
final class ProMembershipStore: @unchecked Sendable {

    /// RevenueCat entitlement identifier — must match the web
    /// (`lib/revenuecat/config.ts` → `ENTITLEMENT_PRO`) and what is
    /// configured in the RevenueCat dashboard.
    static let entitlementID = "pro"

    private(set) var isActive: Bool = false

    /// Pulls the current `CustomerInfo` and subscribes to the live
    /// stream so subsequent purchases / restores / expirations update
    /// `isActive` automatically.
    ///
    /// Must be called *after* `Purchases.configure(...)` has run.
    func bootstrap() async {
        guard !AppEnvironment.shared.isPreview else { return }

        if let info = try? await Purchases.shared.customerInfo() {
            apply(info)
        }

        Task { [weak self] in
            for await info in Purchases.shared.customerInfoStream {
                self?.apply(info)
            }
        }
    }

    /// Refresh on demand — call after a successful purchase or restore
    /// to update UI immediately without waiting for the stream.
    func refresh(with info: CustomerInfo) {
        apply(info)
    }

    private func apply(_ info: CustomerInfo) {
        let active = info.entitlements[Self.entitlementID]?.isActive == true
        Task { @MainActor in
            self.isActive = active
        }
    }
}

extension ProMembershipStore {
    static func preview(active: Bool = false) -> ProMembershipStore {
        let store = ProMembershipStore()
        store.isActive = active
        return store
    }
}
