'use client'

/*
 * Root-cause diagnostic overlay for the iOS PWA standalone bottom-
 * edge gap. Mounts directly to document.body via createPortal and
 * renders three independent test sheets plus a metrics readout:
 *
 *   1. RED bar at `fixed bottom: 0` — reference line: where plain
 *      `bottom: 0` actually lands in this webview.
 *
 *   2. GREEN bar at `fixed bottom: env(safe-area-inset-bottom)` —
 *      shows whether env() has a non-zero value in this webview.
 *
 *   3. BLUE bar at `top: calc(100dvh - 4px)` — shows where 100dvh
 *      resolves to.
 *
 *   4. PURPLE bar at `fixed bottom: var(--safe-bleed-bottom, 34px)`
 *      — shows the value that our JS bootstrap script is producing.
 *      If this value is 0 the script did not run or measured 0.
 *
 *   5. "RAW A" sheet — plain inline CSS, `position: fixed`,
 *      `bottom: 0`, visible magenta border. Portaled directly to
 *      document.body. No Framer Motion, no Tailwind. Reference for
 *      the "naive" case.
 *
 *   6. "RAW B" sheet — same as RAW A but with
 *      `bottom: calc(var(--safe-bleed-bottom, 34px) * -1)`. Tests
 *      whether the CSS-variable-driven bleed reaches the physical
 *      edge.
 *
 *   7. "RAW C" sheet — same as RAW A but with literal `bottom: -34px`.
 *      Tests whether a literal pixel bleed (no CSS vars, no env, no
 *      calc) reaches the physical edge.
 *
 * Metrics printed in the top-left readout:
 *   - standalone (display-mode / navigator.standalone)
 *   - innerHeight
 *   - innerWidth
 *   - documentElement.clientHeight
 *   - visualViewport.height / offsetTop
 *   - 100dvh probe (element sized to 100dvh, read offsetHeight)
 *   - body.getBoundingClientRect() bottom/height
 *   - env(safe-area-inset-bottom) measured via a fixed padding probe
 *   - env(safe-area-inset-top) same approach
 *   - --safe-bleed-bottom (as reported by getComputedStyle on :root)
 *   - --safe-area-bottom (same)
 *   - html / body computed overflow and position (scroll-lock state)
 *   - devicePixelRatio
 *   - userAgent snippet
 */

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface Metrics {
  standalone: boolean
  innerHeight: number
  innerWidth: number
  clientHeight: number
  visualHeight: number | null
  visualOffsetTop: number | null
  dvhPx: number
  bodyBottom: number
  bodyHeight: number
  safeBottomEnv: number
  safeTopEnv: number
  safeBleedBottomVar: string
  safeAreaBottomVar: string
  htmlOverflow: string
  bodyOverflow: string
  bodyPosition: string
  devicePixelRatio: number
  userAgent: string
}

function readMetrics(): Metrics {
  // env(safe-area-inset-bottom) probe
  const envProbe = document.createElement('div')
  envProbe.style.cssText =
    'position:fixed;left:0;top:0;width:0;height:0;padding-bottom:env(safe-area-inset-bottom);padding-top:env(safe-area-inset-top);visibility:hidden;pointer-events:none'
  document.body.appendChild(envProbe)
  const envCs = getComputedStyle(envProbe)
  const safeBottomEnv = parseFloat(envCs.paddingBottom) || 0
  const safeTopEnv = parseFloat(envCs.paddingTop) || 0
  envProbe.remove()

  // 100dvh probe
  const dvhProbe = document.createElement('div')
  dvhProbe.style.cssText =
    'position:fixed;left:0;top:0;width:0;height:100dvh;visibility:hidden;pointer-events:none'
  document.body.appendChild(dvhProbe)
  const dvhPx = dvhProbe.offsetHeight
  dvhProbe.remove()

  // --safe-bleed-bottom from :root (set by layout.tsx bootstrap)
  const rootCs = getComputedStyle(document.documentElement)
  const safeBleedBottomVar =
    rootCs.getPropertyValue('--safe-bleed-bottom').trim() || '(unset)'
  const safeAreaBottomVar =
    rootCs.getPropertyValue('--safe-area-bottom').trim() || '(unset)'

  // html / body computed styles (scroll-lock state)
  const htmlCs = getComputedStyle(document.documentElement)
  const bodyCs = getComputedStyle(document.body)

  const bodyRect = document.body.getBoundingClientRect()

  const standalone =
    // @ts-expect-error - iOS-only
    !!window.navigator.standalone ||
    window.matchMedia('(display-mode: standalone)').matches

  return {
    standalone,
    innerHeight: window.innerHeight,
    innerWidth: window.innerWidth,
    clientHeight: document.documentElement.clientHeight,
    visualHeight: window.visualViewport?.height ?? null,
    visualOffsetTop: window.visualViewport?.offsetTop ?? null,
    dvhPx,
    bodyBottom: bodyRect.bottom,
    bodyHeight: bodyRect.height,
    safeBottomEnv,
    safeTopEnv,
    safeBleedBottomVar,
    safeAreaBottomVar,
    htmlOverflow: htmlCs.overflow,
    bodyOverflow: bodyCs.overflow,
    bodyPosition: bodyCs.position,
    devicePixelRatio: window.devicePixelRatio,
    userAgent: navigator.userAgent.slice(0, 60),
  }
}

export default function DebugViewport() {
  const [mounted, setMounted] = useState(false)
  const [metrics, setMetrics] = useState<Metrics | null>(null)

  useEffect(() => {
    setMounted(true)
    const update = () => setMetrics(readMetrics())
    update()
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    window.visualViewport?.addEventListener('resize', update)
    window.visualViewport?.addEventListener('scroll', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
      window.visualViewport?.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('scroll', update)
    }
  }, [])

  if (!mounted || !metrics) return null

  const barBase: React.CSSProperties = {
    position: 'fixed',
    left: 0,
    right: 0,
    height: 4,
    zIndex: 999999,
    pointerEvents: 'none',
  }

  const labelBase: React.CSSProperties = {
    position: 'fixed',
    right: 8,
    fontSize: 10,
    fontWeight: 700,
    fontFamily: 'ui-monospace, Menlo, monospace',
    padding: '2px 6px',
    borderRadius: 4,
    color: '#fff',
    zIndex: 999999,
    pointerEvents: 'none',
  }

  return createPortal(
    <>
      {/* ── Reference bars ───────────────────────────────────── */}
      {/* RED: plain fixed bottom: 0 */}
      <div style={{ ...barBase, bottom: 0, background: '#FF1744' }} />
      <div style={{ ...labelBase, bottom: 6, background: '#FF1744' }}>
        bottom: 0
      </div>

      {/* GREEN: env(safe-area-inset-bottom) directly */}
      <div
        style={{
          ...barBase,
          bottom: 'env(safe-area-inset-bottom)',
          background: '#00E676',
        }}
      />
      <div
        style={{
          ...labelBase,
          bottom: 'calc(env(safe-area-inset-bottom) + 6px)',
          background: '#00C853',
        }}
      >
        env = {metrics.safeBottomEnv}px
      </div>

      {/* PURPLE: var(--safe-bleed-bottom) — the JS-computed value */}
      <div
        style={{
          ...barBase,
          bottom: 'var(--safe-bleed-bottom, 34px)',
          background: '#D500F9',
        }}
      />
      <div
        style={{
          ...labelBase,
          bottom: 'calc(var(--safe-bleed-bottom, 34px) + 20px)',
          background: '#AA00FF',
        }}
      >
        --safe-bleed-bottom = {metrics.safeBleedBottomVar || '(unset)'}
      </div>

      {/* BLUE: top: calc(100dvh - 4px) */}
      <div
        style={{
          ...barBase,
          top: 'calc(100dvh - 4px)',
          background: '#2979FF',
        }}
      />
      <div
        style={{
          ...labelBase,
          top: 'calc(100dvh - 22px)',
          background: '#2962FF',
        }}
      >
        100dvh - 4px ({metrics.dvhPx}px)
      </div>

      {/* ── RAW test sheets ──────────────────────────────────── */}

      {/* RAW A — plain bottom: 0 (naive) */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 4,
          width: 110,
          height: 90,
          background: '#FFEB3B',
          border: '2px solid #F57F17',
          borderRadius: '10px 10px 0 0',
          zIndex: 999997,
          padding: 6,
          fontFamily: 'ui-monospace, Menlo, monospace',
          fontSize: 9,
          fontWeight: 700,
          color: '#121212',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          textAlign: 'center',
          lineHeight: 1.15,
        }}
      >
        A: bottom:0
      </div>

      {/* RAW B — CSS-variable-driven bleed */}
      <div
        style={{
          position: 'fixed',
          bottom: 'calc(var(--safe-bleed-bottom, 34px) * -1)',
          left: 122,
          width: 110,
          height: 90,
          background: '#69F0AE',
          border: '2px solid #00C853',
          borderRadius: '10px 10px 0 0',
          zIndex: 999997,
          paddingTop: 6,
          paddingLeft: 6,
          paddingRight: 6,
          paddingBottom: 'calc(6px + var(--safe-bleed-bottom, 34px))',
          fontFamily: 'ui-monospace, Menlo, monospace',
          fontSize: 9,
          fontWeight: 700,
          color: '#121212',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          textAlign: 'center',
          lineHeight: 1.15,
        }}
      >
        B: bottom:-var
      </div>

      {/* RAW C — literal -34px bleed */}
      <div
        style={{
          position: 'fixed',
          bottom: -34,
          left: 240,
          width: 110,
          height: 90,
          background: '#B388FF',
          border: '2px solid #6200EA',
          borderRadius: '10px 10px 0 0',
          zIndex: 999997,
          paddingTop: 6,
          paddingLeft: 6,
          paddingRight: 6,
          paddingBottom: 40,
          fontFamily: 'ui-monospace, Menlo, monospace',
          fontSize: 9,
          fontWeight: 700,
          color: '#121212',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          textAlign: 'center',
          lineHeight: 1.15,
        }}
      >
        C: bottom:-34
      </div>

      {/* ── Metrics readout (top-left) ────────────────────────── */}
      <div
        style={{
          position: 'fixed',
          top: 'calc(env(safe-area-inset-top) + 8px)',
          left: 8,
          padding: '8px 10px',
          background: 'rgba(0,0,0,0.86)',
          color: '#fff',
          fontSize: 10,
          lineHeight: 1.35,
          fontFamily: 'ui-monospace, Menlo, monospace',
          borderRadius: 6,
          zIndex: 999999,
          maxWidth: 'calc(100vw - 16px)',
          pointerEvents: 'none',
        }}
      >
        <div>standalone: {String(metrics.standalone)}</div>
        <div>inner: {metrics.innerWidth}×{metrics.innerHeight}</div>
        <div>clientHeight: {metrics.clientHeight}</div>
        <div>vv.h: {metrics.visualHeight ?? '—'}</div>
        <div>vv.offsetTop: {metrics.visualOffsetTop ?? '—'}</div>
        <div>100dvh: {metrics.dvhPx}</div>
        <div>body.bottom: {Math.round(metrics.bodyBottom)}</div>
        <div>body.h: {Math.round(metrics.bodyHeight)}</div>
        <div>env.sb: {metrics.safeBottomEnv}</div>
        <div>env.st: {metrics.safeTopEnv}</div>
        <div>--safe-bleed: {metrics.safeBleedBottomVar || '∅'}</div>
        <div>--safe-area-b: {metrics.safeAreaBottomVar || '∅'}</div>
        <div>html.overflow: {metrics.htmlOverflow}</div>
        <div>body.overflow: {metrics.bodyOverflow}</div>
        <div>body.pos: {metrics.bodyPosition}</div>
        <div>DPR: {metrics.devicePixelRatio}</div>
      </div>
    </>,
    document.body,
  )
}
