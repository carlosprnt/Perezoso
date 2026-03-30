import type { SubscriptionWithCosts, DashboardStats } from '@/types'
import { formatCurrency } from '@/lib/utils/currency'
import { getHighestCostSubscription, getTopSpendCategories, getUpcomingRenewals } from '@/lib/calculations/subscriptions'
import { getCategoryMeta } from '@/lib/constants/categories'
import { AlertCircle, TrendingUp, Users } from 'lucide-react'

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
      <p className="text-[11px] text-[#999999] font-medium uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-[14px] font-bold text-[#111111] leading-snug truncate">{value}</p>
      {sub && <p className="text-[12px] text-[#999999] mt-0.5 leading-snug line-clamp-2">{sub}</p>}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Insights({ subscriptions, stats }: InsightsProps) {
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
  const catMeta = topCat ? getCategoryMeta(topCat.category) : null
  const CatIcon = catMeta?.icon

  // Shared savings
  const sharedSavings = sharedSubs.reduce(
    (acc, s) => acc + (s.monthly_equivalent_cost - s.my_monthly_cost),
    0
  )

  return (
    <div className="bg-white rounded-[20px] border border-[#E8E8E8] overflow-hidden">
      <div className="grid grid-cols-2">

        {/* ① Highest cost */}
        <InsightCell
          icon={<TrendingUp size={13} />}
          iconCls="bg-[#F5F5F5] text-[#424242]"
          label="Highest cost"
          value={highest?.name ?? '—'}
          sub={
            highest
              ? `${formatCurrency(highest.my_monthly_cost, highest.currency)} / mo · ${getCategoryMeta(highest.category).label}`
              : ''
          }
          border="border-r border-b border-[#F0F0F0]"
        />

        {/* ② Top category */}
        <InsightCell
          icon={CatIcon ? <CatIcon size={13} /> : null}
          iconCls={catMeta ? `${catMeta.color} ${catMeta.textColor}` : 'bg-[#F5F5F5] text-[#424242]'}
          label="Top category"
          value={catMeta?.label ?? '—'}
          sub={
            topCat
              ? `${formatCurrency(topCat.monthly_cost, 'EUR')} / mo · ${topCat.count} subs`
              : ''
          }
          border="border-b border-[#F0F0F0]"
        />

        {/* ③ Shared plans */}
        <InsightCell
          icon={<Users size={13} />}
          iconCls="bg-blue-100 text-blue-700"
          label="Shared plans"
          value={sharedSubs.length > 0 ? `${sharedSubs.length} plan${sharedSubs.length > 1 ? 's' : ''}` : 'None'}
          sub={
            sharedSubs.length > 0
              ? `Saving ${formatCurrency(sharedSavings, 'EUR')} / mo`
              : ''
          }
          border="border-r border-[#F0F0F0]"
        />

        {/* ④ Renews soon */}
        <InsightCell
          icon={<AlertCircle size={13} />}
          iconCls="bg-amber-100 text-amber-700"
          label="Renews soon"
          value={nextRenewal?.subscription.name ?? 'None'}
          sub={
            nextRenewal
              ? `${nextRenewal.days_until === 0 ? 'Today' : `In ${nextRenewal.days_until} day${nextRenewal.days_until === 1 ? '' : 's'}`} · ${formatCurrency(nextRenewal.subscription.my_monthly_cost, nextRenewal.subscription.currency)}`
              : ''
          }
          border=""
        />

      </div>
    </div>
  )
}
