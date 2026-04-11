'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { LogOut, Share2, ShieldCheck, Loader2, RotateCcw, Settings, ChevronLeft, ChevronRight, Sun, Moon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/components/ui/ThemeProvider'
import { useT } from '@/lib/i18n/LocaleProvider'
import { setDemoMode, restoreProductionState } from '@/app/(dashboard)/subscriptions/demo-action'

/**
 * Dark-themed account menu rendered inside the DraggableSurface backdrop
 * on the Dashboard. Tapping the avatar reveals this layer; actions dispatch
 * `oso:hide-analytics` to dismiss before navigating/executing.
 */
export default function AccountMenuPanel({ shareText }: { shareText?: string }) {
  const router = useRouter()
  const t = useT()
  const [isPending, startTransition] = useTransition()
  const [email, setEmail] = useState<string | null>(null)
  const [demoOpen, setDemoOpen] = useState(false)

  // Only need the email for admin gating — the big user card is gone.
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setEmail(data.user.email ?? null)
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

  const isAdmin = email === 'carlosprnt@gmail.com'

  const DEMO_MODES = [
    { label: 'Sin suscripciones', count: 0 },
    { label: '1 suscripción',     count: 1 },
    { label: '2 suscripciones',   count: 2 },
    { label: '3 suscripciones',   count: 3 },
    { label: '20 suscripciones',  count: 20 },
  ] as const

  return (
    // Bottom padding clears the foreground peek strip (PEEK_HEIGHT = 120px)
    // plus the iOS safe-area inset so the theme toggle stays visible above
    // the bottom of the dark layer.
    <div
      className="h-full flex flex-col px-5 pt-24"
      style={{ paddingBottom: 'calc(120px + env(safe-area-inset-bottom) + 24px)' }}
    >
      <div className="flex-1 min-h-0 overflow-y-auto">
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

      {/* Theme toggle pinned to the bottom of the dark layer */}
      <ThemeToggleLink />
    </div>
  )
}

// ─── Theme toggle link ────────────────────────────────────────────────────
function ThemeToggleLink() {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggle}
      className="self-start flex items-center gap-2.5 text-[14px] font-medium text-white/70 active:opacity-60 transition-opacity mt-4"
      aria-label="Toggle theme"
    >
      <span className="relative w-5 h-5 flex items-center justify-center">
        <AnimatePresence initial={false} mode="wait">
          {isDark ? (
            <motion.span
              key="moon"
              initial={{ rotate: -90, scale: 0.3, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: 90, scale: 0.3, opacity: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Moon size={18} strokeWidth={2} />
            </motion.span>
          ) : (
            <motion.span
              key="sun"
              initial={{ rotate: 90, scale: 0.3, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: -90, scale: 0.3, opacity: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Sun size={18} strokeWidth={2} />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <AnimatePresence initial={false} mode="wait">
        <motion.span
          key={isDark ? 'dark-label' : 'light-label'}
          initial={{ y: 6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -6, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          {isDark ? 'Dark mode' : 'Light mode'}
        </motion.span>
      </AnimatePresence>
    </button>
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
