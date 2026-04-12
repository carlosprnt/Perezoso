'use client'

import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { LogOut, Share2, Settings, Sun, Moon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/components/ui/ThemeProvider'
import { useSubscription } from '@/lib/revenuecat/SubscriptionProvider'
import { useT } from '@/lib/i18n/LocaleProvider'

/**
 * Dark-themed account menu rendered inside the DraggableSurface backdrop
 * on the Dashboard. Tapping the avatar reveals this layer; actions dispatch
 * `oso:hide-analytics` to dismiss before navigating/executing.
 *
 * Admin + Demo controls live inside the Settings page (gated there by the
 * user's email); this panel keeps only the quick-access user actions.
 */
export default function AccountMenuPanel({ shareText }: { shareText?: string }) {
  const router = useRouter()
  const t = useT()
  const { isPro, openPaywall } = useSubscription()

  function hideSurface() {
    window.dispatchEvent(new Event('oso:hide-analytics'))
  }

  function handleUpgrade() {
    hideSurface()
    openPaywall('general')
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
    // Open the modal instead of navigating. The SettingsModal mounted
    // in the dashboard layout listens for this event and slides the
    // settings view in as a bottom sheet.
    window.dispatchEvent(new Event('oso:open-settings'))
  }

  return (
    // Bottom padding clears the foreground peek strip (PEEK_HEIGHT = 120px)
    // plus the iOS safe-area inset so the footer row stays above the strip.
    <div
      className="h-full flex flex-col px-5 pt-24"
      style={{ paddingBottom: 'calc(120px + env(safe-area-inset-bottom) + 24px)' }}
    >
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* 2-column grid: Ajustes + Compartir datos as tile cells.
            Each cell is a very dark gray card with the icon stacked
            above the label. */}
        <div className="grid grid-cols-2 gap-2">
          <DarkTile
            icon={<Settings size={22} strokeWidth={2} />}
            label="Ajustes"
            onClick={handleSettings}
          />
          <DarkTile
            icon={<Share2 size={22} strokeWidth={2} />}
            label={t('nav.shareData')}
            onClick={handleShare}
          />
        </div>

          {/* Upgrade-to-Pro banner — same structure as the Settings
              Perezoso Plus banner but transparent with a static white
              1px stroke so it blends with the black backdrop. White
              text, white CTA pill. Hidden when already Pro. */}
          {!isPro && (
            <div className="relative mt-4 rounded-2xl border border-white/90 px-5 py-5 flex items-center gap-4">
              {/* Title + description */}
              <div className="flex-1 min-w-0">
                <p className="text-[20px] font-bold text-white leading-tight">
                  Perezoso Plus
                </p>
                <p className="text-[13px] text-white/70 mt-1 leading-snug">
                  Desbloquea todas las features
                </p>
              </div>
              {/* CTA — solid white pill with black text, pops against the
                  transparent card + dark backdrop. */}
              <button
                onClick={handleUpgrade}
                className="h-10 px-5 rounded-full bg-white text-black text-[14px] font-semibold flex-shrink-0 active:opacity-80 transition-opacity"
              >
                Mejorar
              </button>
            </div>
          )}
        </div>

      {/* Footer row: logout (left) + theme toggle (right), both matching
          size/typography so they visually share a baseline. */}
      <div className="flex items-center justify-between mt-4">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 text-[14px] font-medium text-[#FCA5A5] active:opacity-70 transition-opacity"
          aria-label={t('nav.logout')}
        >
          <LogOut size={18} strokeWidth={2} />
          {t('nav.logout')}
        </button>
        <ThemeToggleLink />
      </div>
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
      className="flex items-center gap-2.5 text-[14px] font-medium text-white active:opacity-60 transition-opacity"
      aria-label="Toggle theme"
    >
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
      <span className="relative w-[18px] h-[18px] flex items-center justify-center">
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
    </button>
  )
}

// Tile cell for the 2-column grid at the top of the black layer.
// Very dark gray card, icon on top, label underneath.
function DarkTile({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon?: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-start gap-6 px-5 py-5 rounded-[20px] bg-[#151517] text-white active:bg-[#1F1F22] transition-colors disabled:opacity-50 min-h-[120px]"
    >
      {icon && <span className="opacity-95">{icon}</span>}
      <span className="text-[15px] font-semibold">{label}</span>
    </button>
  )
}
