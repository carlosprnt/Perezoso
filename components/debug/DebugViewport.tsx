'use client'

/*
 * DEBUG-ONLY viewport diagnostic overlay for the iOS PWA standalone
 * bottom-gap bug. Mounts 3 reference bars and a raw test sheet
 * directly under document.body via createPortal and prints viewport
 * metrics. Remove once the root cause is known.
 *
 * How to read it on the PWA screenshot:
 *
 *   RED   bar = position: fixed; bottom: 0
 *     → where every existing bottom sheet CURRENTLY lands.
 *     If this bar is NOT flush with the physical screen bottom,
 *     then `fixed bottom: 0` in this iOS PWA webview does NOT
 *     anchor to the real viewport — that is the bug.
 *
 *   GREEN bar = position: fixed; bottom: env(safe-area-inset-bottom)
 *     → where content clears the home indicator. If red and green
 *     are at the same Y, env() is reporting 0 (so viewport-fit:cover
 *     is not being honoured). If they differ by ~34px, the inset
 *     IS being reported.
 *
 *   BLUE  bar = position: fixed; top: calc(100dvh - 4px)
 *     → where `100dvh` resolves. If blue is above the red bar,
 *     100dvh is SHORT (smaller than the viewport bottom), which
 *     would be a WebKit bug in standalone mode.
 *
 *   MAGENTA box = a raw test sheet built with nothing but inline
 *     CSS, no Framer Motion, no Tailwind, no shared abstraction,
 *     portaled directly to document.body. If this sheet also
 *     stops above the physical bottom, the problem is in how
 *     iOS PWA anchors `position: fixed`, NOT in our component
 *     hierarchy.
 *
 * The text readout in the top-left prints:
 *   - window.innerHeight                (layout viewport height)
 *   - document.documentElement.clientHeight
 *   - visualViewport.height             (visual viewport)
 *   - body.getBoundingClientRect().bottom
 *   - env(safe-area-inset-bottom)       (computed via a probe div)
 *   - env(safe-area-inset-top)
 */

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface Metrics {
  innerHeight: number
  innerWidth: number
  clientHeight: number
  visualHeight: number | null
  bodyBottom: number
  bodyHeight: number
  safeBottom: number
  safeTop: number
  dvhPx: number
  devicePixelRatio: number
  userAgent: string
  standalone: boolean
}

function readMetrics(): Metrics {
  // Probe element: an absolutely-positioned invisible div that reads
  // the env() values via getComputedStyle. This is the only reliable
  // way to get env() in JS.
  const probe = document.createElement('div')
  probe.style.cssText =
    'position:fixed;left:0;top:0;width:0;height:0;padding-bottom:env(safe-area-inset-bottom);padding-top:env(safe-area-inset-top);visibility:hidden'
  document.body.appendChild(probe)
  const cs = getComputedStyle(probe)
  const safeBottom = parseFloat(cs.paddingBottom) || 0
  const safeTop = parseFloat(cs.paddingTop) || 0
  probe.remove()

  // 100dvh probe: an element sized to 100dvh, read its offsetHeight.
  const dvhProbe = document.createElement('div')
  dvhProbe.style.cssText =
    'position:fixed;left:0;top:0;width:0;height:100dvh;visibility:hidden'
  document.body.appendChild(dvhProbe)
  const dvhPx = dvhProbe.offsetHeight
  dvhProbe.remove()

  const bodyRect = document.body.getBoundingClientRect()

  // @ts-expect-error - navigator.standalone is iOS-only
  const standalone = !!(window.navigator.standalone) ||
    window.matchMedia('(display-mode: standalone)').matches

  return {
    innerHeight: window.innerHeight,
    innerWidth: window.innerWidth,
    clientHeight: document.documentElement.clientHeight,
    visualHeight: window.visualViewport?.height ?? null,
    bodyBottom: bodyRect.bottom,
    bodyHeight: bodyRect.height,
    safeBottom,
    safeTop,
    dvhPx,
    devicePixelRatio: window.devicePixelRatio,
    userAgent: navigator.userAgent,
    standalone,
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
      {/* ── Reference bars ─────────────────────────────────────── */}
      {/* RED: where `fixed bottom: 0` lands */}
      <div style={{ ...barBase, bottom: 0, background: '#FF1744' }} />
      <div style={{ ...labelBase, bottom: 6, background: '#FF1744' }}>
        fixed bottom: 0
      </div>

      {/* GREEN: where safe-area-inset-bottom lands */}
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
          bottom: `calc(env(safe-area-inset-bottom) + 6px)`,
          background: '#00C853',
        }}
      >
        env(safe-area-inset-bottom) = {metrics.safeBottom}px
      </div>

      {/* BLUE: where `top: calc(100dvh - 4px)` lands */}
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
        top: 100dvh - 4px ({metrics.dvhPx}px)
      </div>

      {/* ── RAW test sheet ───────────────────────────────────────
           No Framer Motion, no Tailwind, no ancestor chain.
           If this lands correctly and the real sheets don't,
           the bug is in the shared sheet components — not in
           iOS PWA positioning. If this lands WRONG too, the bug
           is in iOS PWA itself. */}
      <div
        style={{
          position: 'fixed',
          /* Same bleed pattern as every production sheet should use. */
          bottom: 'calc(env(safe-area-inset-bottom) * -1)',
          left: 12,
          right: 12,
          height: 220,
          background: '#FFFFFF',
          border: '3px solid #D500F9',
          borderBottom: '6px solid #D500F9',
          borderRadius: '24px 24px 0 0',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.3)',
          zIndex: 999998,
          /* The spec from the instructions: padding-bottom: env + 16 */
          padding: '16px 20px calc(env(safe-area-inset-bottom) + 16px)',
          fontFamily: 'ui-monospace, Menlo, monospace',
          fontSize: 11,
          color: '#121212',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <strong style={{ color: '#D500F9', marginBottom: 4 }}>
          RAW BLEED SHEET — bottom:-env / pb:env+16
        </strong>
        <span>If the MAGENTA border reaches the physical screen edge</span>
        <span>and the text label is above the home indicator, the</span>
        <span>bleed pattern IS working. If the border still stops above</span>
        <span>the edge, even the spec-exact pattern fails in this webview.</span>
      </div>

      {/* A second raw sheet using plain `bottom: 0` — the test from the
          previous audit. If this one stops at ~793 while the bleed one
          above reaches the edge, our canonical fix is correct and any
          remaining gap comes from a component that missed the pattern. */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 140,
          right: 12,
          height: 28,
          background: '#FFEB3B',
          border: '2px solid #F57F17',
          zIndex: 999997,
          fontFamily: 'ui-monospace, Menlo, monospace',
          fontSize: 9,
          color: '#121212',
          textAlign: 'center',
          lineHeight: '24px',
          fontWeight: 700,
        }}
      >
        plain bottom:0 reference
      </div>

      {/* ── Metrics readout ──────────────────────────────────── */}
      <div
        style={{
          position: 'fixed',
          top: 'calc(env(safe-area-inset-top) + 8px)',
          left: 8,
          padding: '8px 10px',
          background: 'rgba(0,0,0,0.82)',
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
        <div>innerHeight: {metrics.innerHeight}</div>
        <div>innerWidth: {metrics.innerWidth}</div>
        <div>clientHeight: {metrics.clientHeight}</div>
        <div>visualViewport.height: {metrics.visualHeight ?? '—'}</div>
        <div>100dvh probe: {metrics.dvhPx}</div>
        <div>body.bottom: {Math.round(metrics.bodyBottom)}</div>
        <div>body.height: {Math.round(metrics.bodyHeight)}</div>
        <div>env.safe-bottom: {metrics.safeBottom}</div>
        <div>env.safe-top: {metrics.safeTop}</div>
        <div>DPR: {metrics.devicePixelRatio}</div>
      </div>
    </>,
    document.body,
  )
}
