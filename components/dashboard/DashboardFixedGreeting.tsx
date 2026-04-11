'use client'

import { motion, useMotionValue, useTransform } from 'framer-motion'
import UserAvatarMenu from '@/components/dashboard/UserAvatarMenu'
import { useSurfaceProgress } from '@/components/ui/DraggableSurface'
import { useT } from '@/lib/i18n/LocaleProvider'

/**
 * Fixed greeting + avatar overlay rendered above the DraggableSurface.
 * Stays anchored at the top of the viewport during the drag-to-reveal
 * gesture, with its text color interpolating from dark to white as the
 * dark backdrop layer is revealed.
 *
 * Mounted only on mobile via the `fixedHeader` slot.
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
  const fallback = useMotionValue(0)
  const p = progress ?? fallback

  // Visible only when the surface is being dragged / is lowered.
  // Fades in fast (full visibility by ~15% progress) so the crossfade
  // with the internal greeting (which is moving down with the surface)
  // feels instant.
  const opacity = useTransform(p, [0, 0.08], [0, 1])
  // No pointer events when invisible, so the internal avatar below
  // still receives taps in the raised state.
  const pointerEvents = useTransform(p, (v) => (v > 0.02 ? 'auto' : 'none'))
  // Text color interpolates dark → white as the backdrop is revealed.
  const textColor = useTransform(p, [0, 0.3], ['#121212', '#F2F2F7'])

  const name = firstName || t('dashboard.greetingFallback')

  // Tapping the avatar while the surface is lowered should dismiss it,
  // bringing the foreground back up.
  function handleTap() {
    window.dispatchEvent(new Event('oso:hide-analytics'))
  }

  return (
    <motion.div
      className="flex items-center justify-between"
      style={{ opacity, pointerEvents }}
    >
      <motion.p
        className="text-[17px] font-bold"
        style={{ color: textColor }}
      >
        {t('dashboard.greeting')} {name}.
      </motion.p>
      <UserAvatarMenu shareText={shareText} onTap={handleTap} />
    </motion.div>
  )
}
