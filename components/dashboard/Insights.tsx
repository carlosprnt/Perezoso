import type { SubscriptionWithCosts, DashboardStats } from '@/types'
import { formatCurrency } from '@/lib/utils/currency'
import { getHighestCostSubscription, getTopSpendCategories, getUpcomingRenewals } from '@/lib/calculations/subscriptions'
import { getCategoryMeta } from '@/lib/constants/categories'
import LogoAvatar from '@/components/ui/LogoAvatar'
import { AlertCircle, TrendingUp, Users, Zap } from 'lucide-react'

interface InsightsProps {
  subscriptions: SubscriptionWithCosts[]
  stats: DashboardStats
}

export default function Insights({ subscriptions, stats }: InsightsProps) {
  const highest = getHighestCostSubscription(subscriptions)
  const topCategories = getTopSpendCategories(subscriptions, 3)
  const urgentRenewals = getUpcomingRenewals(subscriptions, 7)
  const sharedSubs = subscriptions.filter((s) => s.is_shared && (s.status === 'active' || s.status === 'trial'))
  const trialSubs = subscriptions.filter((s) => s.status === 'trial')

  const insights: Array<{
    icon: React.ReactNode
    label: string
    value: string
    sub: string
    color: string
  }> = []

  if (highest) {
    const meta = getCategoryMeta(highest.category)
    insights.push({
      icon: <TrendingUp size={14} />,
      label: 'Highest cost',
      value: highest.name,
      sub: `${formatCurrency(highest.my_monthly_cost, highest.currency)} / mo · ${meta.emoji} ${meta.label}`,
      color: 'text-violet-600 bg-violet-50',
    })
  }

  if (topCategories[0]) {
    const meta = getCategoryMeta(topCategories[0].category)
    insights.push({
      icon: <span>{meta.emoji}</span>,
      label: 'Top category',
      value: meta.label,
      sub: `${formatCurrency(topCategories[0].monthly_cost, 'EUR')} / mo · ${topCategories[0].count} subscriptions`,
      color: `${meta.textColor} ${meta.color}`,
    })
  }

  if (sharedSubs.length > 0) {
    insights.push({
      icon: <Users size={14} />,
      label: 'Shared plans',
      value: `${sharedSubs.length} subscriptions`,
      sub: `Saving ${formatCurrency(
        sharedSubs.reduce((acc, s) => acc + (s.monthly_equivalent_cost - s.my_monthly_cost), 0),
        'EUR'
      )} / mo by sharing`,
      color: 'text-blue-600 bg-blue-50',
    })
  }

  if (urgentRenewals.length > 0) {
    const next = urgentRenewals[0]
    insights.push({
      icon: <AlertCircle size={14} />,
      label: 'Renews soon',
      value: next.subscription.name,
      sub: `${next.days_until === 0 ? 'Today' : `In ${next.days_until} day${next.days_until === 1 ? '' : 's'}`} · ${formatCurrency(next.subscription.my_monthly_cost, next.subscription.currency)}`,
      color: 'text-amber-600 bg-amber-50',
    })
  }

  if (trialSubs.length > 0) {
    insights.push({
      icon: <Zap size={14} />,
      label: 'Active trials',
      value: `${trialSubs.length} trial${trialSubs.length > 1 ? 's' : ''}`,
      sub: trialSubs.map((s) => s.name).join(', '),
      color: 'text-emerald-600 bg-emerald-50',
    })
  }

  if (insights.length === 0) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {insights.map((insight, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_0_rgba(0,0,0,0.05)] p-4 flex items-start gap-3"
        >
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${insight.color}`}>
            {insight.icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-400 font-medium mb-0.5">{insight.label}</p>
            <p className="text-sm font-semibold text-gray-900 truncate">{insight.value}</p>
            <p className="text-xs text-gray-400 truncate">{insight.sub}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
