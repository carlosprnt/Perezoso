'use client'

import Link from 'next/link'
import { Users } from 'lucide-react'
import LogoAvatar from '@/components/ui/LogoAvatar'
import { StatusBadge, CategoryBadge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils/currency'
import { formatRelativeDate } from '@/lib/utils/dates'
import { getCategoryMeta } from '@/lib/constants/categories'
import { BILLING_PERIOD_LABELS } from '@/lib/constants/currencies'
import type { SubscriptionWithCosts } from '@/types'

interface SubscriptionCardProps {
  subscription: SubscriptionWithCosts
}

export default function SubscriptionCard({ subscription: sub }: SubscriptionCardProps) {
  const meta = getCategoryMeta(sub.category)

  return (
    <Link href={`/subscriptions/${sub.id}/edit`}>
      <div className="
        bg-white rounded-2xl border border-gray-100
        shadow-[0_2px_12px_0_rgba(0,0,0,0.05)]
        hover:shadow-[0_4px_20px_0_rgba(0,0,0,0.09)]
        hover:border-gray-200
        transition-all duration-200
        p-4
        flex items-center gap-4
      ">
        <LogoAvatar name={sub.name} logoUrl={sub.logo_url} size="md" />

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900 leading-tight">{sub.name}</p>
            <StatusBadge status={sub.status} />
          </div>

          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <CategoryBadge
              label={meta.label}
              color={meta.color}
              textColor={meta.textColor}
              emoji={meta.emoji}
            />
            <span className="text-xs text-gray-400">
              {formatCurrency(sub.price_amount, sub.currency)} / {BILLING_PERIOD_LABELS[sub.billing_period]}
            </span>
            {sub.is_shared && (
              <span className="inline-flex items-center gap-0.5 text-xs text-blue-600">
                <Users size={11} />
                {sub.shared_with_count}
              </span>
            )}
          </div>

          {sub.next_billing_date && (
            <p className="text-xs text-gray-400 mt-1">
              Next: {formatRelativeDate(sub.next_billing_date)}
            </p>
          )}
        </div>

        {/* Right: costs */}
        <div className="text-right flex-shrink-0">
          <p className="text-base font-bold text-gray-900 tabular-nums leading-tight">
            {formatCurrency(sub.my_monthly_cost, sub.currency)}
          </p>
          <p className="text-xs text-gray-400">/ mo</p>
          {sub.is_shared && (
            <p className="text-xs text-blue-500 mt-0.5 font-medium">my share</p>
          )}
        </div>
      </div>
    </Link>
  )
}
