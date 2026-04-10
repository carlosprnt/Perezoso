'use client'

import type { SubscriptionWithCosts, DashboardStats } from '@/types'
import { formatCurrency } from '@/lib/utils/currency'
import { getHighestCostSubscription, getTopSpendCategories, getUpcomingRenewals } from '@/lib/calculations/subscriptions'
import { getCategoryMeta } from '@/lib/constants/categories'
import { AlertCircle, TrendingUp, Users } from 'lucide-react'
import { useT, useLocale } from '@/lib/i18n/LocaleProvider'
import type { Category } from '@/types'

interface InsightsProps {
  subscriptions: SubscriptionWithCosts[]
  stats: DashboardStats
}

// ─── Individual horizontal card ──────────────────────────────────────────────
function InsightCell({
  icon,
  iconCls,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  iconCls: string
  label: string
  value: string
  sub: string
}) {
  return (
    <div className="bg-white dark:bg-[#1C1C1E] rounded-[16px] px-4 py-3 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${iconCls}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-[#737373] dark:text-[#8E8E93] font-medium mb-0.5">{label}</p>
        <p className="text-[17px] font-bold text-[#121212] dark:text-[#F2F2F7] leading-snug truncate">{value}</p>
        {sub && <p className="text-[12px] text-[#737373] dark:text-[#8E8E93] mt-0.5 leading-snug truncate">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Insights({ subscriptions, stats }: InsightsProps) {
  const t = useT()
  const locale = useLocale()

  // Dominant currency: the currency used by the most active subscriptions
  const dominantCurrency = (() => {
    const active = subscriptions.filter(s => s.status === 'active' || s.status === 'trial')
    const counts: Record<string, number> = {}
    for (const s of active) counts[s.currency] = (counts[s.currency] ?? 0) + 1
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'EUR'
  })()

  const highest = getHighestCostSubscription(subscriptions)
  const topCategories = getTopSpendCategories(subscriptions, 3)
  const urgentRenewals = getUpcomingRenewals(subscriptions, 7)
  const sharedSubs = subscriptions.filter(
    (s) => s.is_shared && (s.status === 'active' || s.status === 'trial')
  )

  const topCat = topCategories[0] ?? null
  const nextRenewal = urgentRenewals[0] ?? null

  if (!highest && !topCat && sharedSubs.length === 0 && !nextRenewal) return null

  // Top category meta
  const catMeta = topCat ? getCategoryMeta(topCat.category as Category) : null
  const CatIcon = catMeta?.icon

  // Shared savings
  const sharedSavings = sharedSubs.reduce(
    (acc, s) => acc + (s.monthly_equivalent_cost - s.my_monthly_cost),
    0
  )

  const perMonth = t('dashboard.perMonth')

  // "Renews soon" sub-label
  const renewsSub = nextRenewal
    ? (() => {
        const d = nextRenewal.days_until
        const when = d === 0
          ? t('dashboard.dueToday')
          : d === 1
          ? t('dashboard.tomorrow')
          : t('dashboard.inDays').replace('{days}', String(d))
        return `${when} · ${formatCurrency(nextRenewal.subscription.my_monthly_cost, nextRenewal.subscription.currency)}`
      })()
    : ''

  return (
    <div className="flex flex-col gap-2">

      {/* ① Highest cost */}
      <InsightCell
        icon={<TrendingUp size={20} />}
        iconCls="bg-[#F5F5F5] text-[#424242]"
        label={t('dashboard.highestCost')}
        value={highest?.name ?? '—'}
        sub={
          highest
            ? `${formatCurrency(highest.my_monthly_cost, highest.currency)} ${perMonth} · ${t(`categories.${highest.category}` as Parameters<typeof t>[0])}`
            : ''
        }
      />

      {/* ② Top category */}
      <InsightCell
        icon={CatIcon ? <CatIcon size={20} /> : null}
        iconCls={catMeta ? `${catMeta.color} ${catMeta.textColor}` : 'bg-[#F5F5F5] text-[#424242]'}
        label={t('dashboard.topCategory')}
        value={topCat ? t(`categories.${topCat.category}` as Parameters<typeof t>[0]) : '—'}
        sub={
          topCat
            ? `${formatCurrency(topCat.monthly_cost, dominantCurrency, locale)} ${perMonth} · ${topCat.count} ${locale === 'es' ? 'suscr.' : 'subs'}`
            : ''
        }
      />

      {/* ③ Shared plans */}
      <InsightCell
        icon={<Users size={20} />}
        iconCls="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
        label={t('dashboard.sharedPlans')}
        value={
          sharedSubs.length > 0
            ? `${sharedSubs.length} ${locale === 'es' ? (sharedSubs.length === 1 ? 'plan' : 'planes') : (sharedSubs.length === 1 ? 'plan' : 'plans')}`
            : t('dashboard.noPlans')
        }
        sub={
          sharedSubs.length > 0
            ? t('dashboard.saving').replace('{amount}', `${formatCurrency(sharedSavings, dominantCurrency, locale)} ${perMonth}`)
            : ''
        }
      />

      {/* ④ Renews soon */}
      <InsightCell
        icon={<AlertCircle size={20} />}
        iconCls="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
        label={t('dashboard.renewsSoon')}
        value={nextRenewal?.subscription.name ?? t('dashboard.noPlans')}
        sub={renewsSub}
      />

    </div>
  )
}
