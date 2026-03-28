import { createClient } from '@/lib/supabase/server'
import { enrichSubscriptions, getDashboardStats, getTopSpendCategories, getHighestCostSubscription, getUpcomingRenewals } from '@/lib/calculations/subscriptions'
import { formatCurrency } from '@/lib/utils/currency'
import { getCategoryMeta } from '@/lib/constants/categories'
import { formatRelativeDate } from '@/lib/utils/dates'
import type { Subscription } from '@/types'
import Link from 'next/link'
import { TrendingUp, Calendar, Users, Zap, Plus } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import SubscriptionAvatar from '@/components/subscriptions/SubscriptionAvatar'
import { StatusBadge } from '@/components/ui/Badge'
import { loadDemoData } from '@/app/(dashboard)/subscriptions/demo-action'
import UserAvatarMenu from '@/components/dashboard/UserAvatarMenu'
import Insights from '@/components/dashboard/Insights'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: rawSubs } = await supabase
    .from('subscriptions')
    .select('*')
    .order('created_at', { ascending: false })

  const subs = enrichSubscriptions((rawSubs ?? []) as Subscription[])
  const stats = getDashboardStats(subs)
  const topCategories = getTopSpendCategories(subs, 4)
  const highest = getHighestCostSubscription(subs)
  const upcoming = getUpcomingRenewals(subs, 30)
  const activeSubs = subs.filter((s) => s.status === 'active' || s.status === 'trial')

  const isEmpty = subs.length === 0

  // Share text with real data
  const shareText = `My monthly subscriptions: ${formatCurrency(stats.total_monthly_cost, 'EUR')} across ${subs.length} subscriptions — tracked with Perezoso 🦥`

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#121212] tracking-tight">Dashboard</h1>
          <p className="text-sm text-[#616161] mt-0.5">Your subscription overview</p>
        </div>
        <UserAvatarMenu shareText={shareText} />
      </div>

      {isEmpty ? (
        <EmptyState />
      ) : (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-[8px]">
            <StatCard
              label="Monthly"
              value={formatCurrency(stats.total_monthly_cost, 'EUR')}
              sub="What you spend / mo"
              icon={<TrendingUp size={16} />}
              accent
            />
            <StatCard
              label="Yearly"
              value={formatCurrency(stats.total_annual_cost, 'EUR')}
              sub="Projected annual cost"
              icon={<Calendar size={16} className="text-[#424242]" />}
            />
            <StatCard
              label="Active"
              value={String(stats.active_count + stats.trial_count)}
              sub={`${stats.trial_count} on trial`}
              icon={<Zap size={16} className="text-[#424242]" />}
            />
            <StatCard
              label="Shared"
              value={formatCurrency(stats.shared_monthly_cost, 'EUR')}
              sub="Your share / mo"
              icon={<Users size={16} className="text-[#424242]" />}
            />
          </div>

          {/* Insights */}
          <Insights subscriptions={subs} stats={stats} />

          <div className="grid lg:grid-cols-3 gap-[8px]">
            {/* Upcoming renewals */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader title="Upcoming renewals" subtitle={`Next 30 days · ${upcoming.length} renewals`} />
                {upcoming.length === 0 ? (
                  <p className="text-sm text-[#616161] py-2">No upcoming renewals in the next 30 days.</p>
                ) : (
                  <div className="space-y-3">
                    {upcoming.slice(0, 6).map((r) => (
                      <div key={r.subscription.id} className="flex items-center gap-3">
                        <SubscriptionAvatar
                          name={r.subscription.name}
                          logoUrl={r.subscription.logo_url}
                          size="sm"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#121212] truncate">{r.subscription.name}</p>
                          <p className="text-xs text-[#616161]">
                            {r.days_until === 0 ? (
                              <span className="text-red-600 font-medium">Due today</span>
                            ) : r.days_until === 1 ? (
                              <span className="text-amber-700 font-medium">Tomorrow</span>
                            ) : (
                              `in ${r.days_until} days`
                            )}
                            {' · '}{formatRelativeDate(r.subscription.next_billing_date)}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-semibold text-[#121212] tabular-nums">
                            {formatCurrency(r.subscription.my_monthly_cost, r.subscription.currency)}
                          </p>
                          <p className="text-xs text-[#616161]">/ mo</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Right column */}
            <div className="space-y-3">
              {/* Top categories */}
              <Card>
                <CardHeader title="Top categories" />
                <div className="space-y-2.5">
                  {topCategories.map(({ category, monthly_cost }) => {
                    const meta = getCategoryMeta(category)
                    const Icon = meta.icon
                    const pct = stats.total_monthly_cost > 0
                      ? (monthly_cost / stats.total_monthly_cost) * 100
                      : 0
                    return (
                      <div key={category}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-[#424242] font-medium flex items-center gap-1.5">
                            <Icon size={12} className="text-[#616161]" />
                            {meta.label}
                          </span>
                          <span className="text-xs font-semibold text-[#121212] tabular-nums">
                            {formatCurrency(monthly_cost, 'EUR')}
                          </span>
                        </div>
                        <div className="h-1.5 bg-[#F5F5F5] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#121212] rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>

              {/* Highest cost */}
              {highest && (
                <Card>
                  <p className="text-xs font-medium text-[#616161] mb-2">Most expensive</p>
                  <div className="flex items-center gap-3">
                    <SubscriptionAvatar name={highest.name} logoUrl={highest.logo_url} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#121212] truncate">{highest.name}</p>
                      <p className="text-xs text-[#616161]">
                        {formatCurrency(highest.price_amount, highest.currency)} /{' '}
                        {highest.billing_period}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-[#E5E5E5] flex justify-between">
                    <span className="text-xs text-[#616161]">Monthly equiv.</span>
                    <span className="text-sm font-bold text-[#121212] tabular-nums">
                      {formatCurrency(highest.my_monthly_cost, highest.currency)}
                    </span>
                  </div>
                </Card>
              )}
            </div>
          </div>

          {/* Active subscriptions */}
          <Card>
            <CardHeader
              title="Active subscriptions"
              subtitle={`${activeSubs.length} subscriptions`}
              action={
                <Link href="/subscriptions" className="text-xs text-[#424242] hover:text-[#121212] font-medium transition-colors duration-150">
                  View all →
                </Link>
              }
            />
            <div className="space-y-1">
              {activeSubs.slice(0, 5).map((sub) => {
                const meta = getCategoryMeta(sub.category)
                const Icon = meta.icon
                return (
                  <Link key={sub.id} href={`/subscriptions/${sub.id}`}>
                    <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-[#F5F5F5] transition-colors duration-150 -mx-2">
                      <SubscriptionAvatar name={sub.name} logoUrl={sub.logo_url} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#121212] truncate">{sub.name}</p>
                        <p className="text-xs text-[#616161] flex items-center gap-1">
                          <Icon size={11} />
                          {meta.label}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-[#121212] tabular-nums">
                          {formatCurrency(sub.my_monthly_cost, sub.currency)}
                        </p>
                        <p className="text-xs text-[#616161]">/ mo</p>
                      </div>
                      <StatusBadge status={sub.status} />
                    </div>
                  </Link>
                )
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  icon,
  accent = false,
}: {
  label: string
  value: string
  sub: string
  icon: React.ReactNode
  accent?: boolean
}) {
  return (
    <div
      className={`
        rounded-2xl p-4 border
        ${accent
          ? 'bg-[#121212] border-[#121212] text-white'
          : 'bg-white border-[#E8E8E8]'
        }
      `}
    >
      <div className={`flex items-center gap-1.5 mb-2 ${accent ? 'text-[#A3A3A3]' : 'text-[#616161]'}`}>
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className={`text-xl font-bold tracking-tight tabular-nums ${accent ? 'text-white' : 'text-[#121212]'}`}>
        {value}
      </p>
      <p className={`text-xs mt-0.5 ${accent ? 'text-[#A3A3A3]' : 'text-[#616161]'}`}>{sub}</p>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-[#F5F5F5] border border-[#E5E5E5] flex items-center justify-center mb-4">
        <span className="text-3xl">🦥</span>
      </div>
      <h2 className="text-lg font-semibold text-[#121212] mb-1">No subscriptions yet</h2>
      <p className="text-sm text-[#616161] max-w-xs mb-6">
        Add your first subscription or load demo data to see how Perezoso works.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/subscriptions/new">
          <Button icon={<Plus size={15} />}>Add subscription</Button>
        </Link>
        <LoadDemoButton />
      </div>
    </div>
  )
}

function LoadDemoButton() {
  return (
    <form action={loadDemoData}>
      <Button type="submit" variant="secondary">
        Try with demo data
      </Button>
    </form>
  )
}
