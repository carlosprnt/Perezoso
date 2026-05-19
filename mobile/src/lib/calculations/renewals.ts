// Renewal helpers: auto-advance `next_billing_date` for subscriptions
// whose stored date has fallen into the past.
//
// Background: when a subscription renews, the row in the DB still has
// the old `next_billing_date`. Until the user (or a server job) bumps
// it, every read returns a date that's already gone. That breaks:
//   · Sort by next-renewal (past dates float to the top)
//   · "Renueva en X días" (returns 0 → "Hoy")
//   · The progress bar in WalletCard (renders full)
//
// Fix: on read, advance any past `next_billing_date` forward by
// successive billing periods until it lands in the future. Memory-only
// — we don't write back to Supabase, the next real renewal write
// happens server-side or via the user's edits.

import type { BillingPeriod, Subscription } from '../../features/subscriptions/types';
import { toLocalYMD } from '../formatting';

function addPeriod(date: Date, period: BillingPeriod, count: number): Date {
  const next = new Date(date);
  const n = Math.max(1, count);
  switch (period) {
    case 'weekly':
      next.setDate(next.getDate() + 7 * n);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1 * n);
      break;
    case 'quarterly':
      next.setMonth(next.getMonth() + 3 * n);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1 * n);
      break;
  }
  return next;
}

/** Return a copy of `sub` with `next_billing_date` advanced into the future
 * if it has fallen behind. No-op for paused/cancelled/ended subs or for
 * dates already today or later. */
export function advanceRenewalDate(sub: Subscription): Subscription {
  if (!sub.next_billing_date) return sub;
  if (sub.status !== 'active' && sub.status !== 'trial') return sub;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let next = new Date(sub.next_billing_date);
  next.setHours(0, 0, 0, 0);

  if (next.getTime() >= today.getTime()) return sub;

  const interval = Math.max(1, sub.billing_interval_count ?? 1);
  let safety = 0;
  while (next.getTime() < today.getTime() && safety < 1000) {
    next = addPeriod(next, sub.billing_period, interval);
    safety++;
  }

  return { ...sub, next_billing_date: toLocalYMD(next) };
}

export function advanceAllRenewals(subs: Subscription[]): Subscription[] {
  return subs.map(advanceRenewalDate);
}

/** Return the next billing date a sub WOULD have right now, rolling
 * past dates forward by their billing period. Use this at sort/render
 * time so the UI is correct even if the store snapshot was loaded
 * days ago and a renewal has since passed without a reload. */
export function effectiveNextBillingDate(sub: Subscription): string {
  return advanceRenewalDate(sub).next_billing_date;
}
