import type { SubscriptionWithCosts, Category } from '@/types'

export type SavingsOpportunityType =
  | 'switch_to_yearly'
  | 'duplicate_category'
  | 'shared_plan'
  | 'bundle'

export interface SavingsOpportunity {
  type: SavingsOpportunityType
  // Per-subscription opportunities
  subscriptionName?: string
  subscriptionLogoUrl?: string | null
  currentMonthlyCost?: number
  // Multi-subscription opportunities
  subscriptionNames?: string[]
  subscriptionCount?: number
  category?: Category
  // switch_to_yearly: percentage saving
  savingPct?: number
  // Always present
  estimatedMonthlySaving: number
  currency: string
}

/**
 * Returns how many annual subscriptions have no reminder set.
 * We treat all annual subs as "without reminder" since the app doesn't
 * yet persist reminder state to the database.
 */
export function countAnnualRenewalsWithoutReminder(subs: SubscriptionWithCosts[]): number {
  return subs.filter(
    s => (s.status === 'active' || s.status === 'trial') && s.billing_period === 'yearly'
  ).length
}

// Categories where family/shared plans are common
const SHARED_PLAN_CATEGORIES: Category[] = ['streaming', 'music', 'gaming', 'cloud']

// Known bundle combinations — matched by substring (case-insensitive)
const BUNDLES = [
  { id: 'apple_one',  terms: ['apple tv', 'apple music', 'icloud'],                   bundleName: 'Apple One' },
  { id: 'ms365',      terms: ['onedrive', 'office 365', 'microsoft 365'],              bundleName: 'Microsoft 365' },
  { id: 'google_one', terms: ['google one', 'youtube premium', 'google workspace'],    bundleName: 'Google One' },
]

function dominantCurrency(subs: SubscriptionWithCosts[]): string {
  const counts: Record<string, number> = {}
  for (const s of subs) counts[s.currency] = (counts[s.currency] ?? 0) + 1
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'EUR'
}

/**
 * Returns ALL savings opportunities, one per subscription/category/bundle.
 * Sorted by estimated monthly saving (highest first).
 */
export function detectSavingsOpportunities(
  subs: SubscriptionWithCosts[]
): SavingsOpportunity[] {
  const active = subs.filter(s => s.status === 'active' || s.status === 'trial')
  if (active.length === 0) return []

  const currency = dominantCurrency(active)
  const opportunities: SavingsOpportunity[] = []

  // ── 1. Switch to yearly — one card per monthly-billed subscription ─────────
  const monthlySubs = active.filter(s => s.billing_period === 'monthly')
  for (const sub of monthlySubs) {
    const saving = (sub.my_monthly_cost * 2) / 12   // ~2 months free/year ≈ 16.7%
    const savingPct = Math.round((saving / sub.my_monthly_cost) * 100)
    if (saving > 0.49) {
      opportunities.push({
        type: 'switch_to_yearly',
        subscriptionName: sub.name,
        subscriptionLogoUrl: sub.logo_url,
        currentMonthlyCost: sub.my_monthly_cost,
        estimatedMonthlySaving: saving,
        savingPct,
        currency: sub.currency,
      })
    }
  }

  // ── 2. Duplicate category — removed ────────────────────────────────────────

  // ── 3. Shared plan — one card per non-shared shareable subscription ─────────
  const shareableSubs = active.filter(
    s => !s.is_shared && SHARED_PLAN_CATEGORIES.includes(s.category)
  )
  for (const sub of shareableSubs) {
    const saving = sub.my_monthly_cost * 0.5   // 50% off if split with 1 person
    if (saving > 0.49) {
      opportunities.push({
        type: 'shared_plan',
        subscriptionName: sub.name,
        subscriptionLogoUrl: sub.logo_url,
        currentMonthlyCost: sub.my_monthly_cost,
        category: sub.category,
        estimatedMonthlySaving: saving,
        currency: sub.currency,
      })
    }
  }

  // ── 4. Bundle — one card per detected bundle combination ────────────────────
  for (const bundle of BUNDLES) {
    const matched = active.filter(sub =>
      bundle.terms.some(term => sub.name.toLowerCase().includes(term))
    )
    if (matched.length >= 2) {
      const totalCost = matched.reduce((sum, s) => sum + s.my_monthly_cost, 0)
      const saving = totalCost * 0.2    // ~20% bundle discount
      if (saving > 0.49) {
        opportunities.push({
          type: 'bundle',
          subscriptionNames: matched.map(s => s.name),
          estimatedMonthlySaving: saving,
          currency,
        })
      }
    }
  }

  // Highest estimated saving first
  return opportunities.sort((a, b) => b.estimatedMonthlySaving - a.estimatedMonthlySaving)
}

export function getBestSavingsOpportunity(subs: SubscriptionWithCosts[]): SavingsOpportunity | null {
  return detectSavingsOpportunities(subs)[0] ?? null
}
