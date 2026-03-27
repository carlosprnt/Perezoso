import { createClient } from '@/lib/supabase/server'
import { enrichSubscriptions, getDashboardStats } from '@/lib/calculations/subscriptions'
import type { Subscription, SubscriptionStatus, Category } from '@/types'
import SubscriptionsView from '@/components/subscriptions/SubscriptionsView'
import AddSubscriptionFlow from '@/components/subscriptions/AddSubscriptionFlow'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Subscriptions' }

interface PageProps {
  searchParams: Promise<{ status?: string; category?: string }>
}

export default async function SubscriptionsPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const params = await searchParams

  const { data: rawSubs } = await supabase
    .from('subscriptions')
    .select('*')
    .order('name', { ascending: true })

  const allSubs = enrichSubscriptions((rawSubs ?? []) as Subscription[])

  let filtered = allSubs
  if (params.status && params.status !== 'all') {
    filtered = filtered.filter(s => s.status === (params.status as SubscriptionStatus))
  }
  if (params.category && params.category !== 'all') {
    filtered = filtered.filter(s => s.category === (params.category as Category))
  }

  const stats = getDashboardStats(allSubs)

  return (
    <>
      <SubscriptionsView
        subscriptions={filtered}
        allCount={allSubs.length}
        stats={stats}
        currentStatus={params.status ?? 'all'}
        currentCategory={params.category ?? 'all'}
      />
      {/* Add button — desktop only; mobile uses floating nav "+" */}
      <div className="hidden sm:block fixed top-6 right-6 z-30">
        <AddSubscriptionFlow />
      </div>
    </>
  )
}
