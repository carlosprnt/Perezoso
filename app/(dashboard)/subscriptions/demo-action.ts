'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const DEMO_SUBSCRIPTIONS = [
  // ── 1–14: original set ────────────────────────────────────────────────────
  { name: 'Netflix',          logo_url: 'https://cdn.brandfetch.io/idB38nBDmO/w/400/h/400/theme/dark/icon.jpeg?c=1idMZzvNCJNlWsU36wV', category: 'streaming',    price_amount: 17.99,  currency: 'EUR', billing_period: 'monthly', is_shared: true,  shared_with_count: 3, user_share_mode: 'split_evenly', days_offset: 5,   status: 'active'    },
  { name: 'Spotify',          logo_url: 'https://cdn.brandfetch.io/idwjf3b_BG/w/400/h/400/theme/dark/icon.jpeg?c=1idMZzvNCJNlWsU36wV', category: 'music',        price_amount: 9.99,   currency: 'EUR', billing_period: 'monthly', is_shared: false, shared_with_count: 1, user_share_mode: 'split_evenly', days_offset: 12,  status: 'active'    },
  { name: 'Disney+',          logo_url: 'https://cdn.brandfetch.io/idxlPB-BT7/w/400/h/400/theme/dark/icon.jpeg?c=1idMZzvNCJNlWsU36wV', category: 'streaming',    price_amount: 109.90, currency: 'EUR', billing_period: 'yearly',  is_shared: true,  shared_with_count: 4, user_share_mode: 'split_evenly', days_offset: 120, status: 'active'    },
  { name: 'Apple TV+',        logo_url: null,                                                                     category: 'streaming',    price_amount: 8.99,   currency: 'EUR', billing_period: 'monthly', is_shared: false, shared_with_count: 1, user_share_mode: 'split_evenly', days_offset: 20,  status: 'active'    },
  { name: 'Notion',           logo_url: 'https://cdn.brandfetch.io/idnRfkbXJc/w/400/h/400/theme/dark/icon.jpeg?c=1idMZzvNCJNlWsU36wV', category: 'productivity', price_amount: 16.00,  currency: 'EUR', billing_period: 'monthly', is_shared: false, shared_with_count: 1, user_share_mode: 'split_evenly', days_offset: 3,   status: 'active'    },
  { name: 'Linear',           logo_url: null,                                                                     category: 'productivity', price_amount: 8.00,   currency: 'USD', billing_period: 'monthly', is_shared: false, shared_with_count: 1, user_share_mode: 'split_evenly', days_offset: 18,  status: 'active'    },
  { name: 'iCloud+',          logo_url: 'https://cdn.brandfetch.io/idTBc9LZQF/w/400/h/400/theme/dark/icon.jpeg?c=1idMZzvNCJNlWsU36wV', category: 'cloud',        price_amount: 2.99,   currency: 'EUR', billing_period: 'monthly', is_shared: false, shared_with_count: 1, user_share_mode: 'split_evenly', days_offset: 7,   status: 'active'    },
  { name: 'GitHub',           logo_url: 'https://cdn.brandfetch.io/idZAyF9RL1/w/400/h/400/theme/dark/icon.jpeg?c=1idMZzvNCJNlWsU36wV', category: 'cloud',        price_amount: 4.00,   currency: 'USD', billing_period: 'monthly', is_shared: false, shared_with_count: 1, user_share_mode: 'split_evenly', days_offset: 1,   status: 'active'    },
  { name: 'ChatGPT Plus',     logo_url: null,                                                                     category: 'ai',           price_amount: 20.00,  currency: 'USD', billing_period: 'monthly', is_shared: false, shared_with_count: 1, user_share_mode: 'split_evenly', days_offset: 15,  status: 'active'    },
  { name: 'Claude Pro',       logo_url: null,                                                                     category: 'ai',           price_amount: 20.00,  currency: 'USD', billing_period: 'monthly', is_shared: false, shared_with_count: 1, user_share_mode: 'split_evenly', days_offset: 22,  status: 'active'    },
  { name: 'Xbox Game Pass',   logo_url: null,                                                                     category: 'gaming',       price_amount: 14.99,  currency: 'EUR', billing_period: 'monthly', is_shared: false, shared_with_count: 1, user_share_mode: 'split_evenly', days_offset: 9,   status: 'paused'    },
  { name: 'Headspace',        logo_url: null,                                                                     category: 'health',       price_amount: 69.99,  currency: 'EUR', billing_period: 'yearly',  is_shared: false, shared_with_count: 1, user_share_mode: 'split_evenly', days_offset: 200, status: 'active'    },
  { name: 'Coursera Plus',    logo_url: null,                                                                     category: 'education',    price_amount: 399.00, currency: 'EUR', billing_period: 'yearly',  is_shared: false, shared_with_count: 1, user_share_mode: 'split_evenly', days_offset: 60,  status: 'cancelled' },
  { name: 'Figma',            logo_url: 'https://cdn.brandfetch.io/id4KTodYAM/w/400/h/400/theme/dark/icon.jpeg?c=1idMZzvNCJNlWsU36wV', category: 'productivity', price_amount: 15.00,  currency: 'EUR', billing_period: 'monthly', is_shared: false, shared_with_count: 1, user_share_mode: 'split_evenly', days_offset: 14,  status: 'trial'     },
  // ── 15–20: extra subs for the 20-item demo ────────────────────────────────
  { name: 'Amazon Prime',     logo_url: null,                                                                     category: 'streaming',    price_amount: 4.99,   currency: 'EUR', billing_period: 'monthly', is_shared: true,  shared_with_count: 2, user_share_mode: 'split_evenly', days_offset: 8,   status: 'active'    },
  { name: 'YouTube Premium',  logo_url: null,                                                                     category: 'streaming',    price_amount: 13.99,  currency: 'EUR', billing_period: 'monthly', is_shared: false, shared_with_count: 1, user_share_mode: 'split_evenly', days_offset: 11,  status: 'active'    },
  { name: 'Adobe CC',         logo_url: null,                                                                     category: 'productivity', price_amount: 59.99,  currency: 'EUR', billing_period: 'monthly', is_shared: false, shared_with_count: 1, user_share_mode: 'split_evenly', days_offset: 25,  status: 'active'    },
  { name: 'Dropbox Plus',     logo_url: null,                                                                     category: 'cloud',        price_amount: 11.99,  currency: 'EUR', billing_period: 'monthly', is_shared: false, shared_with_count: 1, user_share_mode: 'split_evenly', days_offset: 6,   status: 'active'    },
  { name: '1Password',        logo_url: null,                                                                     category: 'productivity', price_amount: 3.99,   currency: 'EUR', billing_period: 'monthly', is_shared: false, shared_with_count: 1, user_share_mode: 'split_evenly', days_offset: 17,  status: 'active'    },
  { name: 'Duolingo Plus',    logo_url: null,                                                                     category: 'education',    price_amount: 83.99,  currency: 'EUR', billing_period: 'yearly',  is_shared: false, shared_with_count: 1, user_share_mode: 'split_evenly', days_offset: 90,  status: 'active'    },
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

  const { count } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if ((count ?? 0) > 0) {
    revalidatePath('/dashboard')
    revalidatePath('/subscriptions')
    redirect('/dashboard')
  }

  const rows = DEMO_SUBSCRIPTIONS.slice(0, 14).map(({ days_offset, ...sub }) => ({
    ...sub,
    user_id: user.id,
    user_share_amount: null,
    billing_interval_count: 1,
    next_billing_date: offsetDate(days_offset),
    trial_end_date: sub.status === 'trial' ? offsetDate(days_offset) : null,
    notes: null,
    start_date: null,
    card_color: null,
  }))

  await supabase.from('subscriptions').insert(rows)

  revalidatePath('/dashboard')
  revalidatePath('/subscriptions')
  redirect('/dashboard')
}

/**
 * Admin-only: replace all subscriptions with the first N demo entries.
 * count = 0 → empty account (onboarding state)
 */
export async function setDemoMode(count: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== 'carlosprnt@gmail.com') return

  // Snapshot the user's real ("production") subscriptions the first time we
  // enter demo mode, so we can later restore them.
  const hasBackup = Boolean((user.user_metadata as any)?.prod_subs_backup)
  if (!hasBackup) {
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
    await supabase.auth.updateUser({
      data: { prod_subs_backup: existing ?? [] },
    })
  }

  await supabase.from('subscriptions').delete().eq('user_id', user.id)

  if (count > 0) {
    // Curated picks for the small demo sizes (Netflix / Netflix + Claude).
    // Larger counts fall back to the first N entries of DEMO_SUBSCRIPTIONS.
    const byName = (n: string) => {
      const match = DEMO_SUBSCRIPTIONS.find((s) => s.name === n)
      if (!match) throw new Error(`Demo subscription not found: ${n}`)
      return match
    }

    let slice: typeof DEMO_SUBSCRIPTIONS
    if (count === 1) {
      slice = [byName('Netflix')]
    } else if (count === 2) {
      slice = [byName('Netflix'), byName('Claude Pro')]
    } else {
      slice = DEMO_SUBSCRIPTIONS.slice(0, Math.min(count, DEMO_SUBSCRIPTIONS.length))
    }

    const rows = slice.map(({ days_offset, ...sub }) => ({
      ...sub,
      user_id: user.id,
      user_share_amount: null,
      billing_interval_count: 1,
      next_billing_date: offsetDate(days_offset),
      trial_end_date: sub.status === 'trial' ? offsetDate(days_offset) : null,
      notes: null,
    }))
    const { error: insertError } = await supabase.from('subscriptions').insert(rows)
    if (insertError) {
      console.error('[setDemoMode] insert failed', insertError, { count, rows })
      throw new Error(`Demo insert failed: ${insertError.message}`)
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/subscriptions')
  redirect('/dashboard')
}

/**
 * Admin-only: restore the user's real subscriptions from the backup
 * snapshot saved the first time demo mode was activated.
 */
export async function restoreProductionState() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== 'carlosprnt@gmail.com') return

  const backup = (user.user_metadata as any)?.prod_subs_backup as
    | Array<Record<string, unknown>>
    | undefined

  await supabase.from('subscriptions').delete().eq('user_id', user.id)

  if (backup && backup.length > 0) {
    const rows = backup.map((row) => {
      const { id: _id, created_at: _c, updated_at: _u, ...rest } = row as any
      return { ...rest, user_id: user.id }
    })
    await supabase.from('subscriptions').insert(rows)
  }

  // Clear the backup so the next demo session captures a fresh snapshot.
  await supabase.auth.updateUser({ data: { prod_subs_backup: null } })

  revalidatePath('/dashboard')
  revalidatePath('/subscriptions')
  redirect('/dashboard')
}
