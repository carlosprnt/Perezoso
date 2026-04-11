'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Bell } from 'lucide-react'
import SavingsCarousel from './SavingsCarousel'
import { detectSavingsOpportunities, countAnnualRenewalsWithoutReminder, sumAnnualSavings } from '@/lib/calculations/savings'
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
      <p className="text-[14px] font-medium text-[#424242] leading-snug flex-1">
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

  const opportunities  = useMemo(() => detectSavingsOpportunities(subscriptions), [subscriptions])
  const annualCount    = useMemo(() => countAnnualRenewalsWithoutReminder(subscriptions), [subscriptions])

  // At most 2 top-level cards: reminder + total savings summary
  const items = useMemo<CarouselItem[]>(() => {
    const list: CarouselItem[] = []
    if (annualCount > 0) list.push({ kind: 'reminder', annualCount })
    if (opportunities.length > 0) {
      const currency = opportunities[0]?.currency ?? 'EUR'
      list.push({ kind: 'totalSavings', totalAnnual: sumAnnualSavings(opportunities), currency })
    }
    return list
  }, [opportunities, annualCount])

  if (done) return null

  return (
    <>
      <div className="mb-2">
        <SavingsCarousel
          items={items}
          opportunities={opportunities}
          onReminderActivate={() => setShowToast(true)}
          onAllDismissed={() => setDone(true)}
        />
      </div>

      {mounted && showToast && createPortal(
        <ReminderToast onDone={() => setShowToast(false)} />,
        document.body
      )}
    </>
  )
}
