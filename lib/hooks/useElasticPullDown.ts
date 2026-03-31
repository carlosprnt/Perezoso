'use client'

import { useEffect, useRef } from 'react'
import { useMotionValue, useSpring, type MotionValue } from 'framer-motion'

/**
 * Returns a spring-animated Y motion value that responds to pull-down gestures
 * when the page is already at the very top (scrollY === 0).
 *
 * Pull distance is heavily damped (sqrt curve, hard cap at 65 px) so the
 * effect feels premium and restrained rather than bouncy.
 *
 * On release: overdamped spring snaps back cleanly with no oscillation.
 */
export function useElasticPullDown(): MotionValue<number> {
  const pullY = useMotionValue(0)
  // Overdamped spring: snaps back quickly without bouncing
  const springY = useSpring(pullY, {
    stiffness: 400,
    damping: 50,
    mass: 0.8,
  })

  const startYRef = useRef(0)
  const pullingRef = useRef(false)

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      startYRef.current = e.touches[0].clientY
      pullingRef.current = false
    }

    const onTouchMove = (e: TouchEvent) => {
      // Don't interfere when a modal is open (body scroll is locked)
      // BottomSheet uses position:fixed; SubscriptionDetailOverlay uses overflow:hidden
      if (document.body.style.overflow === 'hidden' || document.body.style.position === 'fixed') return

      const delta = e.touches[0].clientY - startYRef.current

      // Not pulling downward — cancel any active pull
      if (delta <= 0) {
        if (pullingRef.current) {
          pullingRef.current = false
          pullY.set(0)
        }
        return
      }

      // Not at the very top — let native scroll handle it
      if (window.scrollY > 0) return

      // Prevent native overscroll / pull-to-refresh competing with our effect
      e.preventDefault()

      pullingRef.current = true
      // sqrt curve gives heavy damping: lots of resistance past the first few px
      // feel: responsive near zero, stiffens quickly, hard-stops at 65 px
      pullY.set(Math.min(Math.sqrt(delta) * 3.6, 65))
    }

    const onRelease = () => {
      if (pullingRef.current) {
        pullingRef.current = false
        pullY.set(0) // spring takes it back smoothly
      }
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    // non-passive so we can call preventDefault and own the gesture
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onRelease, { passive: true })
    window.addEventListener('touchcancel', onRelease, { passive: true })

    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onRelease)
      window.removeEventListener('touchcancel', onRelease)
    }
  }, [pullY])

  return springY
}
