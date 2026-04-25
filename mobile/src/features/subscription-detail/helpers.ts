// Shared helpers for SubscriptionDetailSheet.
//
// Keeps date math, money formatting and gradient tint logic in one
// place so the view + edit components stay visual.

import { findPlatform } from '../../lib/constants/platforms';
import type { BillingPeriod, Category, Subscription } from '../subscriptions/types';
export { CATEGORY_LABELS } from '../subscriptions/types';

// ─── Date math ───────────────────────────────────────────────────────

const MONTHS_ES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

const MS_PER_DAY = 86_400_000;

/** 30 abr 2026 */
export function formatDateShort(d: Date): string {
  return `${d.getDate()} ${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`;
}

/** Midnight-aligned days between now and a target ISO string. */
export function daysUntil(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(isoDate);
  target.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / MS_PER_DAY));
}

/** Human copy: "Hoy" / "Mañana" / "En 14 días". */
export function daysLabel(days: number, t: (key: string, opts?: any) => string): string {
  if (days === 0) return t('detail.today');
  if (days === 1) return t('detail.tomorrow');
  return t('detail.inDays', { days });
}

const CYCLE_DAYS: Record<BillingPeriod, number> = {
  weekly: 7,
  monthly: 30,
  quarterly: 90,
  yearly: 365,
};

/** Total days in a billing cycle (period × interval count). */
export function cycleDays(period: BillingPeriod, interval: number): number {
  return CYCLE_DAYS[period] * Math.max(1, interval);
}

/**
 * Fraction (0..1) of the current billing cycle that has elapsed.
 * Used to draw the horizontal progress bar on the hero + detail cards.
 */
export function billingProgress(sub: Subscription): number {
  const total = cycleDays(sub.billing_period, sub.billing_interval_count);
  const left = daysUntil(sub.next_billing_date);
  const elapsed = total - left;
  return Math.max(0, Math.min(1, elapsed / total));
}

/** Previous billing date = next - one cycle length. */
export function previousBillingDate(sub: Subscription): Date {
  const next = new Date(sub.next_billing_date);
  const total = cycleDays(sub.billing_period, sub.billing_interval_count);
  const prev = new Date(next);
  prev.setDate(prev.getDate() - total);
  return prev;
}

// ─── Money formatting ────────────────────────────────────────────────

/** "3,99€" / "20,00US$". Trims trailing ",00" only when asked. */
export function formatAmount(
  amount: number,
  currency: string,
  { trimZeros = false }: { trimZeros?: boolean } = {},
): string {
  let formatted = amount.toFixed(2).replace('.', ',');
  if (trimZeros && formatted.endsWith(',00')) {
    formatted = formatted.slice(0, -3);
  }
  return currency === 'US$' ? `${formatted}US$` : `${formatted}€`;
}

/** Convert any billing period amount into its monthly equivalent. */
export function toMonthly(amount: number, period: BillingPeriod, interval: number): number {
  const perCycle = amount;
  const months = (CYCLE_DAYS[period] * Math.max(1, interval)) / 30;
  return perCycle / months;
}

/** Convert any billing period amount into its yearly equivalent. */
export function toYearly(amount: number, period: BillingPeriod, interval: number): number {
  return toMonthly(amount, period, interval) * 12;
}

// ─── Labels ──────────────────────────────────────────────────────────

export const BILLING_PERIOD_LABELS: Record<BillingPeriod, string> = {
  monthly: 'Mensual',
  yearly: 'Anual',
  quarterly: 'Trimestral',
  weekly: 'Semanal',
};

export const BILLING_PERIOD_LABEL_KEYS: Record<BillingPeriod, string> = {
  monthly: 'detail.billing.monthly',
  yearly: 'detail.billing.yearly',
  quarterly: 'detail.billing.quarterly',
  weekly: 'detail.billing.weekly',
};

export const BILLING_SUFFIX: Record<BillingPeriod, string> = {
  monthly: '/mes',
  yearly: '/año',
  quarterly: '/trimestre',
  weekly: '/semana',
};

export const BILLING_SUFFIX_KEYS: Record<BillingPeriod, string> = {
  monthly: 'detail.billingSuffix.monthly',
  yearly: 'detail.billingSuffix.yearly',
  quarterly: 'detail.billingSuffix.quarterly',
  weekly: 'detail.billingSuffix.weekly',
};

// ─── Tint / gradient ─────────────────────────────────────────────────

/**
 * Soft blue-gray fallback for subs that have no logo or no known
 * predominant brand color. Matches the calm "system card" backdrop
 * Apple uses for Wallet items without their own accent.
 */
export const FALLBACK_TINT_BLUE_GRAY = '#DCE4ED';

/**
 * Try to determine the predominant color of a subscription's logo.
 *
 * We can't sample pixels from a remote image in Expo Go without a
 * native module, so instead we look the service up in the platform
 * catalog (`mobile/src/lib/constants/platforms.ts`) which already
 * ships hand-picked `brandColor` values for well-known services.
 *
 * Returns `null` when either:
 *   · the sub has no logo at all, or
 *   · the logo exists but we don't know a brand color for it.
 *
 * Callers should fall back to `FALLBACK_TINT_BLUE_GRAY` in that case.
 */
export function dominantLogoColor(sub: Subscription): string | null {
  // No logo at all ⇒ no brand color to show
  if (!sub.logo_url) return null;
  const platform = findPlatform(sub.name);
  return platform?.brandColor ?? null;
}

/**
 * Pick the hero-zone tint for a subscription. Falls back to a soft
 * blue-gray when we can't determine the logo's predominant color.
 */
export function subscriptionTint(sub: Subscription): string {
  return dominantLogoColor(sub) ?? FALLBACK_TINT_BLUE_GRAY;
}

/**
 * Gradient stops for the hero header — very subtle tint at the top,
 * fading down to full transparency. Combined with a BlurView on top,
 * this produces a soft, atmospheric color wash rather than a hard
 * color band. The `sheetBg` arg is kept for API compatibility but no
 * longer used — the gradient ends in transparent so whatever surface
 * is underneath shows through cleanly.
 */
export function heroGradientColors(
  sub: Subscription,
  _sheetBg: string,
): [string, string, string] {
  const tint = subscriptionTint(sub);
  return [withAlpha(tint, 0.22), withAlpha(tint, 0.06), withAlpha(tint, 0)];
}

/** Apply an alpha channel to an `#rrggbb` hex string. */
export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// ─── Category dropdown options ──────────────────────────────────────

export const CATEGORY_PICKER: { value: Category; labelKey: string }[] = [
  { value: 'streaming', labelKey: 'category.streaming' },
  { value: 'music', labelKey: 'category.music' },
  { value: 'productivity', labelKey: 'category.productivity' },
  { value: 'cloud', labelKey: 'category.cloud' },
  { value: 'ai', labelKey: 'category.ai' },
  { value: 'health', labelKey: 'category.health' },
  { value: 'gaming', labelKey: 'category.gaming' },
  { value: 'education', labelKey: 'category.education' },
  { value: 'mobility', labelKey: 'category.mobility' },
  { value: 'home', labelKey: 'category.home' },
  { value: 'other', labelKey: 'category.other' },
];

export const BILLING_PERIOD_PICKER: { value: BillingPeriod; label: string }[] = [
  { value: 'monthly', label: 'Mensual' },
  { value: 'yearly', label: 'Anual' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'weekly', label: 'Semanal' },
];
