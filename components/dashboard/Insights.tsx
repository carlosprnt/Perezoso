'use client'

import type { SubscriptionWithCosts, DashboardStats } from '@/types'
import { formatCurrency } from '@/lib/utils/currency'
import { getHighestCostSubscription, getTopSpendCategories } from '@/lib/calculations/subscriptions'
import { getCategoryMeta } from '@/lib/constants/categories'
import { TrendingUp, Users } from 'lucide-react'
import { useT, useLocale } from '@/lib/i18n/LocaleProvider'
import type { Category } from '@/types'

interface InsightsProps {
  subscriptions: SubscriptionWithCosts[]
  stats: DashboardStats
}

// ─── Individual horizontal card ──────────────────────────────────────────────
// Layout: [Icon]  label (small)        rightTop
//                 title (bold)         rightBottom
function InsightCell({
  icon,
  iconCls,
  label,
  value,
  rightTop,
  rightBottom,
}: {
  icon: React.ReactNode
  iconCls: string
  label: string
  value: string
  rightTop?: string
  rightBottom?: string
}) {
  return (
    <div className="bg-white dark:bg-[#1C1C1E] rounded-[32px] px-4 py-3 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${iconCls}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] text-[#737373] dark:text-[#8E8E93] mb-0.5">{label}</p>
        <p className="text-[17px] font-bold text-[#000000] dark:text-[#F2F2F7] leading-snug truncate">{value}</p>
      </div>
      {(rightTop || rightBottom) && (
        <div className="text-right flex-shrink-0">
          {rightTop && <p className="text-[12px] text-[#000000] dark:text-[#F2F2F7] font-semibold leading-snug">{rightTop}</p>}
          {rightBottom && <p className="text-[12px] text-[#737373] dark:text-[#8E8E93] mt-0.5">{rightBottom}</p>}
        </div>
      )}
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
  const sharedSubs = subscriptions.filter(
    (s) => s.is_shared && (s.status === 'active' || s.status === 'trial')
  )

  const topCat = topCategories[0] ?? null

  if (!highest && !topCat && sharedSubs.length === 0) return null

  // Top category meta
  const catMeta = topCat ? getCategoryMeta(topCat.category as Category) : null
  const CatIcon = catMeta?.icon

  // Shared savings
  const sharedSavings = sharedSubs.reduce(
    (acc, s) => acc + (s.monthly_equivalent_cost - s.my_monthly_cost),
    0
  )

  const perMonth = t('dashboard.perMonth')

  return (
    <div className="flex flex-col gap-2">

      {/* ① Highest cost */}
      <InsightCell
        icon={<TrendingUp size={20} />}
        iconCls="bg-[#F5F5F5] text-[#000000]"
        label={t('dashboard.highestCost')}
        value={highest?.name ?? '—'}
        rightTop={highest ? `${formatCurrency(highest.my_monthly_cost, highest.currency)} /mes` : undefined}
        rightBottom={highest ? t(`categories.${highest.category}` as Parameters<typeof t>[0]) : undefined}
      />

      {/* ② Top category */}
      <InsightCell
        icon={CatIcon ? <CatIcon size={20} /> : null}
        iconCls={catMeta ? `${catMeta.color} ${catMeta.textColor}` : 'bg-[#F5F5F5] text-[#000000]'}
        label={t('dashboard.topCategory')}
        value={topCat ? t(`categories.${topCat.category}` as Parameters<typeof t>[0]) : '—'}
        rightTop={topCat ? `${formatCurrency(topCat.monthly_cost, dominantCurrency, locale)} /mes` : undefined}
        rightBottom={topCat ? `${topCat.count} ${locale === 'es' ? 'suscr.' : 'subs'}` : undefined}
      />

      {/* ③ Shared plans */}
      <InsightCell
        icon={<Users size={20} />}
        iconCls="bg-[#F5F5F5] text-[#000000] dark:bg-[#2C2C2E] dark:text-[#E5E5EA]"
        label={t('dashboard.sharedPlans')}
        value={
          sharedSubs.length > 0
            ? `${sharedSubs.length} ${locale === 'es' ? (sharedSubs.length === 1 ? 'plan' : 'planes') : (sharedSubs.length === 1 ? 'plan' : 'plans')}`
            : t('dashboard.noPlans')
        }
        rightTop={sharedSubs.length > 0 ? formatCurrency(sharedSavings, dominantCurrency, locale) : undefined}
        rightBottom={sharedSubs.length > 0 ? '/mes' : undefined}
      />

    </div>
  )
}
