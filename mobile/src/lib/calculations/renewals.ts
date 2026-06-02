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
//
// Day-of-month preservation: each subscription carries a
// `preferred_billing_day` (the day the user chose when creating or
// editing it). For 29/30/31 subscriptions in short months we clamp to
// the last day of the destination month but keep the preference, so
// the cycle returns to 31 in months that have 31 days. Legacy rows
// without the column fall back to the day component of the stored
// `next_billing_date`.

import type { Subscription } from '../../features/subscriptions/types';
import { toLocalYMD } from '../formatting';
import { shiftByCycle } from './billingCycle';

/** Return a copy of `sub` with `next_billing_date` advanced into the future
 * if it has fallen behind. No-op for paused/cancelled subs or for
 * dates already today or later. */
export function advanceRenewalDate(sub: Subscription): Subscription {
  if (!sub.next_billing_date) return sub;
  if (sub.status !== 'active' && sub.status !== 'trial') return sub;

  const [yOrig, mOrig, dOrig] = sub.next_billing_date.split('-').map(Number);
  if (!yOrig || !mOrig || !dOrig) return sub;

  const preferredDay = sub.preferred_billing_day ?? dOrig;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let next = new Date(yOrig, mOrig - 1, dOrig);
  if (next.getTime() >= today.getTime()) return sub;

  const interval = Math.max(1, sub.billing_interval_count ?? 1);
  let safety = 0;
  while (next.getTime() < today.getTime() && safety < 1000) {
    next = shiftByCycle(next, sub.billing_period, interval, preferredDay, 1);
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
