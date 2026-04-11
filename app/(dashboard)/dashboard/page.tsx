import { createClient } from '@/lib/supabase/server'
import ScreenTracker from '@/lib/analytics/ScreenTracker'
import { enrichSubscriptions, getDashboardStats, getTopSpendCategories, getUpcomingRenewals, getTopExpensiveSubscriptions } from '@/lib/calculations/subscriptions'
import { formatCurrency } from '@/lib/utils/currency'
import { resolveSubscriptionLogoUrl } from '@/lib/constants/platforms'
import type { Subscription } from '@/types'
import { Card, CardHeader } from '@/components/ui/Card'
import UpcomingRenewals from '@/components/dashboard/UpcomingRenewals'
import TopExpensiveSection from '@/components/dashboard/TopExpensiveSection'
import TopCategoriesSection from '@/components/dashboard/TopCategoriesSection'
import DashboardCardStack from '@/components/dashboard/DashboardCardStack'
import DashboardSummaryHero from '@/components/dashboard/DashboardSummaryHero'
import EmptyDashboardHero from '@/components/dashboard/EmptyDashboardHero'
import CalendarModalButton from '@/components/dashboard/CalendarModalButton'
import Insights from '@/components/dashboard/Insights'
import DashboardReminderCards from '@/components/dashboard/DashboardReminderCards'
import QuickAddPlatforms from '@/components/dashboard/QuickAddPlatforms'
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

  const activeSubs = subs.filter(s => s.status === 'active' || s.status === 'trial')
  const currencyCounts: Record<string, number> = {}
  for (const s of activeSubs) currencyCounts[s.currency] = (currencyCounts[s.currency] ?? 0) + 1
  const dominantCurrency = Object.entries(currencyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'EUR'

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
      <ScreenTracker kind="dashboard" subscriptionCount={subs.length} />
      {isEmpty ? (
        <EmptyDashboardHero firstName={firstName} shareText={shareText} />
      ) : (
        <DashboardSummaryHero
          firstName={firstName}
          stats={stats}
          sharedCount={sharedCount}
          shareText={shareText}
          logoUrls={activeLogoUrls}
        />
      )}

      <DashboardCardStack>
        {isEmpty ? (
          <QuickAddPlatforms />
        ) : (
          <>
            <DashboardReminderCards subscriptions={subs} />
            <Insights subscriptions={subs} stats={stats} />
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
                  <TopCategoriesSection categories={categoryRows} currency={dominantCurrency} />
                </Card>
              </div>
            </div>
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

