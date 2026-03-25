import { createClient } from '@/lib/supabase/server'
import { enrichSubscriptions, getDashboardStats } from '@/lib/calculations/subscriptions'
import { formatCurrency } from '@/lib/utils/currency'
import type { Subscription, SubscriptionStatus, Category } from '@/types'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import SubscriptionCard from '@/components/subscriptions/SubscriptionCard'
import SubscriptionFilters from '@/components/subscriptions/SubscriptionFilters'
import { Suspense } from 'react'
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

  // Apply filters
  let filtered = allSubs
  if (params.status && params.status !== 'all') {
    filtered = filtered.filter((s) => s.status === (params.status as SubscriptionStatus))
  }
  if (params.category && params.category !== 'all') {
    filtered = filtered.filter((s) => s.category === (params.category as Category))
  }

  const stats = getDashboardStats(allSubs)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Subscriptions</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {allSubs.length} total · {formatCurrency(stats.total_monthly_cost, 'EUR')} / mo
          </p>
        </div>
        <Link href="/subscriptions/new">
          <Button icon={<Plus size={15} />}>Add</Button>
        </Link>
      </div>

      {/* Filters */}
      <Suspense>
        <SubscriptionFilters />
      </Suspense>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-3xl mb-3">🔍</p>
          <p className="text-sm font-medium text-gray-900 mb-1">No subscriptions found</p>
          <p className="text-xs text-gray-400 mb-5">
            {allSubs.length === 0
              ? "You haven't added any subscriptions yet."
              : "Try adjusting your filters."}
          </p>
          {allSubs.length === 0 && (
            <Link href="/subscriptions/new">
              <Button icon={<Plus size={15} />}>Add your first subscription</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((sub) => (
            <SubscriptionCard key={sub.id} subscription={sub} />
          ))}
        </div>
      )}
    </div>
  )
}
