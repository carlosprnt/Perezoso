'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { SubscriptionFormData } from '@/types'

// ============================================================
// CREATE
// ============================================================

export async function createSubscription(formData: SubscriptionFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { error } = await supabase.from('subscriptions').insert({
    ...formData,
    user_id: user.id,
  })

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

  const { error } = await supabase
    .from('subscriptions')
    .update({ ...formData })
    .eq('id', id)
    .eq('user_id', user.id) // Extra safety: only update own rows

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
