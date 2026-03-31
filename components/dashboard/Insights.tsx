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

// ─── Individual cell ──────────────────────────────────────────────────────────
function InsightCell({
  icon,
  iconCls,
  label,
  value,
  sub,
  border,
}: {
  icon: React.ReactNode
  iconCls: string
  label: string
  value: string
  sub: string
  border: string
}) {
  return (
    <div className={`p-4 ${border}`}>
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2.5 flex-shrink-0 ${iconCls}`}>
        {icon}
      </div>
      <p className="text-[11px] text-[#999999] dark:text-[#636366] font-medium mb-0.5">{label}</p>
      <p className="text-[14px] font-bold text-[#111111] dark:text-[#F2F2F7] leading-snug truncate">{value}</p>
      {sub && <p className="text-[12px] text-[#999999] dark:text-[#636366] mt-0.5 leading-snug line-clamp-2">{sub}</p>}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Insights({ subscriptions, stats }: InsightsProps) {
  const t = useT()
  const locale = useLocale()

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
    <div className="bg-white dark:bg-[#1C1C1E] rounded-[20px] border border-[#E8E8E8] dark:border-[#2C2C2E] overflow-hidden">
      <div className="grid grid-cols-2">

        {/* ① Highest cost */}
        <InsightCell
          icon={<TrendingUp size={13} />}
          iconCls="bg-[#F5F5F5] text-[#424242]"
          label={t('dashboard.highestCost')}
          value={highest?.name ?? '—'}
          sub={
            highest
              ? `${formatCurrency(highest.my_monthly_cost, highest.currency)} ${perMonth} · ${t(`categories.${highest.category}` as Parameters<typeof t>[0])}`
              : ''
          }
          border="border-r border-b border-[#F0F0F0] dark:border-[#2C2C2E]"
        />

        {/* ② Top category */}
        <InsightCell
          icon={CatIcon ? <CatIcon size={13} /> : null}
          iconCls={catMeta ? `${catMeta.color} ${catMeta.textColor}` : 'bg-[#F5F5F5] text-[#424242]'}
          label={t('dashboard.topCategory')}
          value={topCat ? t(`categories.${topCat.category}` as Parameters<typeof t>[0]) : '—'}
          sub={
            topCat
              ? `${formatCurrency(topCat.monthly_cost, 'EUR')} ${perMonth} · ${topCat.count} ${locale === 'es' ? 'suscr.' : 'subs'}`
              : ''
          }
          border="border-b border-[#F0F0F0] dark:border-[#2C2C2E]"
        />

        {/* ③ Shared plans */}
        <InsightCell
          icon={<Users size={13} />}
          iconCls="bg-blue-100 text-blue-700"
          label={t('dashboard.sharedPlans')}
          value={
            sharedSubs.length > 0
              ? `${sharedSubs.length} ${locale === 'es' ? (sharedSubs.length === 1 ? 'plan' : 'planes') : (sharedSubs.length === 1 ? 'plan' : 'plans')}`
              : t('dashboard.noPlans')
          }
          sub={
            sharedSubs.length > 0
              ? t('dashboard.saving').replace('{amount}', `${formatCurrency(sharedSavings, 'EUR')} ${perMonth}`)
              : ''
          }
          border="border-r border-[#F0F0F0] dark:border-[#2C2C2E]"
        />

        {/* ④ Renews soon */}
        <InsightCell
          icon={<AlertCircle size={13} />}
          iconCls="bg-amber-100 text-amber-700"
          label={t('dashboard.renewsSoon')}
          value={nextRenewal?.subscription.name ?? t('dashboard.noPlans')}
          sub={renewsSub}
          border=""
        />

      </div>
    </div>
  )
}
