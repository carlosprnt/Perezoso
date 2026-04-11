'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { LogOut, Share2, ShieldCheck, Loader2, RotateCcw, Settings, ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getInitials, getAvatarPastel } from '@/lib/utils/logos'
import { useT } from '@/lib/i18n/LocaleProvider'
import { setDemoMode, restoreProductionState } from '@/app/(dashboard)/subscriptions/demo-action'

/**
 * Dark-themed account menu rendered inside the DraggableSurface backdrop
 * on the Dashboard. Replaces the dropdown popover that UserAvatarMenu
 * shows on desktop — on mobile, tapping the avatar reveals the surface
 * and the menu items live here against the black background.
 *
 * Actions dismiss the surface via the `oso:hide-analytics` window event
 * before navigating/executing.
 */
export default function AccountMenuPanel({ shareText }: { shareText?: string }) {
  const router = useRouter()
  const t = useT()
  const [isPending, startTransition] = useTransition()
  const [user, setUser] = useState<{ name: string; avatarUrl: string | null; email: string | null } | null>(null)
  const [imgError, setImgError] = useState(false)
  const [demoOpen, setDemoOpen] = useState(false)

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

  function hideSurface() {
    window.dispatchEvent(new Event('oso:hide-analytics'))
  }

  async function handleShare() {
    hideSurface()
    const text = shareText ?? 'Check my subscription overview tracked with Perezoso 🦥'
    if (navigator.share) {
      await navigator.share({ title: 'Perezoso — My Subscriptions', text }).catch(() => {})
    } else {
      try {
        await navigator.clipboard.writeText(text)
      } catch { /* clipboard unavailable — silently skip */ }
    }
  }

  async function handleLogout() {
    hideSurface()
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function handleSettings() {
    hideSurface()
    router.push('/settings')
  }

  function handleAdmin() {
    hideSurface()
    router.push('/admin/style-audit')
  }

  function handleDemoMode(count: number) {
    startTransition(async () => {
      await setDemoMode(count)
      setDemoOpen(false)
      hideSurface()
    })
  }

  function handleRestoreProduction() {
    startTransition(async () => {
      await restoreProductionState()
      setDemoOpen(false)
      hideSurface()
    })
  }

  const name = user?.name ?? ''
  const email = user?.email ?? ''
  const initials = getInitials(name || 'U')
  const { bg, fg } = getAvatarPastel(name || 'User')
  const isAdmin = email === 'carlosprnt@gmail.com'

  const DEMO_MODES = [
    { label: 'Sin suscripciones', count: 0 },
    { label: '1 suscripción',     count: 1 },
    { label: '2 suscripciones',   count: 2 },
    { label: '3 suscripciones',   count: 3 },
    { label: '20 suscripciones',  count: 20 },
  ] as const

  return (
    <div className="h-full overflow-y-auto px-6 pt-10 pb-40">
      {/* User card */}
      <div className="flex items-center gap-4 mb-10">
        <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0">
          {user?.avatarUrl && !imgError ? (
            <Image
              src={user.avatarUrl}
              alt={name}
              width={56}
              height={56}
              className="w-full h-full object-cover"
              unoptimized
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-[18px] font-semibold"
              style={{ backgroundColor: bg, color: fg }}
            >
              {initials}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[17px] font-semibold text-white truncate">{name}</p>
          {email && (
            <p className="text-[13px] text-white/50 truncate">{email}</p>
          )}
        </div>
      </div>

      {demoOpen ? (
        /* ── Demo submenu ───────────────────────────────────────────── */
        <div>
          <button
            onClick={() => setDemoOpen(false)}
            className="flex items-center gap-1.5 text-[#8B89FF] text-[14px] font-semibold mb-5 active:opacity-60 transition-opacity"
          >
            <ChevronLeft size={16} strokeWidth={2.5} />
            Demo
          </button>
          <div className="flex flex-col gap-1">
            {DEMO_MODES.map(({ label, count }) => (
              <DarkMenuItem
                key={count}
                label={label}
                onClick={() => handleDemoMode(count)}
                disabled={isPending}
                loading={isPending}
              />
            ))}
            <div className="h-px bg-white/10 my-2" />
            <DarkMenuItem
              icon={<RotateCcw size={18} strokeWidth={2} />}
              label="Volver a producción"
              onClick={handleRestoreProduction}
              disabled={isPending}
              loading={isPending}
              accent
            />
          </div>
        </div>
      ) : (
        /* ── Main menu ──────────────────────────────────────────────── */
        <div className="flex flex-col gap-1">
          <DarkMenuItem
            icon={<Settings size={18} strokeWidth={2} />}
            label="Ajustes"
            onClick={handleSettings}
          />
          <DarkMenuItem
            icon={<Share2 size={18} strokeWidth={2} />}
            label={t('nav.shareData')}
            onClick={handleShare}
          />
          {isAdmin && (
            <>
              <div className="h-px bg-white/10 my-2" />
              <DarkMenuItem
                icon={<ShieldCheck size={18} strokeWidth={2} />}
                label="Admin"
                onClick={handleAdmin}
                accent
              />
              <DarkMenuItem
                icon={<ChevronRight size={18} strokeWidth={2} />}
                label="Demo"
                onClick={() => setDemoOpen(true)}
                accent
                trailing={<ChevronRight size={16} className="text-white/30" />}
              />
            </>
          )}
          <div className="h-px bg-white/10 my-2" />
          <DarkMenuItem
            icon={<LogOut size={18} strokeWidth={2} />}
            label={t('nav.logout')}
            onClick={handleLogout}
            danger
          />
        </div>
      )}
    </div>
  )
}

function DarkMenuItem({
  icon,
  label,
  onClick,
  disabled,
  loading,
  accent,
  danger,
  trailing,
}: {
  icon?: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  accent?: boolean
  danger?: boolean
  trailing?: React.ReactNode
}) {
  const color = danger
    ? 'text-red-400'
    : accent
    ? 'text-[#8B89FF]'
    : 'text-white'
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-3 py-3.5 rounded-[16px] text-[16px] font-medium text-left active:bg-white/10 transition-colors disabled:opacity-50 ${color}`}
    >
      {icon && <span className="opacity-80 flex-shrink-0">{icon}</span>}
      <span className="flex-1 truncate">{label}</span>
      {loading ? (
        <Loader2 size={16} className="animate-spin opacity-60 flex-shrink-0" />
      ) : (
        trailing
      )}
    </button>
  )
}
