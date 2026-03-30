import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { enrichSubscriptions } from '@/lib/calculations/subscriptions'
import CalendarView from '@/components/calendar/CalendarView'
import type { Subscription } from '@/types'

export const metadata = { title: 'Calendar — Perezoso' }

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rawSubs } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const subs = enrichSubscriptions((rawSubs ?? []) as Subscription[])

  return <CalendarView subscriptions={subs} />
}
