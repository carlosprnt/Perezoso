'use client'

import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { LogOut, Share2, Settings, Sun, Moon, Sparkles } from 'lucide-react'
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
    router.push('/settings')
  }

  return (
    // Bottom padding clears the foreground peek strip (PEEK_HEIGHT = 120px)
    // plus the iOS safe-area inset so the footer row stays above the strip.
    <div
      className="h-full flex flex-col px-5 pt-24"
      style={{ paddingBottom: 'calc(120px + env(safe-area-inset-bottom) + 24px)' }}
    >
      <div className="flex-1 min-h-0 overflow-y-auto">
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

          {/* Upgrade-to-Pro banner — full-width CTA below "Compartir datos".
              Same animated blue shimmer border as the Settings card so the
              Pro branding stays consistent across surfaces. Hidden when the
              user is already Pro. */}
          {!isPro && (
            <div
              className="relative mt-4 rounded-[20px] p-[2px]"
              style={{
                background: 'conic-gradient(from var(--shimmer-angle, 0deg), transparent 0%, transparent 55%, rgba(59,130,246,0.95) 72%, rgba(96,165,250,0.55) 82%, transparent 92%, transparent 100%)',
                animation: 'shimmer-rotate 3s linear infinite',
              }}
            >
              <button
                onClick={handleUpgrade}
                className="w-full h-14 rounded-[18px] bg-white text-black flex items-center justify-center gap-2 text-[15px] font-semibold active:opacity-90 transition-opacity"
              >
                <Sparkles size={18} strokeWidth={2.2} />
                Mejorar a Pro
              </button>
            </div>
          )}
        </div>
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
      className="flex items-center gap-2.5 text-[14px] font-medium text-white/70 active:opacity-60 transition-opacity"
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

function DarkMenuItem({
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
      className="w-full flex items-center gap-3 px-3 py-3.5 rounded-[16px] text-[16px] font-medium text-left active:bg-white/10 transition-colors disabled:opacity-50 text-white"
    >
      {icon && <span className="opacity-80 flex-shrink-0">{icon}</span>}
      <span className="flex-1 truncate">{label}</span>
    </button>
  )
}
