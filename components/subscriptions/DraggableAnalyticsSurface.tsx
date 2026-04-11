'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { formatCurrency } from '@/lib/utils/currency'
import { ScrollContainerProvider } from '@/lib/hooks/ScrollContainerContext'
import haptics from '@/lib/haptics'
import type { DashboardStats } from '@/types'

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

interface Props {
  stats: DashboardStats
  allCount: number
  children: ReactNode
}

export default function DraggableAnalyticsSurface({ stats, allCount, children }: Props) {
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
    <MobileDraggableSurface stats={stats} allCount={allCount}>
      {children}
    </MobileDraggableSurface>
  )
}

// ─── Mobile two-layer surface ─────────────────────────────────────────────
function MobileDraggableSurface({
  stats,
  allCount,
  children,
}: {
  stats: DashboardStats
  allCount: number
  children: ReactNode
}) {
  const y = useMotionValue(0)
  const scrollY = useMotionValue(0)           // Inner scroll, fed to the context
  const scrollRef = useRef<HTMLDivElement>(null)
  const raisedRef = useRef(true)
  const loweredYRef = useRef(0)
  const [loweredY, setLoweredY] = useState(0)

  // Parallax + opacity on the dark layer, keyed off the foreground y.
  const bgOpacity = useTransform(y, [0, Math.max(loweredY, 1)], [0, 1])
  const bgTranslate = useTransform(y, [0, Math.max(loweredY, 1)], [-30, 0])

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

  // ── Programmatic reveal via custom event ────────────────────────────────
  useEffect(() => {
    function onReveal() {
      if (raisedRef.current && loweredYRef.current > 0) {
        raisedRef.current = false
        animate(y, loweredYRef.current, SNAP_SPRING)
      }
    }
    window.addEventListener('oso:reveal-analytics', onReveal)
    return () => window.removeEventListener('oso:reveal-analytics', onReveal)
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
        // Must be passive:false to preventDefault
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
        // Was lowered — any upward movement returns to raised.
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
    <>
      {/* ── Layer 1 — Dark analytics layer (fixed behind) ───────────────── */}
      <motion.div
        className="fixed inset-0 z-0 bg-[#0a0a0a] text-white"
        style={{
          opacity: bgOpacity,
          y: bgTranslate,
          paddingTop: 'env(safe-area-inset-top)',
        }}
        aria-hidden
      >
        <AnalyticsPanel stats={stats} allCount={allCount} />
      </motion.div>

      {/* ── Layer 2 — Foreground draggable surface ──────────────────────── */}
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
        {/* Grabber handle at the top edge */}
        <div className="absolute inset-x-0 top-0 pt-[env(safe-area-inset-top)] pointer-events-none z-[1]">
          <div className="flex justify-center pt-2">
            <div className="w-9 h-1 rounded-full bg-black/15 dark:bg-white/20" />
          </div>
        </div>

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
    </>
  )
}

// ─── Dark analytics panel content ─────────────────────────────────────────
function AnalyticsPanel({ stats, allCount }: { stats: DashboardStats; allCount: number }) {
  return (
    <div className="h-full overflow-y-auto px-6 pt-8 pb-40">
      <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white/50">
        Resumen
      </p>
      <h2 className="mt-2 text-[40px] font-bold tracking-tight leading-[1.05]">
        {formatCurrency(stats.total_monthly_cost, 'EUR')}
        <span className="text-[18px] font-medium text-white/60 ml-2">/mes</span>
      </h2>
      <p className="mt-3 text-[15px] text-white/70 leading-relaxed max-w-[36ch]">
        Estás pagando{' '}
        <span className="text-white font-semibold">
          {formatCurrency(stats.total_annual_cost, 'EUR')}
        </span>{' '}
        al año en{' '}
        <span className="text-white font-semibold">
          {allCount === 1 ? '1 suscripción' : `${allCount} suscripciones`}
        </span>
        .
      </p>

      <div className="mt-10 grid grid-cols-2 gap-3">
        <KpiCard
          label="Activas"
          value={String(stats.active_count)}
        />
        <KpiCard
          label="Prueba"
          value={String(stats.trial_count)}
        />
        <KpiCard
          label="Pausadas"
          value={String(stats.paused_count)}
        />
        <KpiCard
          label="Compartido"
          value={formatCurrency(stats.shared_monthly_cost, 'EUR')}
          sub="/mes"
        />
      </div>

      <p className="mt-10 text-[12px] text-white/40">
        Desliza la tarjeta hacia arriba para volver
      </p>
    </div>
  )
}

function KpiCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="rounded-[24px] bg-white/[0.06] border border-white/[0.08] p-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-white/50">
        {label}
      </p>
      <p className="mt-1 text-[22px] font-bold text-white leading-tight">
        {value}
        {sub && <span className="text-[13px] font-medium text-white/50 ml-1">{sub}</span>}
      </p>
    </div>
  )
}
