'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useMotionValue, useTransform, animate, type MotionValue } from 'framer-motion'
import { ScrollContainerProvider } from '@/lib/hooks/ScrollContainerContext'
import haptics from '@/lib/haptics'

// ─── Tunables ─────────────────────────────────────────────────────────────
const PEEK_HEIGHT = 120           // px of foreground visible when lowered
const SNAP_THRESHOLD = 0.12       // fraction of loweredY to trigger snap
const VEL_THRESHOLD = 400         // px/s flick velocity
const DRAG_START_THRESHOLD = 6    // px before classifying gesture

const SNAP_SPRING = {
  type: 'spring' as const,
  stiffness: 340,
  damping: 36,
  mass: 0.95,
  restDelta: 0.5,
}

// ─── Surface progress context ────────────────────────────────────────────
// Exposes a normalized MotionValue<number> going from 0 (raised) to 1 (lowered).
const SurfaceProgressContext = createContext<MotionValue<number> | null>(null)

export function useSurfaceProgress(): MotionValue<number> | null {
  return useContext(SurfaceProgressContext)
}

// ─── Props ────────────────────────────────────────────────────────────────
interface Props {
  /** Content for the dark back layer, revealed by dragging the foreground down
      or by dispatching the `oso:reveal-analytics` window event. */
  backdrop: ReactNode
  /** Main content — lives inside the foreground scroll container. */
  children: ReactNode
}

export default function DraggableSurface({ backdrop, children }: Props) {
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setMounted(true)
    const mql = window.matchMedia('(max-width: 1023px)')
    const update = () => setIsMobile(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])

  // Desktop or SSR → render children normally.
  if (!mounted || !isMobile) {
    return <>{children}</>
  }

  return (
    <MobileDraggableSurface backdrop={backdrop}>
      {children}
    </MobileDraggableSurface>
  )
}

// ─── Mobile two-layer surface ─────────────────────────────────────────────
function MobileDraggableSurface({
  backdrop,
  children,
}: {
  backdrop: ReactNode
  children: ReactNode
}) {
  const y = useMotionValue(0)
  const scrollY = useMotionValue(0)           // Inner scroll, fed to the context
  const scrollRef = useRef<HTMLDivElement>(null)
  const raisedRef = useRef(true)
  const loweredYRef = useRef(0)
  const [loweredY, setLoweredY] = useState(0)

  // Parallax + opacity on the backdrop layer, and normalized 0→1 progress
  // for consumers (e.g. fixed header color interpolation).
  const safeLowered = Math.max(loweredY, 1)
  const bgOpacity = useTransform(y, [0, safeLowered], [0, 1])
  const bgTranslate = useTransform(y, [0, safeLowered], [-30, 0])
  const progress = useTransform(y, [0, safeLowered], [0, 1])

  // ── Compute lowered target position (innerHeight − PEEK) ─────────────────
  useEffect(() => {
    function compute() {
      const val = Math.max(0, window.innerHeight - PEEK_HEIGHT)
      setLoweredY(val)
      loweredYRef.current = val
    }
    compute()
    window.addEventListener('resize', compute)
    window.visualViewport?.addEventListener('resize', compute)
    return () => {
      window.removeEventListener('resize', compute)
      window.visualViewport?.removeEventListener('resize', compute)
    }
  }, [])

  // ── Publish surface y as a CSS variable so other fixed elements follow ──
  useEffect(() => {
    const root = document.documentElement
    const unsub = y.on('change', v => {
      root.style.setProperty('--surface-y', `${v}px`)
    })
    return () => {
      unsub()
      root.style.setProperty('--surface-y', '0px')
    }
  }, [y])

  // ── Programmatic reveal / hide via custom events ───────────────────────
  useEffect(() => {
    function onReveal() {
      if (raisedRef.current && loweredYRef.current > 0) {
        raisedRef.current = false
        haptics.tap('light')
        animate(y, loweredYRef.current, SNAP_SPRING)
      }
    }
    function onHide() {
      if (!raisedRef.current) {
        raisedRef.current = true
        haptics.tap('light')
        animate(y, 0, SNAP_SPRING)
      }
    }
    window.addEventListener('oso:reveal-analytics', onReveal)
    window.addEventListener('oso:hide-analytics', onHide)
    return () => {
      window.removeEventListener('oso:reveal-analytics', onReveal)
      window.removeEventListener('oso:hide-analytics', onHide)
    }
  }, [y])

  // ── Inner scroll sync to context MotionValue ────────────────────────────
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => scrollY.set(el.scrollTop)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [scrollY])

  // ── Native touch gesture handlers ───────────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    let startY = 0
    let startBase = 0
    let startedRaised = true
    let lastY = 0
    let lastT = 0
    let velocity = 0
    let mode: 'idle' | 'drag' | 'scroll' = 'idle'
    let locked = false

    function onTouchStart(e: TouchEvent) {
      const t = e.touches[0]
      startY = t.clientY
      lastY = startY
      lastT = performance.now()
      velocity = 0
      mode = 'idle'
      locked = false
      startedRaised = raisedRef.current
      startBase = raisedRef.current ? 0 : loweredYRef.current
    }

    function onTouchMove(e: TouchEvent) {
      const t = e.touches[0]
      const cy = t.clientY
      const dy = cy - startY
      const now = performance.now()
      const dt = now - lastT
      if (dt > 0) velocity = ((cy - lastY) / dt) * 1000
      lastY = cy
      lastT = now

      if (!locked) {
        if (Math.abs(dy) < DRAG_START_THRESHOLD) return

        if (!startedRaised) {
          // Lowered → any gesture is a surface drag.
          mode = 'drag'
          locked = true
        } else {
          // Raised → only steal when at scrollTop 0 pulling down.
          const sc = el?.scrollTop ?? 0
          if (sc <= 0 && dy > DRAG_START_THRESHOLD) {
            mode = 'drag'
            locked = true
          } else {
            mode = 'scroll'
            locked = true
          }
        }
      }

      if (mode === 'drag') {
        e.preventDefault()
        const low = loweredYRef.current
        const raw = startBase + dy
        let clamped = raw
        if (raw < 0) clamped = raw * 0.15
        else if (raw > low) clamped = low + (raw - low) * 0.15
        y.set(clamped)
      }
    }

    function onTouchEnd() {
      if (mode !== 'drag') {
        mode = 'idle'
        locked = false
        return
      }
      const cur = y.get()
      const low = loweredYRef.current

      let target: number
      if (!startedRaised) {
        target = cur < low ? 0 : low
      } else if (Math.abs(velocity) > VEL_THRESHOLD) {
        target = velocity > 0 ? low : 0
      } else {
        target = cur > low * SNAP_THRESHOLD ? low : 0
      }

      const willBeRaised = target === 0
      if (willBeRaised !== raisedRef.current) {
        haptics.tap('light')
      }
      raisedRef.current = willBeRaised
      animate(y, target, SNAP_SPRING)
      mode = 'idle'
      locked = false
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('touchcancel', onTouchEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [y])

  // Tap on the visible peek strip while lowered → snap back up.
  function handleSurfaceTap() {
    if (!raisedRef.current && y.get() > 0) {
      raisedRef.current = true
      haptics.tap('light')
      animate(y, 0, SNAP_SPRING)
    }
  }

  return (
    <SurfaceProgressContext.Provider value={progress}>
      {/* ── Layer 1 — Dark back layer (fixed behind) ──────────────────── */}
      <motion.div
        className="fixed inset-0 z-0 bg-[#0a0a0a] text-white"
        style={{
          opacity: bgOpacity,
          y: bgTranslate,
          paddingTop: 'env(safe-area-inset-top)',
        }}
      >
        {backdrop}
      </motion.div>

      {/* ── Layer 2 — Foreground draggable surface ────────────────────── */}
      <motion.div
        className="fixed inset-0 z-10 bg-[#F7F8FA] dark:bg-[#121212] overflow-hidden"
        style={{
          y,
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          willChange: 'transform',
          boxShadow: '0 -12px 40px rgba(0,0,0,0.22)',
        }}
      >
        <div
          ref={scrollRef}
          onClick={handleSurfaceTap}
          className="h-full w-full overflow-y-auto"
          style={{
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'none',
            paddingTop: 'env(safe-area-inset-top)',
          }}
        >
          <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-28">
            <ScrollContainerProvider value={scrollY}>
              {children}
            </ScrollContainerProvider>
          </div>
        </div>
      </motion.div>
    </SurfaceProgressContext.Provider>
  )
}
