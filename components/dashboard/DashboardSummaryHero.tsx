'use client'

import { useRef, useEffect, useState } from 'react'
import { useEffectiveScrollY } from '@/lib/hooks/useEffectiveScrollY'
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
          ctx.fillStyle = '#3D3BF3'; ctx.fill()
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
  const t       = useT()
  const ref     = useRef<HTMLDivElement>(null)
  const scrollY = useEffectiveScrollY()

  const [savingsPeriod, setSavingsPeriod] = useState<'monthly' | 'annual'>('monthly')
  const [showSkeleton, setShowSkeleton]   = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return scrollY.on('change', (v: number) => {
      if (!ref.current) return
      const progress = Math.max(0, Math.min(1, v / 220))
      const opacity  = 1 - progress
      const blur     = progress * 12  // 0→12px
      ref.current.style.opacity       = String(opacity)
      ref.current.style.filter        = blur > 0.1 ? `blur(${blur.toFixed(1)}px)` : ''
      ref.current.style.pointerEvents = opacity < 0.05 ? 'none' : 'auto'
    })
  }, [scrollY])

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
    <div
      ref={ref}
      className="sticky pb-5 bg-[#F7F8FA] dark:bg-[#121212]"
      style={{ top: 'env(safe-area-inset-top)' }}
    >
      {/* Greeting + avatar */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[17px] font-bold text-black dark:text-[#F2F2F7]">
          {t('dashboard.greeting')} {name}.
        </p>
        <UserAvatarMenu shareText={shareText} />
      </div>

      {/* Main statement — tapping figures spawns money confetti */}
      <p className="text-[40px] font-extrabold text-[#121212] dark:text-[#F2F2F7] leading-[1.15] tracking-tight mb-3" style={{ maxWidth: '100%' }}>
        {t('dashboard.spendStatement')}<br />
        <button onClick={handleAmountTap} className="inline align-baseline cursor-pointer select-none active:scale-95 transition-transform">
          <span className="text-[#3D3BF3] dark:text-[#8B89FF]">{monthly}</span>
        </button>.<br />
        {t('dashboard.annualStatement')}<br />
        <button onClick={handleAmountTap} className="inline align-baseline cursor-pointer select-none active:scale-95 transition-transform">
          <span className="text-[#3D3BF3] dark:text-[#8B89FF]">{annual}</span>
        </button>.
      </p>

      {/* Supporting statement */}
      <p className="text-[18px] font-bold text-black dark:text-[#F2F2F7] leading-relaxed" style={{ maxWidth: '100%' }}>
        {t('dashboard.youHave')}{' '}
        <button onClick={handleSubsTap} className="inline align-baseline cursor-pointer select-none active:scale-95 transition-transform">
          <span className="text-[#3D3BF3] dark:text-[#8B89FF]">
            {total} {total === 1 ? t('dashboard.activeSubscription') : t('dashboard.activeSubscriptions')}
          </span>
        </button>.
        {hasSave && (
          <>
            {' '}{t('dashboard.youShare')}{' '}
            <span className="text-[#3D3BF3] dark:text-[#8B89FF] whitespace-nowrap">
              {sharedCount}&nbsp;{sharedCount === 1 ? t('dashboard.subscriptionWord') : t('dashboard.subscriptionsWord')}
            </span>
            {' '}{t('dashboard.andSave')}{' '}
            <button
              onClick={handleSavingsTap}
              className="inline align-baseline cursor-pointer select-none"
              aria-label="Cambiar entre ahorro mensual y anual"
            >
              {showSkeleton ? (
                <span
                  className="inline-block align-middle rounded-md bg-[#3D3BF3]/20 dark:bg-[#8B89FF]/20 animate-pulse"
                  style={{ width: '7ch', height: '1em', verticalAlign: 'baseline' }}
                />
              ) : (
                <span className="text-[#3D3BF3] dark:text-[#8B89FF]">
                  {savingsLabel}
                </span>
              )}
            </button>.
          </>
        )}
      </p>
    </div>
  )
}
