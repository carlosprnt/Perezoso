import type { SubscriptionWithCosts, Category } from '@/types'

export type SavingsOpportunityType =
  | 'switch_to_yearly'
  | 'duplicate_category'
  | 'shared_plan'
  | 'bundle'

export interface SavingsOpportunity {
  type: SavingsOpportunityType
  subscriptionName?: string
  subscriptionNames?: string[]
  category?: Category
  estimatedMonthlySaving: number
  currency: string
}

// Categories where family/shared plans are common
const SHARED_PLAN_CATEGORIES: Category[] = ['streaming', 'music', 'gaming', 'cloud']

// Known bundle combinations — matched by substring (case-insensitive)
const BUNDLES = [
  { id: 'apple_one',    terms: ['apple tv', 'apple music', 'icloud'],         bundleName: 'Apple One' },
  { id: 'ms365',        terms: ['onedrive', 'office 365', 'microsoft 365'],    bundleName: 'Microsoft 365' },
  { id: 'google_one',   terms: ['google one', 'youtube premium', 'google workspace'], bundleName: 'Google One' },
]

function dominantCurrency(subs: SubscriptionWithCosts[]): string {
  const counts: Record<string, number> = {}
  for (const s of subs) counts[s.currency] = (counts[s.currency] ?? 0) + 1
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'EUR'
}

export function detectSavingsOpportunities(
  subs: SubscriptionWithCosts[]
): SavingsOpportunity[] {
  const active = subs.filter(s => s.status === 'active' || s.status === 'trial')
  if (active.length === 0) return []

  const currency = dominantCurrency(active)
  const opportunities: SavingsOpportunity[] = []

  // ── 1. Switch to yearly ────────────────────────────────────────────────────
  // Most expensive monthly-billed subscription. Estimate ~2 months free/year.
  const monthlySubs = active.filter(s => s.billing_period === 'monthly')
  if (monthlySubs.length > 0) {
    const top = monthlySubs.reduce((a, b) => a.my_monthly_cost > b.my_monthly_cost ? a : b)
    const saving = (top.my_monthly_cost * 2) / 12   // ≈16.7%
    if (saving > 0.49) {
      opportunities.push({
        type: 'switch_to_yearly',
        subscriptionName: top.name,
        estimatedMonthlySaving: saving,
        currency: top.currency,
      })
    }
  }

  // ── 2. Duplicate category ──────────────────────────────────────────────────
  // Category with 2+ active subs. Saving = cheapest sub's cost (cancel it).
  const catMap = new Map<Category, SubscriptionWithCosts[]>()
  for (const sub of active) {
    const arr = catMap.get(sub.category) ?? []
    arr.push(sub)
    catMap.set(sub.category, arr)
  }
  let bestDup: { category: Category; subs: SubscriptionWithCosts[]; saving: number } | null = null
  for (const [cat, catSubs] of catMap) {
    if (catSubs.length < 2) continue
    const sorted = [...catSubs].sort((a, b) => a.my_monthly_cost - b.my_monthly_cost)
    const saving = sorted[0].my_monthly_cost
    if (!bestDup || saving > bestDup.saving) {
      bestDup = { category: cat, subs: catSubs, saving }
    }
  }
  if (bestDup) {
    opportunities.push({
      type: 'duplicate_category',
      category: bestDup.category,
      subscriptionNames: bestDup.subs.map(s => s.name),
      estimatedMonthlySaving: bestDup.saving,
      currency,
    })
  }

  // ── 3. Shared plan ─────────────────────────────────────────────────────────
  // Most expensive non-shared sub in a shareable category.
  const shareableSubs = active.filter(
    s => !s.is_shared && SHARED_PLAN_CATEGORIES.includes(s.category)
  )
  if (shareableSubs.length > 0) {
    const top = shareableSubs.reduce((a, b) => a.my_monthly_cost > b.my_monthly_cost ? a : b)
    const saving = top.my_monthly_cost * 0.5  // 50% off if split with 1 other
    if (saving > 0.49) {
      opportunities.push({
        type: 'shared_plan',
        subscriptionName: top.name,
        category: top.category,
        estimatedMonthlySaving: saving,
        currency: top.currency,
      })
    }
  }

  // ── 4. Bundle ──────────────────────────────────────────────────────────────
  for (const bundle of BUNDLES) {
    const matched = active.filter(sub =>
      bundle.terms.some(term => sub.name.toLowerCase().includes(term))
    )
    if (matched.length >= 2) {
      const totalCost = matched.reduce((sum, s) => sum + s.my_monthly_cost, 0)
      const saving = totalCost * 0.2  // ~20% bundle discount
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
