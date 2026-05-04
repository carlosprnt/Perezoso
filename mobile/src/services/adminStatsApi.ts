import { supabase } from './supabase';

export interface DayStat { day: string; count: number }
export interface NameCount { name: string; count: number }
export interface CurrencyCount { currency: string; count: number }
export interface LocaleCount { locale: string; count: number }
export interface CategoryCount { category: string; count: number }
export interface CurrencySpend { currency: string; total_monthly: number }

async function rpc<T>(fn: string): Promise<T> {
  const { data, error } = await supabase.rpc(fn);
  if (error) throw error;
  return data as T;
}

export const adminStats = {
  registrationsPerDay: () => rpc<DayStat[]>('admin_registrations_per_day'),
  totalUsers: () => rpc<number>('admin_total_users'),
  subscriptionsPerDay: () => rpc<DayStat[]>('admin_subscriptions_per_day'),
  topSubscriptions: () => rpc<NameCount[]>('admin_top_subscriptions'),
  currencyDistribution: () => rpc<CurrencyCount[]>('admin_currency_distribution'),
  localeDistribution: () => rpc<LocaleCount[]>('admin_locale_distribution'),
  totalMonthlySpend: () => rpc<CurrencySpend[]>('admin_total_monthly_spend'),
  categoryDistribution: () => rpc<CategoryCount[]>('admin_category_distribution'),
};
