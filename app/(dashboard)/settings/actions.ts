'use server'

import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/supabase/auth'
import { revalidatePath } from 'next/cache'

export interface UserPreferences {
  preferred_currency: string
  custom_categories: string[]
  notifications_enabled: boolean
}

const DEFAULTS: UserPreferences = {
  preferred_currency: 'EUR',
  custom_categories: [],
  notifications_enabled: false,
}

export async function getPreferences(): Promise<UserPreferences> {
  const user = await getAuthUser()
  const stored = (user?.user_metadata as { preferences?: Partial<UserPreferences> } | undefined)?.preferences
  return { ...DEFAULTS, ...(stored ?? {}) }
}

/** Preferences + user profile derived from the same cached auth user.
    `getAuthUser()` is memoised by React.cache, so the settings page
    reuses the user already fetched by the dashboard layout — no second
    round-trip on navigation. */
export async function getPreferencesAndProfile(): Promise<{
  preferences: UserPreferences
  profile: {
    name: string | null
    email: string | null
    avatarUrl: string | null
  }
}> {
  const user = await getAuthUser()
  const stored = (user?.user_metadata as { preferences?: Partial<UserPreferences> } | undefined)?.preferences
  return {
    preferences: { ...DEFAULTS, ...(stored ?? {}) },
    profile: {
      name:      (user?.user_metadata?.full_name as string | undefined) ?? null,
      email:     user?.email ?? null,
      avatarUrl: (user?.user_metadata?.avatar_url as string | undefined) ?? null,
    },
  }
}

/** @deprecated use `getPreferencesAndProfile`. */
export async function getPreferencesAndEmail(): Promise<{
  preferences: UserPreferences
  email: string | null
}> {
  const { preferences, profile } = await getPreferencesAndProfile()
  return { preferences, email: profile.email }
}

async function mergePreferences(patch: Partial<UserPreferences>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const current = (user.user_metadata as { preferences?: Partial<UserPreferences> } | undefined)?.preferences ?? {}
  const { error } = await supabase.auth.updateUser({
    data: { preferences: { ...DEFAULTS, ...current, ...patch } },
  })
  if (error) return { error: error.message }
  revalidatePath('/settings')
  revalidatePath('/subscriptions')
  revalidatePath('/dashboard')
  return { ok: true as const }
}

export async function setPreferredCurrency(code: string) {
  return mergePreferences({ preferred_currency: code })
}

export async function setNotificationsEnabled(enabled: boolean) {
  return mergePreferences({ notifications_enabled: enabled })
}

export async function addCustomCategory(name: string) {
  const trimmed = name.trim()
  if (!trimmed) return { error: 'Name required' }

  // Pro gate — custom categories are Pro-only. Check the profile flag
  // in Supabase (mirrored from RevenueCat via webhook) before mutating.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_pro')
    .eq('id', user.id)
    .single()

  const isPro = !!(profile as { is_pro?: boolean } | null)?.is_pro
  if (!isPro) return { error: 'custom_categories_pro_required' }

  const prefs = await getPreferences()
  if (prefs.custom_categories.includes(trimmed)) return { ok: true as const }
  return mergePreferences({ custom_categories: [...prefs.custom_categories, trimmed] })
}

export async function removeCustomCategory(name: string) {
  const prefs = await getPreferences()
  return mergePreferences({ custom_categories: prefs.custom_categories.filter(c => c !== name) })
}

/**
 * Permanent account deletion. Delegates to the SECURITY DEFINER
 * Postgres function `delete_my_account` which wipes user-owned rows
 * and the auth.users entry in a single transaction.
 */
export async function deleteAccount() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.rpc('delete_my_account')
  if (error) return { error: error.message }

  await supabase.auth.signOut()
  return { ok: true as const }
}
