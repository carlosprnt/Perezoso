// Derive dashboard data from the current subscriptions list.
//
// The dashboard used to render hand-authored mock arrays (MOCK_STATS,
// MOCK_RENEWALS, …). With the Demo presets in place we need everything
// to react to the selected state, so these selectors compute the same
// shapes from a Subscription[] on the fly. Pure functions → safe to
// call inside `useMemo` / Zustand selectors.

import type { Subscription } from '../subscriptions/types';
import { toMonthly } from '../subscription-detail/helpers';
import type {
  CategoryRow,
  DashboardStats,
  TopSubscription,
  UpcomingRenewal,
} from './types';

const MS_PER_DAY = 86_400_000;

function daysUntil(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / MS_PER_DAY));
}

function activeOnly(subs: Subscription[]): Subscription[] {
  return subs.filter((s) => s.status === 'active');
}

// ─── Stats (headline totals) ────────────────────────────────────────
export function deriveStats(subs: Subscription[], currency = 'EUR'): DashboardStats {
  const active = activeOnly(subs);

  const monthlyTotal = active.reduce((sum, s) => sum + s.my_monthly_cost, 0);
  const annualTotal  = monthlyTotal * 12;

  const sharedCount = active.filter((s) => s.is_shared).length;

  const savingsMonthly = active
    .filter((s) => s.is_shared)
    .reduce((sum, s) => sum + Math.max(0, s.monthly_equivalent_cost - s.my_monthly_cost), 0);

  return {
    monthlyTotal,
    annualTotal,
    totalCount: active.length,
    sharedCount,
    savingsMonthly,
    currency,
  };
}

// ─── Upcoming renewals (next 3 by date) ─────────────────────────────
export function deriveRenewals(subs: Subscription[]): UpcomingRenewal[] {
  return activeOnly(subs)
    .map((s) => ({
      id: s.id,
      name: s.name,
      logoUrl: s.logo_url,
      simpleIconSlug: null,
      monthlyCost: s.my_monthly_cost,
      currency: s.currency,
      daysUntilRenewal: daysUntil(s.next_billing_date),
    }))
    .sort((a, b) => a.daysUntilRenewal - b.daysUntilRenewal)
    .slice(0, 3);
}

// ─── Top expensive (by monthly-equivalent cost) ─────────────────────
export function deriveTopExpensive(subs: Subscription[]): TopSubscription[] {
  return activeOnly(subs)
    .map((s) => ({
      id: s.id,
      name: s.name,
      logoUrl: s.logo_url,
      simpleIconSlug: null,
      monthlyCost: toMonthly(s.price_amount, s.billing_period, s.billing_interval_count),
      currency: s.currency,
      category: s.category,
      isShared: s.is_shared,
      sharedCost: s.my_monthly_cost,
    }))
    .sort((a, b) => b.monthlyCost - a.monthlyCost)
    .slice(0, 3);
}

// ─── Category breakdown (for TopCategories card) ────────────────────
export function deriveCategories(subs: Subscription[]): CategoryRow[] {
  const active = activeOnly(subs);
  const total = active.reduce((sum, s) => sum + s.my_monthly_cost, 0) || 1;

  const byCat = new Map<string, number>();
  for (const s of active) {
    byCat.set(s.category, (byCat.get(s.category) ?? 0) + s.my_monthly_cost);
  }

  return Array.from(byCat.entries())
    .map(([category, monthlyCost]) => ({
      category,
      monthlyCost,
      pct: Math.round((monthlyCost / total) * 100),
    }))
    .sort((a, b) => b.monthlyCost - a.monthlyCost)
    .slice(0, 5);
}

// ─── Highest-cost single subscription ───────────────────────────────
export function deriveHighestCost(subs: Subscription[]): TopSubscription | null {
  const top = deriveTopExpensive(subs);
  return top[0] ?? null;
}

// ─── Top category summary for the InsightCards row ──────────────────
const CATEGORY_LABELS: Record<string, string> = {
  streaming: 'Streaming',
  music: 'Música',
  productivity: 'Productividad',
  cloud: 'Cloud',
  ai: 'IA',
  health: 'Salud',
  gaming: 'Gaming',
  education: 'Educación',
  mobility: 'Movilidad',
  home: 'Hogar',
  other: 'Otros',
};

export function deriveTopCategory(subs: Subscription[], currency = 'EUR'): {
  name: string;
  category: string;
  monthlyCost: number;
  currency: string;
  count: number;
} | null {
  const cats = deriveCategories(subs);
  if (cats.length === 0) return null;
  const top = cats[0];
  const count = activeOnly(subs).filter((s) => s.category === top.category).length;
  return {
    name: CATEGORY_LABELS[top.category] ?? top.category,
    category: top.category,
    monthlyCost: top.monthlyCost,
    currency,
    count,
  };
}

// ─── Hero logo strip ────────────────────────────────────────────────
export function deriveLogoUrls(subs: Subscription[]): string[] {
  return activeOnly(subs)
    .map((s) => s.logo_url)
    .filter((u): u is string => !!u)
    .slice(0, 10);
}

export function deriveSharedLogoUrls(subs: Subscription[]): string[] {
  return activeOnly(subs)
    .filter((s) => s.is_shared)
    .map((s) => s.logo_url)
    .filter((u): u is string => !!u);
}
