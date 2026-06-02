// Calendar-correct billing cycle math.
//
// Used by `advanceRenewalDate` (subscriptions store, derive cards/detail/
// notifications) and by `getBillingDayInMonth` (calendar grid). Both need
// to walk a sub's billing date forward or backward by exact calendar
// periods (not approximate 30/91/365-day windows) while preserving the
// user's preferred day-of-month — clamping to the last day of the
// destination month when it's shorter (29/30/31 → 28/29/30) without
// losing the preference for subsequent cycles.

import type { BillingPeriod } from '../../features/subscriptions/types';

/** Last day-of-month for a given (year, absoluteMonth). `mAbs` can be
 *  out of range (e.g. 13 or -1); Date constructor handles wrap-around. */
export function lastDayOfMonth(y: number, mAbs: number): number {
  return new Date(y, mAbs + 1, 0).getDate();
}

/** Build a Date at the preferred day-of-month, clamped to the last day
 *  of the target month if shorter. The user's "31" preference returns
 *  the 31st in long months and the last day in short ones. */
export function clampToMonth(y: number, mAbs: number, preferredDay: number): Date {
  const last = lastDayOfMonth(y, mAbs);
  return new Date(y, mAbs, Math.min(preferredDay, last));
}

/** Move a date forward (direction = +1) or backward (direction = -1) by
 *  one full billing cycle, preserving the user's preferred day. */
export function shiftByCycle(
  date: Date,
  period: BillingPeriod | string,
  intervalCount: number,
  preferredDay: number,
  direction: 1 | -1,
): Date {
  const n = Math.max(1, intervalCount) * direction;
  const y = date.getFullYear();
  const m = date.getMonth();
  switch (period) {
    case 'weekly':
      return new Date(y, m, date.getDate() + 7 * n);
    case 'monthly':
      return clampToMonth(y, m + n, preferredDay);
    case 'quarterly':
      return clampToMonth(y, m + 3 * n, preferredDay);
    case 'yearly':
      return clampToMonth(y + n, m, preferredDay);
    default:
      return clampToMonth(y, m + n, preferredDay);
  }
}
