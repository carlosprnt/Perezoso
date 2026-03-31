import { createClient } from '@/lib/supabase/server'
import { enrichSubscriptions, getDashboardStats, getTopSpendCategories, getUpcomingRenewals, getTopExpensiveSubscriptions } from '@/lib/calculations/subscriptions'
import { formatCurrency } from '@/lib/utils/currency'
import type { Subscription } from '@/types'
import Link from 'next/link'
import { TrendingUp, Calendar, Users, Zap, Plus } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import UpcomingRenewals from '@/components/dashboard/UpcomingRenewals'
import TopExpensiveSection from '@/components/dashboard/TopExpensiveSection'
import TopCategoriesSection from '@/components/dashboard/TopCategoriesSection'
import { loadDemoData } from '@/app/(dashboard)/subscriptions/demo-action'
import DashboardHeader from '@/components/dashboard/DashboardHeader'
import Insights from '@/components/dashboard/Insights'
import { getServerT } from '@/lib/i18n/server'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const t = await getServerT()

  const { data: { user } } = await supabase.auth.getUser()
  const fullName: string = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? ''
  const firstName = fullName.split(' ')[0]

  const { data: rawSubs } = await supabase
    .from('subscriptions')
    .select('*')
    .order('created_at', { ascending: false })

  const subs = enrichSubscriptions((rawSubs ?? []) as Subscription[])
  const stats = getDashboardStats(subs)
  const topCategories = getTopSpendCategories(subs, 4)
  const upcoming = getUpcomingRenewals(subs, 365)
  const top3 = getTopExpensiveSubscriptions(subs, 3)

  const isEmpty = subs.length === 0

  const shareText = `My monthly subscriptions: ${formatCurrency(stats.total_monthly_cost, 'EUR')} across ${subs.length} subscriptions — tracked with Perezoso 🦥`

  const greeting = firstName ? `Hola, ${firstName}` : t('dashboard.title')

  const categoryRows = topCategories.map(({ category, monthly_cost }) => ({
    category,
    monthly_cost,
    pct: stats.total_monthly_cost > 0 ? (monthly_cost / stats.total_monthly_cost) * 100 : 0,
  }))

  return (
    <div>
      {/* Header — sticky, fades as cards scroll over */}
      <DashboardHeader
        title={greeting}
        subtitle={t('dashboard.subtitle')}
        shareText={shareText}
      />

      {/* Content — higher z-index, scrolls over the header */}
      <div className="relative z-[1] space-y-[8px] mt-2">

      {isEmpty ? (
        <EmptyState t={t} />
      ) : (
        <>
          {/* Monthly + Yearly */}
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E8E8E8] dark:border-[#2C2C2E] p-5">
            <div className="grid grid-cols-2">
              <div className="pr-5">
                <div className="flex items-center gap-1.5 mb-3">
                  <TrendingUp size={13} className="text-[#737373] dark:text-[#636366]" />
                  <span className="text-xs font-medium text-[#737373] dark:text-[#636366]">{t('dashboard.monthly')}</span>
                </div>
                <p className="text-[28px] font-bold text-[#121212] dark:text-[#F2F2F7] tabular-nums tracking-tight leading-none">
                  {formatCurrency(stats.total_monthly_cost, 'EUR')}
                </p>
              </div>
              <div className="flex">
                {/* Vertical divider with inset margin */}
                <div className="w-px bg-[#F0F0F0] dark:bg-[#2C2C2E] my-3 flex-shrink-0" />
                <div className="pl-5 flex-1">
                  <div className="flex items-center gap-1.5 mb-3">
                    <Calendar size={13} className="text-[#737373] dark:text-[#636366]" />
                    <span className="text-xs font-medium text-[#737373] dark:text-[#636366]">{t('dashboard.yearly')}</span>
                  </div>
                  <p className="text-[28px] font-bold text-[#121212] dark:text-[#F2F2F7] tabular-nums tracking-tight leading-none">
                    {formatCurrency(stats.total_annual_cost, 'EUR')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Active + Shared */}
          <div className="grid grid-cols-2 gap-[8px]">
            <SmallStatCard
              label={t('dashboard.active')}
              value={String(stats.active_count + stats.trial_count)}
              sub={t('dashboard.onTrial', { count: stats.trial_count })}
              icon={<Zap size={13} className="text-[#737373]" />}
            />
            <SmallStatCard
              label={t('dashboard.shared')}
              value={formatCurrency(stats.shared_monthly_cost, 'EUR')}
              sub={t('dashboard.yourSharePerMonth')}
              icon={<Users size={13} className="text-[#737373]" />}
            />
          </div>

          {/* Insights */}
          <Insights subscriptions={subs} stats={stats} />

          <div className="grid lg:grid-cols-3 gap-[8px]">
            {/* Upcoming renewals */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader title={t('dashboard.upcomingRenewals')} />
                <UpcomingRenewals renewals={upcoming} />
              </Card>
            </div>

            {/* Right column */}
            <div className="space-y-[8px]">
              {/* Top categories */}
              <Card>
                <CardHeader title={t('dashboard.topCategories')} />
                <TopCategoriesSection categories={categoryRows} />
              </Card>
            </div>
          </div>

          {/* Top 3 most expensive */}
          {top3.length > 0 && (
            <Card>
              <CardHeader title={t('dashboard.topExpensive')} />
              <TopExpensiveSection subscriptions={top3} />
            </Card>
          )}
        </>
      )}
      </div>
    </div>
  )
}

// ── Small stat card ───────────────────────────────────────────────────────────

function SmallStatCard({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E8E8E8] dark:border-[#2C2C2E] p-4">
      <div className="flex items-center gap-1.5 mb-2.5">
        {icon}
        <span className="text-xs font-medium text-[#737373] dark:text-[#636366]">{label}</span>
      </div>
      <p className="text-[22px] font-bold text-[#121212] dark:text-[#F2F2F7] tabular-nums tracking-tight leading-none">{value}</p>
      <p className="text-xs text-[#737373] dark:text-[#636366] mt-1.5">{sub}</p>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ t }: { t: ReturnType<typeof import('@/lib/i18n/translations').getT> }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-[#F5F5F5] border border-[#E8E8E8] flex items-center justify-center mb-4">
        <span className="text-3xl">🦥</span>
      </div>
      <h2 className="text-lg font-semibold text-[#121212] mb-1">{t('dashboard.noSubscriptions')}</h2>
      <p className="text-sm text-[#737373] max-w-xs mb-6">
        {t('dashboard.noSubscriptionsDesc')}
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/subscriptions/new">
          <Button icon={<Plus size={15} />}>{t('dashboard.addSubscription')}</Button>
        </Link>
        <LoadDemoButton t={t} />
      </div>
    </div>
  )
}

function LoadDemoButton({ t }: { t: ReturnType<typeof import('@/lib/i18n/translations').getT> }) {
  return (
    <form action={loadDemoData}>
      <Button type="submit" variant="secondary">{t('dashboard.tryDemo')}</Button>
    </form>
  )
}
