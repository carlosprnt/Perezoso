'use client'

import { useRef, useEffect } from 'react'
import UserAvatarMenu from './UserAvatarMenu'
import { useT } from '@/lib/i18n/LocaleProvider'
import { useEffectiveScrollY } from '@/lib/hooks/useEffectiveScrollY'

interface Props {
  firstName: string
  shareText?: string
}

export default function EmptyDashboardHero({ firstName, shareText }: Props) {
  const t       = useT()
  const ref     = useRef<HTMLDivElement>(null)
  const scrollY = useEffectiveScrollY()
  const name    = firstName || t('dashboard.greetingFallback')

  useEffect(() => {
    return scrollY.on('change', (v: number) => {
      if (!ref.current) return
      const progress = Math.max(0, Math.min(1, v / 220))
      const opacity  = 1 - progress
      const blur     = progress * 12
      ref.current.style.opacity       = String(opacity)
      ref.current.style.filter        = blur > 0.1 ? `blur(${blur.toFixed(1)}px)` : ''
      ref.current.style.pointerEvents = opacity < 0.05 ? 'none' : 'auto'
    })
  }, [scrollY])

  return (
    <div ref={ref} className="sticky top-0 pb-5 bg-[#F7F8FA] dark:bg-[#121212]">
      {/* Greeting + avatar */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[17px] font-bold text-[#424242] dark:text-[#F2F2F7]">
          {t('dashboard.greeting')} {name}.
        </p>
        <UserAvatarMenu shareText={shareText} />
      </div>

      {/* Main empty statement */}
      <p className="text-[45px] font-extrabold text-[#424242] dark:text-[#F2F2F7] leading-[1.15] tracking-tight mb-2" style={{ maxWidth: '100%' }}>
        Aún no tienes ninguna suscripción añadida.
      </p>

      {/* Tagline */}
      <p className="text-[17px] font-bold text-[#424242] dark:text-[#F2F2F7] leading-snug">
        Empieza a añadir y descubre patrones de gasto y consejos de ahorro.
      </p>
    </div>
  )
}
