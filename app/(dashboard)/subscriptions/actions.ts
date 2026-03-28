'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { SubscriptionFormData } from '@/types'

// Columns that may not exist yet (pending migrations).
// If Supabase returns a schema-cache error for these, we retry without them.
const OPTIONAL_COLUMNS = ['card_color'] as const

function stripOptionalColumns(data: Record<string, unknown>): Record<string, unknown> {
  const out = { ...data }
  for (const col of OPTIONAL_COLUMNS) delete out[col]
  return out
}

function isSchemaError(message: string): boolean {
  return message.includes('column') && message.includes('schema cache')
}

// ============================================================
// CREATE
// ============================================================

export async function createSubscription(formData: SubscriptionFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const payload = { ...formData, user_id: user.id }
  let { error } = await supabase.from('subscriptions').insert(payload)

  // Retry without optional columns if DB schema is behind
  if (error && isSchemaError(error.message)) {
    const fallback = { ...stripOptionalColumns(payload as Record<string, unknown>), user_id: user.id }
    const retry = await supabase.from('subscriptions').insert(fallback)
    error = retry.error
  }

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  revalidatePath('/subscriptions')
  redirect('/subscriptions')
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

  // Retry without optional columns if DB schema is behind
  if (error && isSchemaError(error.message)) {
    const fallback = stripOptionalColumns(formData as unknown as Record<string, unknown>)
    const retry = await supabase
      .from('subscriptions')
      .update(fallback)
      .eq('id', id)
      .eq('user_id', user.id)
    error = retry.error
  }

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  revalidatePath('/subscriptions')
  redirect('/subscriptions')
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
  redirect('/subscriptions')
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
