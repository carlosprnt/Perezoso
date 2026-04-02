'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Bell } from 'lucide-react'

// ─── Toast ────────────────────────────────────────────────────────────────────

function ReminderToast({ onDone }: { onDone: () => void }) {
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
      <Bell
        size={20}
        strokeWidth={2.2}
        color="#000"
        style={{ animation: 'bell-ring 0.9s ease-in-out 0.1s 1', transformOrigin: 'top center', flexShrink: 0 }}
      />
      <p className="text-[14px] font-medium text-black leading-snug flex-1">
        Notificaciones activadas para tus renovaciones anuales
      </p>
    </div>
  )
}

// ─── Ringing bell icon ────────────────────────────────────────────────────────

function RingingBell() {
  const [ringing, setRinging] = useState(false)

  useEffect(() => {
    // Ring immediately on mount, then every 3s
    const trigger = () => {
      setRinging(true)
      setTimeout(() => setRinging(false), 900)
    }
    trigger()
    const interval = setInterval(trigger, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
      style={{ background: 'linear-gradient(135deg, #E8E6FF 0%, #D4CFFF 100%)' }}
    >
      <Bell
        size={26}
        strokeWidth={2}
        className="text-[#3D3BF3]"
        style={{
          transformOrigin: 'top center',
          animation: ringing ? 'bell-ring 0.9s ease-in-out forwards' : 'none',
        }}
      />
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export default function SlothReminderCard() {
  const [dismissed, setDismissed] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  function activate() {
    setDismissed(true)
    setShowToast(true)
  }

  return (
    <>
      {!dismissed && (
        <div
          className="relative flex items-center gap-4 bg-white dark:bg-[#1C1C1E] rounded-[20px] px-4 py-4 cursor-pointer active:scale-[0.98] transition-transform"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}
          onClick={activate}
        >
          <RingingBell />

          <div className="flex-1 min-w-0 pr-6">
            <p className="text-[14px] font-bold text-[#121212] dark:text-[#F2F2F7] leading-snug">
              Tienes 2 renovaciones anuales sin aviso.
            </p>
            <p className="text-[13px] text-[#737373] dark:text-[#8E8E93] mt-0.5 leading-snug">
              Podemos recordártelas antes del cobro para que no se te pasen.
            </p>
          </div>

          <button
            onClick={e => { e.stopPropagation(); setDismissed(true) }}
            className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.06)' }}
            aria-label="Cerrar"
          >
            <X size={11} strokeWidth={2.5} className="text-[#737373]" />
          </button>
        </div>
      )}

      {mounted && showToast && createPortal(
        <ReminderToast onDone={() => setShowToast(false)} />,
        document.body
      )}
    </>
  )
}

