// Calendar date helpers — port of the webapp's `CalendarView.tsx`.
//
// Given a set of subscriptions and a target (year, month), compute which
// day each subscription's billing falls on inside that month. We walk
// the stored `next_billing_date` forward/backward by the full billing
// cycle (weekly 7, monthly 30, quarterly 91, yearly 365 — multiplied by
// the interval count) until we land within the target month or decide
// it doesn't touch that month at all.
//
// Note: 30 / 91 / 365 match the webapp exactly. The calendar's only
// role is "does this sub bill on day N of this month"; it's not an
// accrual engine, so day-drift across long-horizon yearly plans is
// acceptable and matches the web behavior.

import type { Subscription } from '../subscriptions/types';

const MS_PER_DAY = 86_400_000;

export function billingPeriodDays(
  period: string,
  intervalCount: number,
): number {
  const base: Record<string, number> = {
    weekly: 7,
    monthly: 30,
    quarterly: 91,
    yearly: 365,
  };
  return (base[period] ?? 30) * Math.max(1, intervalCount);
}

/** Returns the day-of-month number (1..31) this sub bills on within
 *  the given year/month, or null if it doesn't bill that month. */
export function getBillingDayInMonth(
  sub: Subscription,
  year: number,
  month: number,
): number | null {
  if (!sub.next_billing_date) return null;
  if (sub.status === 'cancelled' || sub.status === 'paused') return null;

  const [ny, nm, nd] = sub.next_billing_date.split('-').map(Number);
  let date = new Date(ny, nm - 1, nd);
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const periodDays = billingPeriodDays(
    sub.billing_period,
    sub.billing_interval_count,
  );

  while (date > monthEnd && periodDays > 0) {
    date = new Date(date.getTime() - periodDays * MS_PER_DAY);
  }
  while (date < monthStart && periodDays > 0) {
    date = new Date(date.getTime() + periodDays * MS_PER_DAY);
  }

  if (date >= monthStart && date <= monthEnd) return date.getDate();
  return null;
}

/** Bucket every sub by the day-of-month it bills in this (year, month). */
export function buildDayMap(
  subs: Subscription[],
  year: number,
  month: number,
): Record<number, Subscription[]> {
  const map: Record<number, Subscription[]> = {};
  for (const sub of subs) {
    const day = getBillingDayInMonth(sub, year, month);
    if (day !== null) {
      if (!map[day]) map[day] = [];
      map[day].push(sub);
    }
  }
  return map;
}

/** Monday-first weekday index (0=Mon … 6=Sun) for the 1st of the month. */
export function getFirstDayOfWeek(year: number, month: number): number {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril',
  'Mayo', 'Junio', 'Julio', 'Agosto',
  'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function monthLabel(year: number, month: number): string {
  return `${MONTHS_ES[month]} ${year}`;
}

export const WEEKDAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
