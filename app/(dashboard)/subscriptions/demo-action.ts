'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const DEMO_SUBSCRIPTIONS = [
  { name: 'Netflix',        logo_url: 'https://cdn.brandfetch.io/idB38nBDmO/w/400/h/400/theme/dark/icon.jpeg', category: 'streaming',    price_amount: 17.99, currency: 'EUR', billing_period: 'monthly',   is_shared: true,  shared_with_count: 3, user_share_mode: 'split_evenly', days_offset: 5,   status: 'active' },
  { name: 'Spotify',        logo_url: 'https://cdn.brandfetch.io/idwjf3b_BG/w/400/h/400/theme/dark/icon.jpeg', category: 'music',        price_amount: 9.99,  currency: 'EUR', billing_period: 'monthly',   is_shared: false, shared_with_count: 1, user_share_mode: 'split_evenly', days_offset: 12,  status: 'active' },
  { name: 'Disney+',        logo_url: 'https://cdn.brandfetch.io/idxlPB-BT7/w/400/h/400/theme/dark/icon.jpeg', category: 'streaming',    price_amount: 109.90,currency: 'EUR', billing_period: 'yearly',    is_shared: true,  shared_with_count: 4, user_share_mode: 'split_evenly', days_offset: 120, status: 'active' },
  { name: 'Apple TV+',      logo_url: null,                                                                     category: 'streaming',    price_amount: 8.99,  currency: 'EUR', billing_period: 'monthly',   is_shared: false, shared_with_count: 1, user_share_mode: 'split_evenly', days_offset: 20,  status: 'active' },
  { name: 'Notion',         logo_url: 'https://cdn.brandfetch.io/idnRfkbXJc/w/400/h/400/theme/dark/icon.jpeg', category: 'productivity', price_amount: 16.00, currency: 'EUR', billing_period: 'monthly',   is_shared: false, shared_with_count: 1, user_share_mode: 'split_evenly', days_offset: 3,   status: 'active' },
  { name: 'Linear',         logo_url: null,                                                                     category: 'productivity', price_amount: 8.00,  currency: 'USD', billing_period: 'monthly',   is_shared: false, shared_with_count: 1, user_share_mode: 'split_evenly', days_offset: 18,  status: 'active' },
  { name: 'iCloud+',        logo_url: 'https://cdn.brandfetch.io/idTBc9LZQF/w/400/h/400/theme/dark/icon.jpeg', category: 'cloud',        price_amount: 2.99,  currency: 'EUR', billing_period: 'monthly',   is_shared: false, shared_with_count: 1, user_share_mode: 'split_evenly', days_offset: 7,   status: 'active' },
  { name: 'GitHub',         logo_url: 'https://cdn.brandfetch.io/idZAyF9RL1/w/400/h/400/theme/dark/icon.jpeg', category: 'cloud',        price_amount: 4.00,  currency: 'USD', billing_period: 'monthly',   is_shared: false, shared_with_count: 1, user_share_mode: 'split_evenly', days_offset: 1,   status: 'active' },
  { name: 'ChatGPT Plus',   logo_url: null,                                                                     category: 'ai',           price_amount: 20.00, currency: 'USD', billing_period: 'monthly',   is_shared: false, shared_with_count: 1, user_share_mode: 'split_evenly', days_offset: 15,  status: 'active' },
  { name: 'Claude Pro',     logo_url: null,                                                                     category: 'ai',           price_amount: 20.00, currency: 'USD', billing_period: 'monthly',   is_shared: false, shared_with_count: 1, user_share_mode: 'split_evenly', days_offset: 22,  status: 'active' },
  { name: 'Xbox Game Pass', logo_url: null,                                                                     category: 'gaming',       price_amount: 14.99, currency: 'EUR', billing_period: 'monthly',   is_shared: false, shared_with_count: 1, user_share_mode: 'split_evenly', days_offset: 9,   status: 'paused' },
  { name: 'Headspace',      logo_url: null,                                                                     category: 'health',       price_amount: 69.99, currency: 'EUR', billing_period: 'yearly',    is_shared: false, shared_with_count: 1, user_share_mode: 'split_evenly', days_offset: 200, status: 'active' },
  { name: 'Coursera Plus',  logo_url: null,                                                                     category: 'education',    price_amount: 399.00,currency: 'EUR', billing_period: 'yearly',    is_shared: false, shared_with_count: 1, user_share_mode: 'split_evenly', days_offset: 60,  status: 'cancelled' },
  { name: 'Figma',          logo_url: 'https://cdn.brandfetch.io/id4KTodYAM/w/400/h/400/theme/dark/icon.jpeg', category: 'productivity', price_amount: 15.00, currency: 'EUR', billing_period: 'monthly',   is_shared: false, shared_with_count: 1, user_share_mode: 'split_evenly', days_offset: 14,  status: 'trial' },
]

function offsetDate(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export async function loadDemoData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Avoid duplicating demo data if already loaded
  const { count } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if ((count ?? 0) > 0) {
    // User already has data — don't overwrite
    revalidatePath('/dashboard')
    revalidatePath('/subscriptions')
    redirect('/dashboard')
  }

  const rows = DEMO_SUBSCRIPTIONS.map(({ days_offset, ...sub }) => ({
    ...sub,
    user_id: user.id,
    user_share_amount: null,
    billing_interval_count: 1,
    next_billing_date: offsetDate(days_offset),
    trial_end_date: sub.status === 'trial' ? offsetDate(days_offset) : null,
    notes: null,
  }))

  await supabase.from('subscriptions').insert(rows)

  revalidatePath('/dashboard')
  revalidatePath('/subscriptions')
  redirect('/dashboard')
}
