'use client'

import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useT, useLocale } from '@/lib/i18n/LocaleProvider'
import SubscriptionAvatar from '@/components/subscriptions/SubscriptionAvatar'
import SubscriptionDetailOverlay from '@/components/subscriptions/SubscriptionDetailOverlay'
import { formatCurrency } from '@/lib/utils/currency'
import { resolveSubscriptionLogoUrl } from '@/lib/constants/platforms'
import type { UpcomingRenewal, SubscriptionWithCosts } from '@/types'

interface Props {
  renewals: UpcomingRenewal[]
}

export default function UpcomingRenewals({ renewals }: Props) {
  const t = useT()
  const locale = useLocale()
  const [selectedSub, setSelectedSub] = useState<SubscriptionWithCosts | null>(null)
  const [closingSubId, setClosingSubId] = useState<string | null>(null)

  function openSub(sub: SubscriptionWithCosts) {
    setSelectedSub(sub)
    setClosingSubId(null)
  }

  function closeSub() {
    if (selectedSub) setClosingSubId(selectedSub.id)
  }

  const overlayVisible = selectedSub !== null && closingSubId !== selectedSub.id

  if (renewals.length === 0) {
    return <p className="text-sm text-[#737373] py-2">{t('dashboard.noUpcoming')}</p>
  }

  const shown = renewals.slice(0, 3)

  function daysLabel(days: number): string {
    if (days === 0) return t('dashboard.dueToday')
    return t('dashboard.inDays').replace('{days}', String(days))
  }

  return (
    <>
      <div className="space-y-3.5">
        {shown.map((r) => (
          <button
            key={r.subscription.id}
            onClick={() => openSub(r.subscription)}
            className="w-full flex items-center gap-3 text-left active:opacity-70 transition-opacity"
          >
            <SubscriptionAvatar
              name={r.subscription.name}
              logoUrl={resolveSubscriptionLogoUrl(r.subscription.name, r.subscription.logo_url)}
              size="sm40"
              corner="rounded-[8px]"
            />
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-[#000000] dark:text-[#F2F2F7] truncate leading-snug">
                {r.subscription.name}
              </p>
              <p className="text-[12px] text-[#737373] dark:text-[#8E8E93] mt-0.5">
                {formatCurrency(r.subscription.my_monthly_cost, r.subscription.currency)}
                {' '}{t('dashboard.perMonth')}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[14px] font-normal tabular-nums text-[#737373] dark:text-[#AEAEB2]">
                {daysLabel(r.days_until)}
              </p>
            </div>
          </button>
        ))}
      </div>

      <AnimatePresence onExitComplete={() => { setSelectedSub(null); setClosingSubId(null) }}>
        {overlayVisible && selectedSub && (
          <SubscriptionDetailOverlay
            sub={selectedSub}
            onClose={closeSub}
            isClosing={closingSubId === selectedSub.id}
          />
        )}
      </AnimatePresence>
    </>
  )
}
