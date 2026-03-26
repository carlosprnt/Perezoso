import { createClient } from '@/lib/supabase/server'
import { enrichSubscriptions, getDashboardStats } from '@/lib/calculations/subscriptions'
import { formatCurrency } from '@/lib/utils/currency'
import type { Subscription, SubscriptionStatus, Category } from '@/types'
import Link from 'next/link'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import SubscriptionCard from '@/components/subscriptions/SubscriptionCard'
import FilterModal from '@/components/ui/FilterModal'
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
  const hasActiveFilters = (params.status && params.status !== 'all') || (params.category && params.category !== 'all')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#121212] tracking-tight">Subscriptions</h1>
          <p className="text-sm text-[#616161] mt-0.5">
            {allSubs.length} total · {formatCurrency(stats.total_monthly_cost, 'EUR')} / mo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FilterModal
            currentStatus={params.status}
            currentCategory={params.category}
          />
          <Link href="/subscriptions/new">
            <Button icon={<Plus size={15} />}>Add</Button>
          </Link>
        </div>
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap animate-fade-in">
          {params.status && params.status !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#121212] text-white text-xs font-medium">
              Status: {params.status}
            </span>
          )}
          {params.category && params.category !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#121212] text-white text-xs font-medium">
              {params.category}
            </span>
          )}
          <Link
            href="/subscriptions"
            className="text-xs text-[#616161] hover:text-[#121212] underline underline-offset-2 transition-colors duration-150"
          >
            Clear filters
          </Link>
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-[#F5F5F5] border border-[#E5E5E5] flex items-center justify-center mb-4">
            <Search size={20} className="text-[#616161]" />
          </div>
          <p className="text-sm font-medium text-[#121212] mb-1">No subscriptions found</p>
          <p className="text-xs text-[#616161] mb-5">
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
        <div className="space-y-2">
          {filtered.map((sub, index) => (
            <SubscriptionCard key={sub.id} subscription={sub} index={index} />
          ))}
        </div>
      )}
    </div>
  )
}
