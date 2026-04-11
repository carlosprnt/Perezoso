'use client'

import { useRef, useState } from 'react'
import { AnimatePresence, LayoutGroup } from 'framer-motion'
import { CardStack } from '@/components/subscriptions/SubscriptionsView'
import SubscriptionDetailOverlay from '@/components/subscriptions/SubscriptionDetailOverlay'
import { formatCurrency } from '@/lib/utils/currency'
import { useT } from '@/lib/i18n/LocaleProvider'
import type { SubscriptionWithCosts, DashboardStats } from '@/types'

/**
 * Dark back layer rendered behind the draggable foreground on the
 * dashboard screen. Reuses the same `CardStack` component as the
 * /subscriptions route so the wallet cards get identical scroll-velocity
 * parallax and per-card exit transforms — but keyed off this panel's
 * own inner scroll container.
 *
 * Uses a distinct `layoutIdPrefix` to avoid shared-element layoutId
 * collisions with the /subscriptions route.
 */
export default function DashboardWalletBackdrop({
  subscriptions,
  stats,
}: {
  subscriptions: SubscriptionWithCosts[]
  stats: DashboardStats
}) {
  const t = useT()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState<SubscriptionWithCosts | null>(null)
  const [closing, setClosing] = useState<string | null>(null)

  const activeSubs = subscriptions.filter(
    s => s.status === 'active' || s.status === 'trial'
  )

  function openSub(sub: SubscriptionWithCosts) {
    setClosing(null)
    setSelected(sub)
  }

  function closeSub() {
    if (selected) setClosing(selected.id)
    setSelected(null)
  }

  return (
    <LayoutGroup id="dashboard-wallet">
      <div
        ref={scrollRef}
        className="h-full overflow-y-auto px-5 pt-8 pb-40"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* Heading */}
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white/50">
          {t('subscriptions.title')}
        </p>
        <h2 className="mt-2 text-[32px] font-bold tracking-tight leading-[1.1] text-white">
          {formatCurrency(stats.total_monthly_cost, 'EUR')}
          <span className="text-[15px] font-medium text-white/60 ml-2">/mes</span>
        </h2>
        <p className="mt-2 text-[14px] text-white/60">
          {activeSubs.length === 1
            ? '1 suscripción activa'
            : `${activeSubs.length} suscripciones activas`}
        </p>

        {/* Wallet card stack */}
        <div className="mt-8">
          {activeSubs.length === 0 ? (
            <p className="text-[14px] text-white/50 mt-4">
              Aún no tienes suscripciones activas.
            </p>
          ) : (
            <CardStack
              subscriptions={activeSubs}
              selectedSubId={selected?.id ?? null}
              onOpen={openSub}
              viewMode="monthly"
              numSkeleton={false}
              scrollContainerRef={scrollRef}
              disableElasticPull
              layoutIdPrefix="dashboard-card"
              variant="dark"
            />
          )}
        </div>
      </div>

      {/* Detail overlay — matches layoutIdPrefix for shared-element transitions */}
      <AnimatePresence onExitComplete={() => setClosing(null)}>
        {selected && (
          <SubscriptionDetailOverlay
            sub={selected}
            onClose={closeSub}
            isClosing={closing === selected.id}
          />
        )}
      </AnimatePresence>
    </LayoutGroup>
  )
}
