'use client'

import { useRef, useEffect, useState } from 'react'
import { motion, useMotionValue, useTransform } from 'framer-motion'
import { useEffectiveScrollY } from '@/lib/hooks/useEffectiveScrollY'
import { useSurfaceProgress } from '@/components/ui/DraggableSurface'
import { formatCurrency } from '@/lib/utils/currency'
import UserAvatarMenu from '@/components/dashboard/UserAvatarMenu'
import { useT } from '@/lib/i18n/LocaleProvider'
import type { DashboardStats } from '@/types'

// ── Money confetti (canvas) ───────────────────────────────────────────────────
function spawnMoneyConfetti(originX: number, originY: number) {
  if (typeof window === 'undefined') return
  const canvas = document.createElement('canvas')
  canvas.style.cssText =
    'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999'
  canvas.width  = window.innerWidth
  canvas.height = window.innerHeight
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')!

  const EMOJIS = ['💸', '💵', '💶', '💰', '🤑', '💴']
  const COUNT  = 32

  interface P { x: number; y: number; vx: number; vy: number; rot: number; rotV: number; emoji: string; size: number; alpha: number }
  const particles: P[] = Array.from({ length: COUNT }, () => ({
    x: originX, y: originY,
    vx: (Math.random() - 0.5) * 14,
    vy: -(Math.random() * 18 + 6),
    rot: Math.random() * 360,
    rotV: (Math.random() - 0.5) * 12,
    emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
    size: Math.random() * 14 + 18,
    alpha: 1,
  }))

  let frame = 0
  const MAX = 130
  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    let alive = false
    for (const p of particles) {
      p.vy += 0.55; p.vx *= 0.98; p.x += p.vx; p.y += p.vy; p.rot += p.rotV
      p.alpha = Math.max(0, 1 - frame / MAX)
      if (p.alpha > 0) {
        alive = true
        ctx.save(); ctx.globalAlpha = p.alpha; ctx.font = `${p.size}px serif`
        ctx.translate(p.x, p.y); ctx.rotate((p.rot * Math.PI) / 180)
        ctx.fillText(p.emoji, -p.size / 2, p.size / 2); ctx.restore()
      }
    }
    frame++
    if (alive && frame < MAX) requestAnimationFrame(tick)
    else canvas.remove()
  }
  requestAnimationFrame(tick)
}

// ── Logo confetti (canvas) ────────────────────────────────────────────────────
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function spawnLogoConfetti(originX: number, originY: number, logoUrls: string[]) {
  if (typeof window === 'undefined' || logoUrls.length === 0) return
  const canvas = document.createElement('canvas')
  canvas.style.cssText =
    'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999'
  canvas.width  = window.innerWidth
  canvas.height = window.innerHeight
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')!

  // Preload all logo images
  const imgs = logoUrls.map(url => {
    const img = new Image(); img.crossOrigin = 'anonymous'; img.src = url; return img
  })

  const COUNT = Math.max(24, logoUrls.length * 2)
  interface P { x: number; y: number; vx: number; vy: number; rot: number; rotV: number; size: number; alpha: number; img: HTMLImageElement }
  const particles: P[] = Array.from({ length: COUNT }, (_, i) => ({
    x: originX, y: originY,
    vx: (Math.random() - 0.5) * 14,
    vy: -(Math.random() * 18 + 6),
    rot: Math.random() * 360,
    rotV: (Math.random() - 0.5) * 10,
    size: Math.random() * 10 + 26,
    alpha: 1,
    img: imgs[i % imgs.length],
  }))

  let frame = 0
  const MAX = 130
  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    let alive = false
    for (const p of particles) {
      p.vy += 0.55; p.vx *= 0.98; p.x += p.vx; p.y += p.vy; p.rot += p.rotV
      p.alpha = Math.max(0, 1 - frame / MAX)
      if (p.alpha > 0) {
        alive = true
        const half = p.size / 2
        const r    = p.size * 0.22
        ctx.save()
        ctx.globalAlpha = p.alpha
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rot * Math.PI) / 180)
        if (p.img.complete && p.img.naturalWidth > 0) {
          // White background + rounded clip
          ctx.shadowColor = 'rgba(0,0,0,0.15)'; ctx.shadowBlur = 4
          roundRect(ctx, -half, -half, p.size, p.size, r)
          ctx.fillStyle = '#fff'; ctx.fill()
          ctx.shadowBlur = 0
          ctx.clip()
          ctx.drawImage(p.img, -half, -half, p.size, p.size)
        } else {
          // Fallback: accent-colored square
          roundRect(ctx, -half, -half, p.size, p.size, r)
          ctx.fillStyle = '#000000'; ctx.fill()
        }
        ctx.restore()
      }
    }
    frame++
    if (alive && frame < MAX) requestAnimationFrame(tick)
    else canvas.remove()
  }
  requestAnimationFrame(tick)
}

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  firstName: string
  stats: DashboardStats
  sharedCount: number
  shareText: string
  currency?: string
  logoUrls?: string[]
}

export default function DashboardSummaryHero({
  firstName,
  stats,
  sharedCount,
  shareText,
  currency = 'EUR',
  logoUrls = [],
}: Props) {
  const t = useT()
  const heroRef = useRef<HTMLDivElement>(null)
  const scrollY = useEffectiveScrollY()

  const [savingsPeriod, setSavingsPeriod] = useState<'monthly' | 'annual'>('monthly')
  const [showSkeleton, setShowSkeleton]   = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Restore the original scroll-fade effect on the whole hero: as the user
  // scrolls the foreground content, the paragraphs fade out and blur.
  // Reads scroll from the ScrollContainerProvider when inside the
  // DraggableSurface, or from window.scrollY otherwise.
  useEffect(() => {
    return scrollY.on('change', (v: number) => {
      if (!heroRef.current) return
      const progress = Math.max(0, Math.min(1, v / 220))
      const opacity  = 1 - progress
      const blur     = progress * 12
      heroRef.current.style.opacity       = String(opacity)
      heroRef.current.style.filter        = blur > 0.1 ? `blur(${blur.toFixed(1)}px)` : ''
      heroRef.current.style.pointerEvents = opacity < 0.05 ? 'none' : 'auto'
    })
  }, [scrollY])

  // On mobile, the avatar tap reveals the DraggableSurface's dark backdrop
  // (where the account menu items live). On desktop, the default dropdown
  // popover is used.
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 1023px)')
    const update = () => setIsMobile(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])

  const avatarTapOverride = isMobile
    ? () => window.dispatchEvent(new Event('oso:reveal-analytics'))
    : undefined

  // When inside a DraggableSurface, fade the internal greeting row out
  // as the drag progresses so it crossfades with the DashboardFixedGreeting
  // overlay that's pinned at the top of the viewport. The internal fade
  // completes by 4% progress — the overlay then picks up from 4% → 8%,
  // leaving a no-overlap gap so neither header visibly "merges" with the
  // other while the foreground is near the raised position.
  const surfaceProgress = useSurfaceProgress()
  const fallback = useMotionValue(0)
  const greetingOpacity = useTransform(surfaceProgress ?? fallback, [0, 0.04], [1, 0])

  // Track whether the surface is "lowered" (past the halfway point) so
  // the avatar can flip to the Perezoso logo face in sync with the reveal
  // gesture. `null` means we're outside a surface context (e.g. desktop)
  // and the avatar uses its default tap-driven flip.
  const [surfaceFlipped, setSurfaceFlipped] = useState<boolean | undefined>(
    surfaceProgress ? false : undefined
  )
  useEffect(() => {
    if (!surfaceProgress) return
    let last = false
    setSurfaceFlipped(false)
    return surfaceProgress.on('change', v => {
      const isLowered = v > 0.5
      if (isLowered !== last) {
        last = isLowered
        setSurfaceFlipped(isLowered)
      }
    })
  }, [surfaceProgress])

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  function handleSavingsTap() {
    if (showSkeleton) return
    if (timerRef.current) clearTimeout(timerRef.current)
    setShowSkeleton(true)
    timerRef.current = setTimeout(() => {
      setSavingsPeriod(p => p === 'monthly' ? 'annual' : 'monthly')
      setShowSkeleton(false)
    }, 1500)
  }

  function handleAmountTap(e: React.MouseEvent) {
    spawnMoneyConfetti(e.clientX, e.clientY)
  }

  function handleSubsTap(e: React.MouseEvent) {
    spawnLogoConfetti(e.clientX, e.clientY, logoUrls)
  }

  const monthly    = formatCurrency(stats.total_monthly_cost, currency)
  const annual     = formatCurrency(stats.total_annual_cost, currency)
  const savingsMo  = formatCurrency(stats.shared_monthly_cost, currency)
  const savingsYr  = formatCurrency(stats.shared_monthly_cost * 12, currency)
  const total      = stats.active_count + stats.trial_count
  const hasSave    = stats.shared_monthly_cost > 0.01 && sharedCount > 0
  const name       = firstName || t('dashboard.greetingFallback')
  const savingsLabel = savingsPeriod === 'monthly'
    ? `${savingsMo} ${t('dashboard.perMonth')}`
    : `${savingsYr} ${t('dashboard.perYear')}`

  return (
    <div ref={heroRef} className="pb-5">
      {/* Greeting + avatar — crossfades out during drag so the fixed
          overlay (DashboardFixedGreeting) takes over at the viewport top. */}
      <motion.div
        className="flex items-center justify-between mb-3"
        style={{ opacity: greetingOpacity }}
      >
        <p className="text-[17px] font-bold text-[#000000] dark:text-[#F2F2F7]">
          {t('dashboard.greeting')} {name}.
        </p>
        <UserAvatarMenu
          shareText={shareText}
          onTap={avatarTapOverride}
          flipped={surfaceFlipped}
        />
      </motion.div>

      {/* Main statement — tapping figures spawns money confetti.
          Narrative text in dark gray (#616161) at 25px, amounts in pure
          black bumped +25px to 50px so the numbers stand out. */}
      <p className="text-[25px] font-extrabold leading-[1.15] tracking-tight mb-3" style={{ maxWidth: '100%' }}>
        <span className="text-[#616161] dark:text-[#8E8E93]">{t('dashboard.spendStatement')}</span><br />
        <button onClick={handleAmountTap} className="inline align-baseline cursor-pointer select-none active:scale-95 transition-transform">
          <span className="text-[#000000] dark:text-[#F2F2F7] text-[50px]">{monthly}</span>
        </button>
        <span className="text-[#616161] dark:text-[#8E8E93]">.</span><br />
        <span className="text-[#616161] dark:text-[#8E8E93]">{t('dashboard.annualStatement')}</span><br />
        <button onClick={handleAmountTap} className="inline align-baseline cursor-pointer select-none active:scale-95 transition-transform">
          <span className="text-[#000000] dark:text-[#F2F2F7] text-[50px]">{annual}</span>
        </button>
        <span className="text-[#616161] dark:text-[#8E8E93]">.</span>
      </p>

      {/* Supporting statement — three separate lines:
          1. Tienes {total} suscripciones activas.
          2. Compartes {sharedCount} suscripciones.
          3. Reduces {savings} tu gasto al año (or al mes on tap). */}
      <p className="text-[18px] font-bold leading-relaxed" style={{ maxWidth: '100%' }}>
        {/* Line 1 — active subscriptions */}
        <span className="text-[#616161] dark:text-[#8E8E93]">{t('dashboard.youHave')}{' '}</span>
        <button onClick={handleSubsTap} className="inline align-baseline cursor-pointer select-none active:scale-95 transition-transform">
          <span className="text-[#000000] dark:text-[#F2F2F7]">{total}</span>
          <span className="text-[#616161] dark:text-[#8E8E93]">{' '}{total === 1 ? t('dashboard.activeSubscription') : t('dashboard.activeSubscriptions')}</span>
        </button>
        <span className="text-[#616161] dark:text-[#8E8E93]">.</span>
        {hasSave && (
          <>
            <br />
            {/* Line 2 — shared count */}
            <span className="text-[#616161] dark:text-[#8E8E93]">{t('dashboard.youShare')}{' '}</span>
            <span className="whitespace-nowrap">
              <span className="text-[#000000] dark:text-[#F2F2F7]">{sharedCount}</span>
              <span className="text-[#616161] dark:text-[#8E8E93]">&nbsp;{sharedCount === 1 ? t('dashboard.subscriptionWord') : t('dashboard.subscriptionsWord')}</span>
            </span>
            <span className="text-[#616161] dark:text-[#8E8E93]">.</span>
            <br />
            {/* Line 3 — savings with monthly↔annual toggle */}
            <span className="text-[#616161] dark:text-[#8E8E93]">{t('dashboard.reduceSpend')}{' '}</span>
            <button
              onClick={handleSavingsTap}
              className="inline align-baseline cursor-pointer select-none active:scale-95 transition-transform"
              aria-label="Cambiar entre ahorro mensual y anual"
            >
              {showSkeleton ? (
                <span
                  className="inline-block align-middle rounded-md bg-[#000000]/20 dark:bg-[#FFFFFF]/20 animate-pulse"
                  style={{ width: '5ch', height: '1em', verticalAlign: 'baseline' }}
                />
              ) : (
                <span className="text-[#000000] dark:text-[#F2F2F7]">
                  {savingsPeriod === 'monthly' ? savingsMo : savingsYr}
                </span>
              )}
            </button>
            <span className="text-[#616161] dark:text-[#8E8E93]">{' '}{savingsPeriod === 'monthly' ? t('dashboard.yourSpendMonthly') : t('dashboard.yourSpendAnnual')}.</span>
          </>
        )}
      </p>
    </div>
  )
}
