'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { SubscriptionFormData } from '@/types'

const OPTIONAL_COLUMNS = ['card_color', 'start_date'] as const

function stripOptionalColumns(data: Record<string, unknown>): Record<string, unknown> {
  const out = { ...data }
  for (const col of OPTIONAL_COLUMNS) delete out[col]
  return out
}

function isSchemaError(message: string): boolean {
  return message.includes('column') && message.includes('schema cache')
}

function isCategoryCheckError(message: string): boolean {
  return message.toLowerCase().includes('valid_category')
}

// ============================================================
// CREATE
// ============================================================

export async function createSubscription(formData: SubscriptionFormData, successRedirect?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // ── Pro gate: enforce 15-subscription limit for free users ────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_pro')
    .eq('id', user.id)
    .single()

  const isPro = !!(profile as { is_pro?: boolean } | null)?.is_pro

  if (!isPro) {
    const { count } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if ((count ?? 0) >= 15) {
      return { error: 'subscription_limit_reached' }
    }
  }
  // ──────────────────────────────────────────────────────────────────────────

  const payload = { ...formData, user_id: user.id }
  let result = await supabase
    .from('subscriptions')
    .insert(payload)
    .select('id')
    .single()

  // Retry without optional columns if DB schema is behind
  if (result.error && isSchemaError(result.error.message)) {
    const fallback = { ...stripOptionalColumns(payload as Record<string, unknown>), user_id: user.id }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result = await (supabase.from('subscriptions').insert(fallback).select('id').single() as any)
  }

  // Retry with category='other' if the DB still has the valid_category CHECK
  // constraint and the user picked a custom category from Settings.
  if (result.error && isCategoryCheckError(result.error.message)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result = await (supabase.from('subscriptions').insert({ ...payload, category: 'other' }).select('id').single() as any)
  }

  if (result.error) {
    return { error: result.error.message }
  }

  revalidatePath('/dashboard')
  revalidatePath('/subscriptions')
  return { id: result.data?.id ?? '' }
}

// ============================================================
// UPDATE
// ============================================================

export async function updateSubscription(id: string, formData: SubscriptionFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  let { error } = await supabase
    .from('subscriptions')
    .update({ ...formData })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error && isSchemaError(error.message)) {
    const fallback = stripOptionalColumns(formData as unknown as Record<string, unknown>)
    const retry = await supabase
      .from('subscriptions')
      .update(fallback)
      .eq('id', id)
      .eq('user_id', user.id)
    error = retry.error
  }

  if (error && isCategoryCheckError(error.message)) {
    const retry = await supabase
      .from('subscriptions')
      .update({ ...formData, category: 'other' })
      .eq('id', id)
      .eq('user_id', user.id)
    error = retry.error
  }

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  revalidatePath('/subscriptions')
  return { success: true }
}

// ============================================================
// DELETE
// ============================================================

export async function deleteSubscription(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { error } = await supabase
    .from('subscriptions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  revalidatePath('/subscriptions')
  // Return success so the client can show a toast before navigating.
  return { success: true }
}

// ============================================================
// BULK IMPORT (no redirect — used by Gmail detection flow)
// ============================================================

export async function importSubscriptions(
  items: SubscriptionFormData[],
): Promise<{ imported: number; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { imported: 0, error: 'Not authenticated' }

  let imported = 0
  for (const formData of items) {
    const payload = { ...formData, user_id: user.id }
    let result = await supabase.from('subscriptions').insert(payload).select('id').single()

    if (result.error && isSchemaError(result.error.message)) {
      const fallback = { ...stripOptionalColumns(payload as Record<string, unknown>), user_id: user.id }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result = await (supabase.from('subscriptions').insert(fallback).select('id').single() as any)
    }

    if (!result.error) imported++
  }

  if (imported > 0) {
    revalidatePath('/dashboard')
    revalidatePath('/subscriptions')
  }

  return { imported }
}

// ============================================================
// ARCHIVE (set status to cancelled)
// ============================================================

export async function archiveSubscription(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { error } = await supabase
    .from('subscriptions')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  revalidatePath('/subscriptions')
}
