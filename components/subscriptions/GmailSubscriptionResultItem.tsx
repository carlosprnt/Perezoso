'use client'

import { Check } from '@/lib/icons'
import SubscriptionAvatar from './SubscriptionAvatar'
import { formatCurrency } from '@/lib/utils/currency'
import type { DetectedSubscription } from '@/types/detected-subscription'

const BILLING_SHORT: Record<string, string> = {
  monthly: '/mo',
  yearly: '/yr',
  quarterly: '/qtr',
  weekly: '/wk',
  custom: '',
}

const CONFIDENCE_LABEL: Record<string, string> = {
  high: '',
  medium: '',
  low: 'Low confidence · ',
}

interface Props {
  candidate: DetectedSubscription
  selected: boolean
  onToggle: () => void
}

export default function GmailSubscriptionResultItem({ candidate, selected, onToggle }: Props) {
  const hasPriceData = candidate.price_amount !== null && candidate.price_amount > 0

  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-5 py-3 rounded-2xl transition-colors duration-100 text-left"
      style={{
        background: selected ? 'rgba(61,59,243,0.08)' : 'transparent',
        border: `1.5px solid ${selected ? '#000000' : 'var(--border-result-item)'}`,
      }}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <SubscriptionAvatar
          name={candidate.name}
          logoUrl={candidate.logoUrl}
          size="md48"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-[#000000] dark:text-[#F2F2F7] leading-snug truncate">
          {candidate.name}
        </p>
        <p className="text-[12px] text-[#A0A0A0] dark:text-[#8E8E93] mt-0.5 leading-snug truncate">
          {CONFIDENCE_LABEL[candidate.confidence]}
          {candidate.source_hint}
        </p>
      </div>

      {/* Price + checkbox */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="text-right">
          {hasPriceData ? (
            <>
              <p className="text-[14px] font-semibold text-[#000000] dark:text-[#F2F2F7] tabular-nums leading-none">
                {formatCurrency(candidate.price_amount!, candidate.currency ?? 'EUR')}
              </p>
              <p className="text-[11px] text-[#AAAAAA] dark:text-[#8E8E93] mt-0.5 leading-none">
                {BILLING_SHORT[candidate.billing_period ?? 'monthly'] ?? '/mo'}
              </p>
            </>
          ) : (
            <p className="text-[13px] text-[#C0C0C0]">—</p>
          )}
        </div>

        {/* Checkbox */}
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-100"
          style={{
            background: selected ? '#000000' : 'transparent',
            border: `2px solid ${selected ? '#000000' : '#D4D4D4'}`,
          }}
        >
          {selected && <Check size={12} strokeWidth={3} className="text-white" />}
        </div>
      </div>
    </button>
  )
}
