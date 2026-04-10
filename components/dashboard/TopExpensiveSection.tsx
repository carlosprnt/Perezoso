'use client'

import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import SubscriptionAvatar from '@/components/subscriptions/SubscriptionAvatar'
import SubscriptionDetailOverlay from '@/components/subscriptions/SubscriptionDetailOverlay'
import { resolveSubscriptionLogoUrl } from '@/lib/constants/platforms'
import { formatCurrency } from '@/lib/utils/currency'
import { useT } from '@/lib/i18n/LocaleProvider'
import type { SubscriptionWithCosts } from '@/types'

interface Props {
  subscriptions: SubscriptionWithCosts[]
}

export default function TopExpensiveSection({ subscriptions }: Props) {
  const t = useT()
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

  return (
    <>
      <div
        className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {subscriptions.map((sub, i) => (
          <button
            key={sub.id}
            onClick={() => openSub(sub)}
            className="flex-shrink-0 w-[185px] snap-start rounded-[32px] bg-white dark:bg-[#1C1C1E] p-4 text-left active:opacity-70 transition-opacity"
          >
            <span className="text-[11px] font-bold text-[#B0B0B0] dark:text-[#8E8E93] uppercase tracking-wider">
              #{i + 1}
            </span>
            <div className="mt-2 mb-3">
              <SubscriptionAvatar
                name={sub.name}
                logoUrl={resolveSubscriptionLogoUrl(sub.name, sub.logo_url)}
                size="md"
                corner="rounded-[8px]"
              />
            </div>
            <p className="text-[14px] font-bold text-[#121212] dark:text-[#F2F2F7] truncate leading-snug">{sub.name}</p>
            {sub.is_shared ? (
              <div className="mt-1.5 space-y-0.5">
                <p className="text-[12px] text-[#737373] dark:text-[#8E8E93]">
                  Total: {formatCurrency(sub.monthly_equivalent_cost, sub.currency)}/mo
                </p>
                <p className="text-[13px] font-semibold text-[#121212] dark:text-[#F2F2F7]">
                  {t('dashboard.yourShare')}: {formatCurrency(sub.my_monthly_cost, sub.currency)}/mo
                </p>
              </div>
            ) : (
              <p className="text-[15px] font-bold text-[#121212] dark:text-[#F2F2F7] tabular-nums mt-1.5">
                {formatCurrency(sub.my_monthly_cost, sub.currency)}
                <span className="text-[12px] font-normal text-[#737373] dark:text-[#8E8E93] ml-0.5">/mo</span>
              </p>
            )}
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
