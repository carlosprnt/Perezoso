// Builds the virtual Subscription object that represents the user's
// Perezoso Pro plan inside the Suscripciones list. The card is rendered
// by `PerezosoProCard` with a holographic background, but it reuses
// the normal `SubscriptionDetailSheet` on tap — so it has to look like
// a `Subscription` to the rest of the app. We tag it with a fixed id
// so the sheet can detect the special case and swap destructive
// actions for a "Gestionar suscripción" CTA.

import type { ProPlan } from '../../services/purchases';
import type { Subscription } from './types';

export const PEREZOSO_PRO_ID = '__perezoso_pro__';

export const PEREZOSO_PRO_PRICES = {
  monthly: 2.99,
  annual: 19.99,
} as const;

export function isPerezosoProSub(s: { id: string } | null | undefined): boolean {
  return !!s && s.id === PEREZOSO_PRO_ID;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Compute the next renewal date: purchaseDate + N months, rolled
 *  forward by the billing period until it lands strictly in the future. */
function computeNextBillingDate(purchaseDate: string, plan: ProPlan): string {
  const step = plan === 'annual' ? 12 : 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let next = new Date(purchaseDate);
  if (Number.isNaN(next.getTime())) next = new Date();
  next.setHours(0, 0, 0, 0);

  let safety = 0;
  while (next.getTime() <= today.getTime() && safety < 240) {
    next = addMonths(next, step);
    safety++;
  }
  return toYMD(next);
}

export function buildProSubscription(args: {
  plan: ProPlan;
  purchaseDate: string;
  currency: string;
}): Subscription {
  const price = PEREZOSO_PRO_PRICES[args.plan];
  const billing_period = args.plan === 'annual' ? 'yearly' : 'monthly';
  const monthly = args.plan === 'annual' ? price / 12 : price;
  return {
    id: PEREZOSO_PRO_ID,
    name: 'Perezoso Pro',
    logo_url: null,
    category: 'other',
    price_amount: price,
    currency: args.currency,
    billing_period,
    billing_interval_count: 1,
    next_billing_date: computeNextBillingDate(args.purchaseDate, args.plan),
    status: 'active',
    is_shared: false,
    shared_with_count: 1,
    card_color: null,
    created_at: args.purchaseDate,
    updated_at: args.purchaseDate,
    monthly_equivalent_cost: monthly,
    my_monthly_cost: monthly,
    start_date: args.purchaseDate.slice(0, 10),
  };
}
