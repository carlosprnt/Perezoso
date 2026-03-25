import type {
  Subscription,
  SubscriptionWithCosts,
  CategoryBreakdown,
  UpcomingRenewal,
  DashboardStats,
  Category,
} from '@/types'

// ============================================================
// MONTHLY EQUIVALENT COST
// ============================================================

/**
 * Converts any billing period to its monthly equivalent.
 * All math is done in the subscription's native currency.
 */
export function getMonthlyEquivalentCost(sub: Subscription): number {
  const { price_amount, billing_period, billing_interval_count } = sub

  switch (billing_period) {
    case 'monthly':
      return price_amount
    case 'yearly':
      return price_amount / 12
    case 'quarterly':
      return price_amount / 3
    case 'weekly':
      // 52 weeks / 12 months
      return (price_amount * 52) / 12
    case 'custom': {
      // billing_interval_count represents the number of months in the custom cycle
      const months = billing_interval_count ?? 1
      return price_amount / months
    }
    default:
      return price_amount
  }
}

// ============================================================
// ANNUAL EQUIVALENT COST
// ============================================================

export function getAnnualEquivalentCost(sub: Subscription): number {
  return getMonthlyEquivalentCost(sub) * 12
}

// ============================================================
// USER'S PERSONAL SHARE
// ============================================================

/**
 * Returns what the user personally pays per month.
 * Respects split_evenly vs custom share modes.
 */
export function getUserMonthlyCost(sub: Subscription): number {
  const monthly = getMonthlyEquivalentCost(sub)

  if (!sub.is_shared) return monthly

  if (sub.user_share_mode === 'split_evenly') {
    const count = Math.max(sub.shared_with_count ?? 2, 2)
    return monthly / count
  }

  // custom: user_share_amount is the raw amount per billing period
  if (sub.user_share_amount != null) {
    // Normalize custom amount to monthly using same billing period
    const customSub = { ...sub, price_amount: sub.user_share_amount }
    return getMonthlyEquivalentCost(customSub)
  }

  return monthly
}

export function getUserAnnualCost(sub: Subscription): number {
  return getUserMonthlyCost(sub) * 12
}

// ============================================================
// ENRICHED SUBSCRIPTION (adds all computed fields)
// ============================================================

export function enrichSubscription(sub: Subscription): SubscriptionWithCosts {
  return {
    ...sub,
    monthly_equivalent_cost: getMonthlyEquivalentCost(sub),
    annual_equivalent_cost:  getAnnualEquivalentCost(sub),
    my_monthly_cost:         getUserMonthlyCost(sub),
    my_annual_cost:          getUserAnnualCost(sub),
  }
}

export function enrichSubscriptions(subs: Subscription[]): SubscriptionWithCosts[] {
  return subs.map(enrichSubscription)
}

// ============================================================
// DASHBOARD STATS
// ============================================================

export function getDashboardStats(subs: SubscriptionWithCosts[]): DashboardStats {
  const active = subs.filter((s) => s.status === 'active' || s.status === 'trial')

  return {
    total_monthly_cost:  active.reduce((acc, s) => acc + s.my_monthly_cost, 0),
    total_annual_cost:   active.reduce((acc, s) => acc + s.my_annual_cost, 0),
    active_count:        subs.filter((s) => s.status === 'active').length,
    trial_count:         subs.filter((s) => s.status === 'trial').length,
    paused_count:        subs.filter((s) => s.status === 'paused').length,
    shared_monthly_cost: active
      .filter((s) => s.is_shared)
      .reduce((acc, s) => acc + s.my_monthly_cost, 0),
  }
}

// ============================================================
// UPCOMING RENEWALS
// ============================================================

export function getUpcomingRenewals(
  subs: SubscriptionWithCosts[],
  withinDays = 30
): UpcomingRenewal[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return subs
    .filter((s) => s.status === 'active' || s.status === 'trial')
    .filter((s) => s.next_billing_date != null)
    .map((s) => {
      const billing = new Date(s.next_billing_date!)
      billing.setHours(0, 0, 0, 0)
      const diffMs = billing.getTime() - today.getTime()
      const days_until = Math.round(diffMs / (1000 * 60 * 60 * 24))
      return { subscription: s, days_until }
    })
    .filter((r) => r.days_until >= 0 && r.days_until <= withinDays)
    .sort((a, b) => a.days_until - b.days_until)
    .map((r) => ({
      ...r,
      label:
        r.days_until === 0
          ? 'today'
          : r.days_until <= 7
          ? 'this_week'
          : 'this_month',
    })) as UpcomingRenewal[]
}

// ============================================================
// CATEGORY AGGREGATION
// ============================================================

export function groupSubscriptionsByCategory(
  subs: SubscriptionWithCosts[]
): Map<Category, SubscriptionWithCosts[]> {
  const map = new Map<Category, SubscriptionWithCosts[]>()
  for (const sub of subs) {
    const existing = map.get(sub.category) ?? []
    map.set(sub.category, [...existing, sub])
  }
  return map
}

export function getTopSpendCategories(
  subs: SubscriptionWithCosts[],
  limit = 5
): CategoryBreakdown[] {
  const active = subs.filter((s) => s.status === 'active' || s.status === 'trial')
  const grouped = groupSubscriptionsByCategory(active)

  return Array.from(grouped.entries())
    .map(([category, items]) => ({
      category,
      monthly_cost: items.reduce((acc, s) => acc + s.my_monthly_cost, 0),
      count: items.length,
    }))
    .sort((a, b) => b.monthly_cost - a.monthly_cost)
    .slice(0, limit)
}

export function getHighestCostSubscription(
  subs: SubscriptionWithCosts[]
): SubscriptionWithCosts | null {
  const active = subs.filter((s) => s.status === 'active' || s.status === 'trial')
  if (active.length === 0) return null
  return active.reduce((max, s) =>
    s.my_monthly_cost > max.my_monthly_cost ? s : max
  )
}
