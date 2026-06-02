// Calendar date helpers — figure out which day of a given (year, month)
// a subscription bills on by walking its `next_billing_date` forward or
// backward by full billing cycles.
//
// We use calendar-correct cycle math (`shiftByCycle`) so 29/30/31
// renewals don't drift — a sub that bills on the 11th shows up on the
// 11th of every month, and a sub on the 31st clamps to the 30th in
// 30-day months while returning to the 31st in 31-day months.

import type { Subscription } from '../subscriptions/types';
import { shiftByCycle } from '../../lib/calculations/billingCycle';

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
  if (!ny || !nm || !nd) return null;

  const preferredDay = sub.preferred_billing_day ?? nd;
  let date = new Date(ny, nm - 1, nd);
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const interval = Math.max(1, sub.billing_interval_count ?? 1);

  let safety = 0;
  while (date > monthEnd && safety < 1000) {
    date = shiftByCycle(date, sub.billing_period, interval, preferredDay, -1);
    safety++;
  }
  while (date < monthStart && safety < 1000) {
    date = shiftByCycle(date, sub.billing_period, interval, preferredDay, 1);
    safety++;
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
