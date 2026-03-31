'use client'

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'

/** Returns true if the touch started inside a horizontally scrollable element */
function isInsideHorizontalScroller(target: EventTarget | null): boolean {
  let node = target as HTMLElement | null
  while (node && node !== document.body) {
    const overflow = window.getComputedStyle(node).overflowX
    if ((overflow === 'auto' || overflow === 'scroll') && node.scrollWidth > node.clientWidth) {
      return true
    }
    node = node.parentElement
  }
  return false
}

export default function SwipeNavigation({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      if (isInsideHorizontalScroller(e.target)) {
        touchStart.current = null
        return
      }
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }

    function onTouchEnd(e: TouchEvent) {
      if (!touchStart.current) return
      const dx = e.changedTouches[0].clientX - touchStart.current.x
      const dy = e.changedTouches[0].clientY - touchStart.current.y
      touchStart.current = null

      // Require strong horizontal intent: min 80px and 2× more horizontal than vertical
      if (Math.abs(dx) < 80 || Math.abs(dx) < Math.abs(dy) * 2) return

      const isDashboard = pathname === '/dashboard' || pathname === '/'
      const isSubscriptions = pathname === '/subscriptions'

      if (dx < 0 && isDashboard) {
        router.push('/subscriptions')
      } else if (dx > 0 && isSubscriptions) {
        router.push('/dashboard')
      }
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [pathname, router])

  return <>{children}</>
}
