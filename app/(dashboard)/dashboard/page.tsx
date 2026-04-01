import { createClient } from '@/lib/supabase/server'
import { enrichSubscriptions, getDashboardStats, getTopSpendCategories, getUpcomingRenewals, getTopExpensiveSubscriptions } from '@/lib/calculations/subscriptions'
import { formatCurrency } from '@/lib/utils/currency'
import { resolveSubscriptionLogoUrl } from '@/lib/constants/platforms'
import type { Subscription } from '@/types'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import UpcomingRenewals from '@/components/dashboard/UpcomingRenewals'
import TopExpensiveSection from '@/components/dashboard/TopExpensiveSection'
import TopCategoriesSection from '@/components/dashboard/TopCategoriesSection'
import { loadDemoData } from '@/app/(dashboard)/subscriptions/demo-action'
import DashboardCardStack from '@/components/dashboard/DashboardCardStack'
import DashboardSummaryHero from '@/components/dashboard/DashboardSummaryHero'
import CalendarModalButton from '@/components/dashboard/CalendarModalButton'
import Insights from '@/components/dashboard/Insights'
import SlothReminderCard from '@/components/dashboard/SlothReminderCard'
import { getServerT } from '@/lib/i18n/server'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const t = await getServerT()

  const { data: { user } } = await supabase.auth.getUser()
  const firstName = (user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? '').split(' ')[0]

  const { data: rawSubs } = await supabase
    .from('subscriptions')
    .select('*')
    .order('created_at', { ascending: false })

  const subs = enrichSubscriptions((rawSubs ?? []) as Subscription[])
  const stats = getDashboardStats(subs)
  const topCategories = getTopSpendCategories(subs, 99)
  const upcoming = getUpcomingRenewals(subs, 365)
  const top3 = getTopExpensiveSubscriptions(subs, 3)
  const sharedCount = subs.filter(
    s => s.is_shared && (s.status === 'active' || s.status === 'trial')
  ).length

  const isEmpty = subs.length === 0

  const activeLogoUrls = subs
    .filter(s => s.status === 'active' || s.status === 'trial')
    .map(s => resolveSubscriptionLogoUrl(s.name, s.logo_url))
    .filter((u): u is string => !!u)

  const shareText = `My monthly subscriptions: ${formatCurrency(stats.total_monthly_cost, 'EUR')} across ${subs.length} subscriptions — tracked with Perezoso 🦥`

  const categoryRows = topCategories.map(({ category, monthly_cost }) => ({
    category,
    monthly_cost,
    pct: stats.total_monthly_cost > 0 ? (monthly_cost / stats.total_monthly_cost) * 100 : 0,
  }))

  return (
    <div>
      {/* Hero — sticky, fades+blurs as content scrolls over it */}
      {!isEmpty && (
        <DashboardSummaryHero
          firstName={firstName}
          stats={stats}
          sharedCount={sharedCount}
          shareText={shareText}
          logoUrls={activeLogoUrls}
        />
      )}

      {/* Cards — z-[1], scroll over the fading hero */}
      <DashboardCardStack>
        {isEmpty ? (
          <EmptyState t={t} />
        ) : (
          <>
            {/* Insights grid */}
            <Insights subscriptions={subs} stats={stats} />

            {/* Sloth reminder card */}
            <SlothReminderCard />

            {/* Renewals + Categories */}
            <div className="grid lg:grid-cols-3 gap-[8px]">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader
                    title={t('dashboard.upcomingRenewals')}
                    action={<CalendarModalButton subscriptions={subs} />}
                  />
                  <UpcomingRenewals renewals={upcoming} />
                </Card>
              </div>
              <div className="space-y-[8px]">
                <Card>
                  <CardHeader title={t('dashboard.topCategories')} />
                  <TopCategoriesSection categories={categoryRows} />
                </Card>
              </div>
            </div>

            {/* Top 3 most expensive */}
            {top3.length > 0 && (
              <div className="overflow-x-hidden mt-3">
                <h3 className="text-[17px] font-bold text-[#121212] dark:text-[#F2F2F7] tracking-tight leading-tight mb-4">
                  {t('dashboard.topExpensive')}
                </h3>
                <TopExpensiveSection subscriptions={top3} />
              </div>
            )}
          </>
        )}
      </DashboardCardStack>
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
