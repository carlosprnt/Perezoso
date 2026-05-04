'use client'

import { useEffect } from 'react'
import { useMotionValue } from 'framer-motion'
import { useScrollContainer } from './ScrollContainerContext'

/**
 * Like Framer Motion's useScroll().scrollY but stays frozen at the correct
 * position when the overlay is open (body overflow:hidden preserves window.scrollY,
 * so we just read it normally — no position:fixed tricks needed).
 *
 * When wrapped in a `ScrollContainerProvider` (e.g. inside a draggable fixed
 * surface), returns the provided MotionValue instead of reading window.scrollY.
 */
export function useEffectiveScrollY() {
  const container = useScrollContainer()

  const windowScrollMv = useMotionValue(
    typeof window !== 'undefined' ? window.scrollY : 0
  )

  useEffect(() => {
    if (container) return // Upstream container owns the value

    function update() {
      // With overflow:hidden body lock, window.scrollY is already preserved.
      // With position:fixed body lock (legacy), read from body.style.top.
      if (document.body.style.position === 'fixed') {
        const top = parseInt(document.body.style.top || '0', 10)
        windowScrollMv.set(Math.abs(top))
      } else {
        windowScrollMv.set(window.scrollY)
      }
    }

    window.addEventListener('scroll', update, { passive: true })
    const observer = new MutationObserver(update)
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] })

    return () => {
      window.removeEventListener('scroll', update)
      observer.disconnect()
    }
  }, [windowScrollMv, container])

  return container ?? windowScrollMv
}
