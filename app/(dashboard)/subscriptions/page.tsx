import { createClient } from '@/lib/supabase/server'
import { enrichSubscriptions, getDashboardStats } from '@/lib/calculations/subscriptions'
import { formatCurrency } from '@/lib/utils/currency'
import type { Subscription, SubscriptionStatus, Category } from '@/types'
import SubscriptionCard from '@/components/subscriptions/SubscriptionCard'
import FilterModal from '@/components/ui/FilterModal'
import AddSubscriptionFlow from '@/components/subscriptions/AddSubscriptionFlow'
import { Search } from 'lucide-react'
import Link from 'next/link'
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
  const hasActiveFilters =
    (params.status && params.status !== 'all') ||
    (params.category && params.category !== 'all')

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#121212] tracking-tight">Subscriptions</h1>
        <div className="flex items-center gap-2">
          {/* Filter button */}
          <div className="hidden sm:block">
            <FilterModal
              currentStatus={params.status}
              currentCategory={params.category}
            />
          </div>
          {/* Add button — desktop only; mobile uses floating nav "+" */}
          <div className="hidden sm:block">
            <AddSubscriptionFlow />
          </div>
        </div>
      </div>

      {/* Summary cards (only when data exists) */}
      {allSubs.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-[#E5E5E5] rounded-2xl p-4">
            <p className="text-xs font-medium text-[#888888]">Total</p>
            <p className="text-xl font-bold text-[#111111] mt-1 tabular-nums leading-tight">
              {allSubs.length} Subscriptions
            </p>
          </div>
          <div className="bg-white border border-[#E5E5E5] rounded-2xl p-4">
            <p className="text-xs font-medium text-[#888888]">Per month</p>
            <p className="text-xl font-bold text-[#111111] mt-1 tabular-nums leading-tight">
              {formatCurrency(stats.total_monthly_cost, 'EUR')}
            </p>
          </div>
        </div>
      )}

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap animate-fade-in">
          {params.status && params.status !== 'all' && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#121212] text-white text-xs font-medium capitalize">
              {params.status}
            </span>
          )}
          {params.category && params.category !== 'all' && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#121212] text-white text-xs font-medium capitalize">
              {params.category}
            </span>
          )}
          <Link
            href="/subscriptions"
            className="text-xs text-[#616161] hover:text-[#121212] underline underline-offset-2 transition-colors"
          >
            Clear filters
          </Link>
        </div>
      )}

      {/* Subscription list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-[#F5F5F5] border border-[#E5E5E5] flex items-center justify-center mb-4">
            <Search size={20} className="text-[#616161]" />
          </div>
          <p className="text-sm font-medium text-[#121212] mb-1">
            {allSubs.length === 0 ? 'No subscriptions yet' : 'No results'}
          </p>
          <p className="text-xs text-[#616161]">
            {allSubs.length === 0
              ? 'Tap Add to get started.'
              : 'Try adjusting your filters.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((sub, index) => (
            <SubscriptionCard key={sub.id} subscription={sub} index={index} />
          ))}
        </div>
      )}

      {/* Floating filter FAB — mobile only, above bottom nav */}
      <div className="sm:hidden">
        <div className="fixed bottom-20 right-4 z-30">
          <FilterModal
            currentStatus={params.status}
            currentCategory={params.category}
          />
        </div>
      </div>
    </div>
  )
}
