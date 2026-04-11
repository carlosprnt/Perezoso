'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from '@/lib/icons'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  footer?: ReactNode
  height?: 'auto' | 'tall' | 'full'
  zIndex?: number
}

export default function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  footer,
  height = 'tall',
  zIndex,
}: BottomSheetProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const scrollRef   = useRef<HTMLDivElement>(null)
  const sheetRef    = useRef<HTMLDivElement>(null)
  const touchStartY = useRef(0)
  const onCloseRef  = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  // Body scroll lock — plain overflow:hidden on html+body while open.
  // (Earlier versions used `body { position: fixed; top: -scrollY }` to
  // preserve scroll position; that interacted badly with the fixed sheet
  // positioning on iOS PWA and is no longer needed now that globals.css
  // sets `overscroll-behavior: none` on html/body.)
  useEffect(() => {
    if (!isOpen) return
    const prevHtmlOverflow = document.documentElement.style.overflow
    const prevBodyOverflow = document.body.style.overflow
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow
      document.body.style.overflow = prevBodyOverflow
    }
  }, [isOpen])

  // ── Reset scroll on open ──────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen && scrollRef.current) scrollRef.current.scrollTop = 0
    if (isOpen && sheetRef.current) {
      sheetRef.current.style.transform  = ''
      sheetRef.current.style.transition = ''
    }
  }, [isOpen])

  // ── iOS-style peek bounce: hints that pulling down dismisses ─────────────
  useEffect(() => {
    if (!isOpen) return
    let t1: ReturnType<typeof setTimeout>
    let t2: ReturnType<typeof setTimeout>
    // Wait for slide-up animation (300ms) then peek down and spring back
    t1 = setTimeout(() => {
      if (!sheetRef.current) return
      sheetRef.current.style.transition = 'transform 0.38s cubic-bezier(0.34, 1.56, 0.64, 1)'
      sheetRef.current.style.transform  = 'translateY(22px)'
      t2 = setTimeout(() => {
        if (!sheetRef.current) return
        sheetRef.current.style.transition = 'transform 0.36s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        sheetRef.current.style.transform  = ''
      }, 380)
    }, 340)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [isOpen])

  // ── Scroll-to-dismiss: pull down from scrollTop=0 ─────────────────────────
  useEffect(() => {
    const scrollEl = scrollRef.current
    const sheetEl  = sheetRef.current
    if (!isOpen || !scrollEl || !sheetEl) return

    let startY         = 0
    let startScrollTop = 0
    let isDismissing   = false

    function onStart(e: TouchEvent) {
      startY         = e.touches[0].clientY
      startScrollTop = scrollEl!.scrollTop
      isDismissing   = false
    }

    function onMove(e: TouchEvent) {
      const dy = e.touches[0].clientY - startY
      if (startScrollTop === 0 && dy > 8) {
        isDismissing = true
        e.preventDefault()
        sheetEl!.style.transition = 'none'
        sheetEl!.style.transform  = `translateY(${Math.max(0, dy - 8)}px)`
      }
    }

    function onEnd(e: TouchEvent) {
      const dy = e.changedTouches[0].clientY - startY
      if (!isDismissing) return
      isDismissing = false
      if (dy > 100) {
        sheetEl!.style.transition = 'transform 0.28s cubic-bezier(0.4,0,1,1)'
        sheetEl!.style.transform  = 'translateY(100%)'
        setTimeout(() => onCloseRef.current(), 260)
      } else {
        sheetEl!.style.transition = 'transform 0.28s cubic-bezier(0.25,0.46,0.45,0.94)'
        sheetEl!.style.transform  = ''
      }
    }

    scrollEl.addEventListener('touchstart', onStart, { passive: true })
    scrollEl.addEventListener('touchmove',  onMove,  { passive: false })
    scrollEl.addEventListener('touchend',   onEnd,   { passive: true })
    return () => {
      scrollEl.removeEventListener('touchstart', onStart)
      scrollEl.removeEventListener('touchmove',  onMove)
      scrollEl.removeEventListener('touchend',   onEnd)
    }
  }, [isOpen])

  if (!isOpen || !mounted) return null

  // ── Handle drag-to-dismiss ────────────────────────────────────────────────
  function onHandleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY
    if (sheetRef.current) sheetRef.current.style.transition = 'none'
  }

  function onHandleTouchMove(e: React.TouchEvent) {
    const dy = e.touches[0].clientY - touchStartY.current
    if (dy > 0 && sheetRef.current) {
      e.preventDefault()
      sheetRef.current.style.transform = `translateY(${dy}px)`
    }
  }

  function onHandleTouchEnd(e: React.TouchEvent) {
    const dy = e.changedTouches[0].clientY - touchStartY.current
    if (!sheetRef.current) return
    if (dy > 120) {
      sheetRef.current.style.transition = 'transform 0.28s cubic-bezier(0.4,0,1,1)'
      sheetRef.current.style.transform  = 'translateY(100%)'
      setTimeout(onClose, 260)
    } else {
      sheetRef.current.style.transition = 'transform 0.28s cubic-bezier(0.25,0.46,0.45,0.94)'
      sheetRef.current.style.transform  = ''
    }
  }

  const maxH = {
    auto: 'max-h-[80dvh]',
    tall: 'max-h-[82dvh]',
    full: 'max-h-[92dvh]',
  }[height]

  return createPortal(
    <>
      {/* Backdrop — `bottom` is overridden to bleed into the iOS PWA
          bottom safe area. The bleed value is computed in JS at
          runtime (see layout.tsx head script) and exposed as
          --safe-bleed-bottom on :root, so the CSS never depends on
          nested calc/max expressions that can be brittle in iOS
          Safari. */}
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/70 animate-backdrop-in"
        style={{
          zIndex: zIndex ? zIndex - 2 : 58,
          bottom: 'calc(var(--safe-bleed-bottom, 34px) * -1)',
        }}
        onClick={onClose}
      />

      {/*
       * Sheet — safe-area bleed pattern, robust to cached PWA configs.
       *
       * Empirically verified on iOS PWA standalone: in this webview
       * `fixed bottom: 0` anchors to the LAYOUT VIEWPORT bottom, NOT
       * the physical screen edge. The ~34px gap between them shows
       * the canvas / body background, which is the visible strip
       * below white sheets. Raw portal tests (no Framer Motion, no
       * Tailwind) reproduce the same gap — it is an iOS WebKit
       * standalone behavior, not our component chain.
       *
       * Additionally, iOS caches `apple-mobile-web-app-*` meta tags
       * at PWA install time. A PWA installed before we added
       * `black-translucent` + `viewport-fit=cover` keeps using the
       * older config, in which `env(safe-area-inset-bottom)` returns
       * 0 regardless of what the current HTML says. For those
       * installs, `calc(-1 * env)` collapses to 0 and the bleed does
       * nothing. `max(env, 34px)` forces at least 34px of bleed so
       * the sheet background still covers the typical home-indicator
       * zone even on stale installs. Content positioning does not
       * change: the padding-bottom compensation is computed with the
       * same max() expression, so the content stays at exactly the
       * same visual Y as before.
       *
       * Do NOT revert this to plain `bottom: 0` without empirically
       * re-running a raw portal test in the PWA standalone view.
       *
       * On devices with no bottom inset (Android, desktop) the
       * compensation cancels out identically and the bleed extends
       * invisibly 34px below the viewport (clipped, not rendered).
       */}
      <div
        ref={sheetRef}
        className={`
          fixed left-0 right-0
          bg-white dark:bg-[#1C1C1E]
          flex flex-col
          ${maxH}
          animate-slide-up
        `}
        style={{
          zIndex: zIndex ?? 60,
          bottom: 'calc(var(--safe-bleed-bottom, 34px) * -1)',
          paddingBottom: 'calc(16px + var(--safe-bleed-bottom, 34px))',
          borderRadius: '32px 32px 0 0',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle — drag zone */}
        <div
          className="flex-shrink-0 flex justify-center pt-3 pb-2 touch-none select-none"
          onTouchStart={onHandleTouchStart}
          onTouchMove={onHandleTouchMove}
          onTouchEnd={onHandleTouchEnd}
        >
          <div className="w-10 h-1 bg-[#D4D4D4] dark:bg-[#3A3A3C] rounded-full" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex-shrink-0 flex items-center justify-between px-5 py-3">
            <h2 className="text-[17px] font-semibold text-[#000000] dark:text-[#F2F2F7]">{title}</h2>
            <button
              onClick={onClose}
              className="w-11 h-11 rounded-full bg-[#F5F5F5] dark:bg-[#2C2C2E] flex items-center justify-center text-[#616161] dark:text-[#AEAEB2] transition-colors active:bg-[#EBEBEB] dark:active:bg-[#3A3A3C]"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>
        )}

        {/* Scrollable content */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-x-hidden min-h-0"
          style={{
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
          }}
        >
          {children}
        </div>

        {/* Optional fixed footer */}
        {footer && (
          <div className="flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </>,
    document.body
  )
}
