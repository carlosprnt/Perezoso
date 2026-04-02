'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Bell } from 'lucide-react'
import SavingsCarousel from './SavingsCarousel'
import { detectSavingsOpportunities } from '@/lib/calculations/savings'
import { useT } from '@/lib/i18n/LocaleProvider'
import type { CarouselItem } from './SavingsCarousel'
import type { SubscriptionWithCosts } from '@/types'

// ─── Toast ────────────────────────────────────────────────────────────────────

function ReminderToast({ onDone }: { onDone: () => void }) {
  const t = useT()
  const [exiting, setExiting] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setExiting(true)
      setTimeout(onDone, 340)
    }, 3200)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [onDone])

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[999] flex items-center gap-3 px-5 py-4"
      style={{
        background: '#00E676',
        paddingTop: 'calc(16px + env(safe-area-inset-top))',
        animation: exiting
          ? 'toast-exit 0.34s cubic-bezier(0.4,0,1,1) forwards'
          : 'toast-enter 0.38s cubic-bezier(0.22,1,0.36,1) forwards',
      }}
    >
      <Bell size={20} strokeWidth={2.2} color="#000"
        style={{ animation: 'bell-ring 0.9s ease-in-out 0.1s 1', transformOrigin: 'top center', flexShrink: 0 }} />
      <p className="text-[14px] font-medium text-black leading-snug flex-1">
        {t('reminder.toastText')}
      </p>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DashboardReminderCards({ subscriptions }: { subscriptions: SubscriptionWithCosts[] }) {
  const [done,      setDone]      = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [mounted,   setMounted]   = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const opportunities = useMemo(() => detectSavingsOpportunities(subscriptions), [subscriptions])

  // Unified list: reminder card first, then savings opportunities
  const items = useMemo<CarouselItem[]>(() => [
    { kind: 'reminder' },
    ...opportunities.map(opp => ({ kind: 'savings' as const, opportunity: opp })),
  ], [opportunities])

  if (done) return null

  return (
    <>
      <SavingsCarousel
        items={items}
        onReminderActivate={() => setShowToast(true)}
        onAllDismissed={() => setDone(true)}
      />

      {mounted && showToast && createPortal(
        <ReminderToast onDone={() => setShowToast(false)} />,
        document.body
      )}
    </>
  )
}
