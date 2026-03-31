'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, X } from 'lucide-react'
import CalendarView from '@/components/calendar/CalendarView'
import type { SubscriptionWithCosts } from '@/types'

export default function CalendarModalButton({
  subscriptions,
}: {
  subscriptions: SubscriptionWithCosts[]
}) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  const modal = open && (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-[#F7F8FA] dark:bg-[#1C1C1E] rounded-t-3xl overflow-y-auto"
        style={{ maxHeight: '92dvh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#E0E0E0] dark:bg-[#3A3A3C]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <h2 className="text-[17px] font-bold text-[#121212] dark:text-[#F2F2F7]">
            Calendario
          </h2>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[#E5E5EA] dark:bg-[#3A3A3C] text-[#121212] dark:text-[#F2F2F7]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Calendar */}
        <div className="px-4 pb-10">
          <CalendarView subscriptions={subscriptions} />
        </div>
      </div>
    </div>
  )

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-8 h-8 flex items-center justify-center rounded-xl bg-[#F5F5F5] dark:bg-[#2C2C2E] text-[#424242] dark:text-[#AEAEB2] active:opacity-70 transition-opacity"
        aria-label="Abrir calendario"
      >
        <Calendar size={16} />
      </button>

      {mounted && createPortal(modal, document.body)}
    </>
  )
}
