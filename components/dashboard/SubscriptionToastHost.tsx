'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Check } from 'lucide-react'
import { subscriptionToastBus } from '@/lib/subscriptionToastBus'
import type { SubscriptionToastKind } from '@/lib/subscriptionToastBus'
import { useLocale } from '@/lib/i18n/LocaleProvider'

const LABELS: Record<SubscriptionToastKind, { es: string; en: string }> = {
  created: { es: 'Suscripción añadida correctamente',     en: 'Subscription added successfully'   },
  updated: { es: 'Suscripción actualizada correctamente', en: 'Subscription updated successfully' },
  deleted: { es: 'Suscripción eliminada correctamente',   en: 'Subscription deleted successfully'  },
}

function Toast({ kind, locale, onDone }: {
  kind: SubscriptionToastKind
  locale: string
  onDone: () => void
}) {
  const [exiting, setExiting] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setExiting(true)
      setTimeout(onDone, 340)
    }, 3200)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [onDone])

  const message = LABELS[kind][locale === 'es' ? 'es' : 'en']

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
      <Check size={20} strokeWidth={2.5} color="#000" style={{ flexShrink: 0 }} />
      <p className="text-[14px] font-medium text-[#000000] leading-snug flex-1">{message}</p>
    </div>
  )
}

/**
 * Mounted once in (dashboard)/layout.tsx. Listens to subscriptionToastBus
 * and renders the toast via createPortal to document.body — same pattern as
 * ReminderToast — so it renders above every stacking context.
 */
export default function SubscriptionToastHost() {
  const locale = useLocale()
  const [kind, setKind] = useState<SubscriptionToastKind | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => subscriptionToastBus.on(setKind), [])

  if (!mounted || !kind) return null
  return createPortal(
    <Toast kind={kind} locale={locale} onDone={() => setKind(null)} />,
    document.body,
  )
}
