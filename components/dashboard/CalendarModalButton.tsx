'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays } from 'lucide-react'
import BottomSheet from '@/components/ui/BottomSheet'
import CalendarView from '@/components/calendar/CalendarView'
import type { SubscriptionWithCosts } from '@/types'

export default function CalendarModalButton({
  subscriptions,
}: {
  subscriptions: SubscriptionWithCosts[]
}) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Only render portal on the client
  useEffect(() => { setMounted(true) }, [])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#F5F5F5] dark:bg-[#2C2C2E] text-[#000000] dark:text-[#AEAEB2] active:opacity-70 transition-opacity"
        aria-label="Abrir calendario"
      >
        <CalendarDays size={16} strokeWidth={2} />
      </button>

      {/* Portal to document.body so z-index is in the root stacking context,
          above FloatingNav (z-50) and DashboardCardStack (z-10) */}
      {mounted && createPortal(
        <BottomSheet isOpen={open} onClose={() => setOpen(false)} height="full">
          <div className="px-5 pt-3 pb-5">
            <CalendarView subscriptions={subscriptions} />
          </div>
        </BottomSheet>,
        document.body
      )}
    </>
  )
}
