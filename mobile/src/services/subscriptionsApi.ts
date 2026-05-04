// Supabase subscriptions API — read/write helpers for the `subscriptions`
// table (same schema as the web app). The mobile Subscription type carries
// two computed fields (monthly_equivalent_cost, my_monthly_cost) that
// aren't stored in the DB; we compute them here after fetch/insert so the
// rest of the app sees consistent shapes whether data comes from Supabase
// or from the demo presets.

import { supabase } from './supabase';
import type { Subscription } from '../features/subscriptions/types';

// DB shape — subset we care about. Matches web app's migration 001-003.
interface SubscriptionRow {
  id: string;
  user_id: string;
  name: string;
  logo_url: string | null;
  category: Subscription['category'];
  price_amount: number;
  currency: string;
  billing_period: Subscription['billing_period'];
  billing_interval_count: number;
  next_billing_date: string | null;
  status: Subscription['status'];
  is_shared: boolean;
  shared_with_count: number | null;
  user_share_mode: string | null;
  user_share_amount: number | null;
  notes: string | null;
  card_color: string | null;
  created_at: string;
  updated_at: string;
  start_date: string | null;
  end_date: string | null;
  payment_method: string | null;
}

// ── Cost derivation ──────────────────────────────────────────────────
// Convert the period's price to a monthly-equivalent. Mirrors the web's
// `monthly_equivalent_cost` formula so numbers match across platforms.
function toMonthlyEquivalent(price: number, period: Subscription['billing_period'], intervalCount: number) {
  const perUnit = price / Math.max(intervalCount, 1);
  switch (period) {
    case 'monthly':   return perUnit;
    case 'yearly':    return perUnit / 12;
    case 'quarterly': return perUnit / 3;
    case 'weekly':    return perUnit * 4.345;
    default:          return perUnit;
  }
}

function deriveMyShare(monthly: number, row: SubscriptionRow): number {
  if (!row.is_shared) return monthly;
  if (row.user_share_mode === 'custom' && row.user_share_amount != null) {
    return toMonthlyEquivalent(row.user_share_amount, row.billing_period, row.billing_interval_count);
  }
  const count = Math.max(row.shared_with_count ?? 1, 1);
  return monthly / count;
}

function rowToSubscription(row: SubscriptionRow): Subscription {
  const monthly_equivalent_cost = toMonthlyEquivalent(
    row.price_amount,
    row.billing_period,
    row.billing_interval_count,
  );
  const my_monthly_cost = deriveMyShare(monthly_equivalent_cost, row);

  return {
    id: row.id,
    name: row.name,
    logo_url: row.logo_url,
    category: row.category,
    price_amount: row.price_amount,
    currency: row.currency,
    billing_period: row.billing_period,
    billing_interval_count: row.billing_interval_count,
    next_billing_date: row.next_billing_date ?? '',
    status: row.status,
    is_shared: row.is_shared,
    shared_with_count: row.shared_with_count ?? 0,
    card_color: row.card_color,
    created_at: row.created_at,
    updated_at: row.updated_at,
    monthly_equivalent_cost,
    my_monthly_cost,
    notes: row.notes ?? undefined,
    start_date: row.start_date ?? undefined,
    end_date: row.end_date ?? undefined,
    payment_method: row.payment_method ?? undefined,
  };
}

export async function fetchSubscriptions(userId: string): Promise<Subscription[]> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as SubscriptionRow[]).map(rowToSubscription);
}

// Insert a new row. Expects a Subscription-shaped object from the Create
// form; we strip computed + client-only fields and rely on Supabase to
// set id/user_id/created_at/updated_at defaults.
export async function insertSubscription(
  userId: string,
  sub: Omit<Subscription, 'id' | 'created_at' | 'updated_at' | 'monthly_equivalent_cost' | 'my_monthly_cost'>,
): Promise<Subscription> {
  const payload = {
    user_id: userId,
    name: sub.name,
    logo_url: sub.logo_url,
    category: sub.category,
    price_amount: sub.price_amount,
    currency: sub.currency,
    billing_period: sub.billing_period,
    billing_interval_count: sub.billing_interval_count,
    next_billing_date: sub.next_billing_date || null,
    status: sub.status,
    is_shared: sub.is_shared,
    shared_with_count: sub.is_shared ? Math.max(sub.shared_with_count, 2) : 1,
    card_color: sub.card_color,
    notes: sub.notes ?? null,
    start_date: sub.start_date ?? null,
    end_date: sub.end_date ?? null,
    payment_method: sub.payment_method ?? null,
  };

  const { data, error } = await supabase
    .from('subscriptions')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return rowToSubscription(data as SubscriptionRow);
}

export async function updateSubscription(
  sub: Subscription,
): Promise<Subscription> {
  const payload = {
    name: sub.name,
    logo_url: sub.logo_url,
    category: sub.category,
    price_amount: sub.price_amount,
    currency: sub.currency,
    billing_period: sub.billing_period,
    billing_interval_count: sub.billing_interval_count,
    next_billing_date: sub.next_billing_date || null,
    status: sub.status,
    is_shared: sub.is_shared,
    shared_with_count: sub.is_shared ? Math.max(sub.shared_with_count, 2) : 1,
    card_color: sub.card_color,
    notes: sub.notes ?? null,
    start_date: sub.start_date ?? null,
    end_date: sub.end_date ?? null,
    payment_method: sub.payment_method ?? null,
  };

  const { data, error } = await supabase
    .from('subscriptions')
    .update(payload)
    .eq('id', sub.id)
    .select('*')
    .single();

  if (error) throw error;
  return rowToSubscription(data as SubscriptionRow);
}

export async function deleteSubscription(id: string): Promise<void> {
  const { error } = await supabase
    .from('subscriptions')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Wipe every subscription belonging to a user. Used by "Eliminar cuenta"
// in Settings to reset an account back to its empty state. RLS enforces
// that the delete only touches rows owned by the authenticated user.
export async function deleteAllSubscriptions(userId: string): Promise<void> {
  const { error } = await supabase
    .from('subscriptions')
    .delete()
    .eq('user_id', userId);

  if (error) throw error;
}
