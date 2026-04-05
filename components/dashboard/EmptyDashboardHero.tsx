'use client'

import UserAvatarMenu from './UserAvatarMenu'
import { useT } from '@/lib/i18n/LocaleProvider'

interface Props {
  firstName: string
  shareText?: string
}

export default function EmptyDashboardHero({ firstName, shareText }: Props) {
  const t = useT()
  const name = firstName || t('dashboard.greetingFallback')

  return (
    <div className="sticky top-0 pb-5 bg-[#F7F8FA] dark:bg-[#111111]">
      {/* Greeting + avatar */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[17px] font-bold text-black dark:text-[#F2F2F7]">
          {t('dashboard.greeting')} {name}.
        </p>
        <UserAvatarMenu shareText={shareText} />
      </div>

      {/* Main empty statement */}
      <p className="text-[45px] font-extrabold text-[#121212] dark:text-[#F2F2F7] leading-[1.15] tracking-tight mb-2" style={{ maxWidth: '100%' }}>
        Aún no tienes ninguna suscripción añadida.
      </p>

      {/* Tagline */}
      <p className="text-[17px] font-bold text-[#8E8E93] dark:text-[#636366] leading-snug">
        Empieza a añadir y descubre patrones de gasto y consejos de ahorro.
      </p>
    </div>
  )
}
