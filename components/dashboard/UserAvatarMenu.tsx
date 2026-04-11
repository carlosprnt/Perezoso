'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { LogOut, Share2, ShieldCheck, ChevronRight, ChevronLeft, Loader2, RotateCcw, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { getInitials, getAvatarPastel } from '@/lib/utils/logos'
import { useT } from '@/lib/i18n/LocaleProvider'
import { setDemoMode, restoreProductionState } from '@/app/(dashboard)/subscriptions/demo-action'

interface UserAvatarMenuProps {
  shareText?: string
  /** When provided, tapping the avatar calls this instead of opening the
      dropdown. Used on the dashboard mobile surface where the account menu
      lives in the backdrop layer (revealed by dispatching
      `oso:reveal-analytics`) rather than as a popover. */
  onTap?: () => void
}

export default function UserAvatarMenu({ shareText, onTap }: UserAvatarMenuProps) {
  const router = useRouter()
  const t = useT()
  const [open, setOpen] = useState(false)
  const [demoOpen, setDemoOpen] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
  const [user, setUser] = useState<{ name: string; avatarUrl: string | null; email: string | null } | null>(null)
  const buttonRef   = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Coin flip state: accumulate rotateY in multiples of 900° (2.5 turns → always opposite face)
  const [coinDeg, setCoinDeg]         = useState(0)
  const [flipDuration, setFlipDuration] = useState('0.5s')
  const flipping                        = useRef(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({
          name:      data.user.user_metadata?.full_name ?? data.user.email ?? 'Account',
          avatarUrl: data.user.user_metadata?.avatar_url ?? null,
          email:     data.user.email ?? null,
        })
      }
    })
  }, [])

  // Close on outside click / scroll
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      const insideButton   = buttonRef.current?.contains(e.target as Node)
      const insideDropdown = dropdownRef.current?.contains(e.target as Node)
      if (!insideButton && !insideDropdown) setOpen(false)
    }
    function onScroll() { setOpen(false) }
    if (open) {
      document.addEventListener('mousedown', onMouseDown)
      window.addEventListener('scroll', onScroll, { passive: true })
    }
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('scroll', onScroll)
    }
  }, [open])

  function handleOpen() {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right })
    }
    setOpen(o => { if (o) setDemoOpen(false); return !o })
  }

  // When dropdown closes, animate back to face A (nearest 360n multiple going forward)
  useEffect(() => {
    if (!open) {
      setCoinDeg(d => {
        const offset = d % 360
        if (offset !== 0) {
          setFlipDuration('0.4s')
          return d + (360 - offset)
        }
        return d
      })
    }
  }, [open])

  function handleAvatarClick() {
    // Coin flip: 900° = 2.5 full turns, always lands on the opposite face
    if (!flipping.current) {
      flipping.current = true
      setFlipDuration('0.45s')
      setCoinDeg(d => d + 900)
      setTimeout(() => { flipping.current = false }, 500)
    }
    // External tap handler takes over (e.g. dashboard surface reveal).
    if (onTap) {
      onTap()
      return
    }
    handleOpen()
  }

  async function handleShare() {
    setOpen(false)
    const text = shareText ?? 'Check my subscription overview tracked with Perezoso 🦥'
    if (navigator.share) {
      await navigator.share({ title: 'Perezoso — My Subscriptions', text }).catch(() => {})
    } else {
      try {
        await navigator.clipboard.writeText(text)
      } catch { /* clipboard also unavailable — silently skip */ }
    }
  }

  async function handleLogout() {
    setOpen(false)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const name     = user?.name ?? ''
  const { bg, fg } = getAvatarPastel(name || 'User')
  const initials = getInitials(name || 'U')

  // Face A = avatar (coinDeg % 360 ≈ 0°), Face B = logo (coinDeg % 360 ≈ 180°)
  const faceStyle: React.CSSProperties = {
    position: 'absolute', inset: 0,
    borderRadius: '50%', overflow: 'hidden',
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden' as any,
  }

  const DEMO_MODES = [
    { label: 'Sin suscripciones', count: 0 },
    { label: '1 suscripción',     count: 1 },
    { label: '2 suscripciones',   count: 2 },
    { label: '3 suscripciones',   count: 3 },
    { label: '20 suscripciones',  count: 20 },
  ] as const

  function handleDemoMode(count: number) {
    startTransition(async () => {
      await setDemoMode(count)
      setOpen(false)
      setDemoOpen(false)
    })
  }

  function handleRestoreProduction() {
    startTransition(async () => {
      await restoreProductionState()
      setOpen(false)
      setDemoOpen(false)
    })
  }

  const dropdown = open ? (
    <div
      ref={dropdownRef}
      style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
      className="w-56 bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E8E8E8] dark:border-[#2C2C2E] shadow-[0_4px_24px_rgba(0,0,0,0.12)] overflow-hidden animate-fade-in-scale"
    >
      {demoOpen ? (
        /* ── Demo submenu ─────────────────────────────────────────────── */
        <>
          <div className="px-4 py-3 border-b border-[#F0F0F0] dark:border-[#2C2C2E] flex items-center gap-2">
            <button
              onClick={() => setDemoOpen(false)}
              className="text-[#3D3BF3] flex items-center gap-1 text-sm font-medium"
            >
              <ChevronLeft size={15} />
              Demo
            </button>
          </div>
          <div className="py-1.5">
            {DEMO_MODES.map(({ label, count }) => (
              <button
                key={count}
                onClick={() => handleDemoMode(count)}
                disabled={isPending}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-[#424242] dark:text-[#AEAEB2] hover:bg-[#F5F5F5] dark:hover:bg-[#2C2C2E] transition-colors text-left disabled:opacity-50"
              >
                {label}
                {isPending ? <Loader2 size={13} className="animate-spin text-[#8E8E93]" /> : null}
              </button>
            ))}
            <div className="h-px bg-[#F0F0F0] dark:bg-[#2C2C2E] mx-2 my-1" />
            <button
              onClick={handleRestoreProduction}
              disabled={isPending}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-[#3D3BF3] hover:bg-[#F5F5F5] dark:hover:bg-[#2C2C2E] transition-colors text-left disabled:opacity-50"
            >
              <span className="flex items-center gap-3">
                <RotateCcw size={15} />
                Volver a producción
              </span>
              {isPending ? <Loader2 size={13} className="animate-spin text-[#8E8E93]" /> : null}
            </button>
          </div>
        </>
      ) : (
        /* ── Normal menu ──────────────────────────────────────────────── */
        <>
          <div className="px-4 py-3 border-b border-[#F0F0F0] dark:border-[#2C2C2E]">
            <p className="text-sm font-semibold text-[#121212] dark:text-[#F2F2F7] truncate">{name}</p>
          </div>
          <div className="py-1.5">
            <button
              onClick={() => { setOpen(false); router.push('/settings') }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#424242] dark:text-[#AEAEB2] hover:bg-[#F5F5F5] dark:hover:bg-[#2C2C2E] transition-colors text-left"
            >
              <Settings size={15} className="text-[#616161] dark:text-[#8E8E93]" />
              Ajustes
            </button>
            <button
              onClick={handleShare}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#424242] dark:text-[#AEAEB2] hover:bg-[#F5F5F5] dark:hover:bg-[#2C2C2E] transition-colors text-left"
            >
              <Share2 size={15} className="text-[#616161] dark:text-[#8E8E93]" />
              {t('nav.shareData')}
            </button>
            {user?.email === 'carlosprnt@gmail.com' && (
              <>
                <div className="h-px bg-[#F0F0F0] dark:bg-[#2C2C2E] mx-2 my-1" />
                <button
                  onClick={() => { setOpen(false); router.push('/admin/style-audit') }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#3D3BF3] hover:bg-[#F5F5F5] dark:hover:bg-[#2C2C2E] transition-colors text-left"
                >
                  <ShieldCheck size={15} />
                  Admin
                </button>
                <button
                  onClick={() => setDemoOpen(true)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-[#3D3BF3] hover:bg-[#F5F5F5] dark:hover:bg-[#2C2C2E] transition-colors text-left"
                >
                  <span className="flex items-center gap-3">
                    <ChevronRight size={15} />
                    Demo
                  </span>
                  <ChevronRight size={13} className="text-[#C7C7CC]" />
                </button>
              </>
            )}
            <div className="h-px bg-[#F0F0F0] dark:bg-[#2C2C2E] mx-2 my-1" />
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
            >
              <LogOut size={15} />
              {t('nav.logout')}
            </button>
          </div>
        </>
      )}
    </div>
  ) : null

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleAvatarClick}
        className="w-10 h-10 flex-shrink-0 focus:outline-none"
        style={{ perspective: '200px' }}
        aria-label="Account menu"
      >
        {/* 3-D flip container */}
        <div
          style={{
            transformStyle:  'preserve-3d',
            transform:       `rotateY(${coinDeg}deg)`,
            transition:      `transform ${flipDuration} cubic-bezier(0.05, 0.95, 0.2, 1)`,
            position:        'relative',
            width:           '100%',
            height:          '100%',
            borderRadius:    '50%',
          }}
        >
          {/* Face A — Gmail avatar */}
          <div style={faceStyle}>
            {user?.avatarUrl && !imgError ? (
              <Image
                src={user.avatarUrl}
                alt={name}
                width={40}
                height={40}
                className="w-full h-full object-cover"
                unoptimized
                onError={() => setImgError(true)}
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-sm font-semibold"
                style={{ backgroundColor: bg, color: fg }}
              >
                {initials}
              </div>
            )}
          </div>

          {/* Face B — Perezoso logo */}
          <div style={{ ...faceStyle, transform: 'rotateY(180deg)' }}>
            <Image
              src="/logo.png"
              alt="Perezoso"
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </button>

      {typeof document !== 'undefined' && createPortal(dropdown, document.body)}
    </div>
  )
}
