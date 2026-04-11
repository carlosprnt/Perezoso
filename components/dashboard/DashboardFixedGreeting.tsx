'use client'

import { motion, useMotionValue, useTransform } from 'framer-motion'
import UserAvatarMenu from '@/components/dashboard/UserAvatarMenu'
import { useSurfaceProgress } from '@/components/ui/DraggableSurface'
import { useT } from '@/lib/i18n/LocaleProvider'

/**
 * Dashboard greeting row (avatar + "Hola X") that sits fixed above the
 * draggable surface. When the surface is lowered and the dark backdrop
 * is revealed, the text color interpolates from dark to white.
 *
 * Rendered only on mobile via DraggableSurface's fixedHeader slot.
 */
export default function DashboardFixedGreeting({
  firstName,
  shareText,
}: {
  firstName: string
  shareText: string
}) {
  const t = useT()
  const progress = useSurfaceProgress()

  // Fallback static motion value when no provider is mounted (SSR / desktop)
  const fallback = useMotionValue(0)
  const p = progress ?? fallback

  // Text color: dark (#121212) at raised → white (#F2F2F7) at lowered
  const textColor = useTransform(p, [0, 0.25], ['#121212', '#F2F2F7'])

  const name = firstName || t('dashboard.greetingFallback')

  return (
    <div className="flex items-center justify-between">
      <motion.p
        className="text-[17px] font-bold"
        style={{ color: textColor }}
      >
        {t('dashboard.greeting')} {name}.
      </motion.p>
      <UserAvatarMenu shareText={shareText} />
    </div>
  )
}
