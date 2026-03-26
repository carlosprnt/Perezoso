'use client'

import Link from 'next/link'
import { Users, ChevronRight } from 'lucide-react'
import LogoAvatar from '@/components/ui/LogoAvatar'
import { StatusBadge, CategoryBadge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils/currency'
import { formatRelativeDate } from '@/lib/utils/dates'
import { getCategoryMeta } from '@/lib/constants/categories'
import { BILLING_PERIOD_LABELS } from '@/lib/constants/currencies'
import type { SubscriptionWithCosts } from '@/types'

interface SubscriptionCardProps {
  subscription: SubscriptionWithCosts
  index?: number
}

export default function SubscriptionCard({ subscription: sub, index = 0 }: SubscriptionCardProps) {
  const meta = getCategoryMeta(sub.category)
  const Icon = meta.icon

  return (
    <Link href={`/subscriptions/${sub.id}/edit`}>
      <div
        className="
          bg-white border border-[#D4D4D4] rounded-2xl p-4
          flex items-center gap-4
          hover:border-[#A3A3A3] hover:bg-[#FAFAFA]
          transition-colors duration-150 pressable
          animate-fade-in
        "
        style={{ animationDelay: `${index * 40}ms` }}
      >
        <LogoAvatar name={sub.name} logoUrl={sub.logo_url} size="md" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-[#121212] leading-tight">{sub.name}</p>
            <StatusBadge status={sub.status} />
          </div>

          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <CategoryBadge
              label={meta.label}
              color={meta.color}
              textColor={meta.textColor}
              Icon={Icon}
            />
            <span className="text-xs text-[#616161]">
              {formatCurrency(sub.price_amount, sub.currency)} / {BILLING_PERIOD_LABELS[sub.billing_period]}
            </span>
            {sub.is_shared && (
              <span className="inline-flex items-center gap-0.5 text-xs text-[#424242]">
                <Users size={11} strokeWidth={2} />
                {sub.shared_with_count}
              </span>
            )}
          </div>

          {sub.next_billing_date && (
            <p className="text-xs text-[#616161] mt-1">
              Renews {formatRelativeDate(sub.next_billing_date)}
            </p>
          )}
        </div>

        <div className="text-right flex-shrink-0 flex items-center gap-2">
          <div>
            <p className="text-base font-bold text-[#121212] tabular-nums leading-tight">
              {formatCurrency(sub.my_monthly_cost, sub.currency)}
            </p>
            <p className="text-xs text-[#616161]">
              {sub.is_shared ? 'my share' : '/ mo'}
            </p>
          </div>
          <ChevronRight size={14} className="text-[#A3A3A3] flex-shrink-0" />
        </div>
      </div>
    </Link>
  )
}
