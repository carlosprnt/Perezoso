'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, Plus, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import BottomSheet from '@/components/ui/BottomSheet'
import SubscriptionAvatar from '@/components/subscriptions/SubscriptionAvatar'
import SubscriptionForm from '@/components/subscriptions/SubscriptionForm'
import GmailSubscriptionSearchSheet from '@/components/subscriptions/GmailSubscriptionSearchSheet'
import { useT } from '@/lib/i18n/LocaleProvider'
import { useTheme } from '@/components/ui/ThemeProvider'
import { useFeatureGate } from '@/lib/revenuecat/useFeatureGate'
import haptics from '@/lib/haptics'
import { PLATFORMS, resolvePlatformLogoUrl, type PlatformPreset } from '@/lib/constants/platforms'

type Step = 'closed' | 'pick' | 'form' | 'gmail'

const BTN_W = 72   // button width
const BTN_H = 48   // button height
const PAD  = 8     // pill padding
const GAP  = 8     // gap between buttons

function CardIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="3" />
      {/* Stripe drawn in bg-matching colour when filled so it cuts
          through the solid fill and reads as a card, not a blob. */}
      {filled ? (
        <line x1="2" y1="10" x2="22" y2="10" stroke="#F7F8FA" strokeWidth={2.5} />
      ) : (
        <line x1="2" y1="10" x2="22" y2="10" />
      )}
    </svg>
  )
}

export default function FloatingNav() {
  const t = useT()
  const pathname = usePathname()
  const { theme } = useTheme()
  const isDarkMode = theme === 'dark'
  const [step, setStep] = useState<Step>('closed')
  const [platform, setPlatform] = useState<PlatformPreset | null>(null)

  useEffect(() => {
    try {
      const pending = localStorage.getItem('perezoso_gmail_pending')
      if (pending === '1') {
        localStorage.removeItem('perezoso_gmail_pending')
        const timer = setTimeout(() => setStep('gmail'), 350)
        return () => clearTimeout(timer)
      }
    } catch { /* localStorage unavailable */ }
  }, [])

  function handleSelect(p: PlatformPreset | null) {
    setPlatform(p)
    setStep('form')
  }
  function close() {
    setStep('closed')
    setPlatform(null)
  }

  const isDash = pathname === '/dashboard' || pathname.startsWith('/dashboard/')
  const isSubs = pathname === '/subscriptions' || pathname.startsWith('/subscriptions/')
  const hideNav = pathname === '/settings' || pathname.startsWith('/settings/')

  // SubscriptionsView broadcasts its count via a custom event so we can
  // emphasize the "+" CTA without a second Supabase roundtrip from here.
  // We also use the exact count to gate the "+" button against the free
  // 15-subscription limit.
  const [subsCount, setSubsCount] = useState<number>(0)
  useEffect(() => {
    function onCount(e: Event) {
      const count = (e as CustomEvent<number>).detail
      setSubsCount(count)
    }
    window.addEventListener('perezoso:subs-count', onCount)
    return () => window.removeEventListener('perezoso:subs-count', onCount)
  }, [])

  const gate = useFeatureGate()
  const hasNoSubs = subsCount === 0
  const emphasizeAdd = isSubs && hasNoSubs

  function handlePlusTap() {
    haptics.tap('medium')
    // Pro gate: free users capped at 15. Opens paywall instead of the
    // creation sheet when the limit is reached.
    if (!gate.requireSubscriptionSlot(subsCount)) return
    setStep('pick')
  }

  // x offset of the sliding bg — no longer used (active = stroke, not fill)
  // const bgX = isSubs ? BTN_W + GAP : 0

  // All icons are dark in both modes; active state is on the container (stroke).
  const iconColor = isDarkMode ? '#F2F2F7' : '#000000'

  // Bottom offset: 20px + safe-area
  const bottomOffset = 'calc(env(safe-area-inset-bottom) - 20px)'

  return (
    <>
      {/* ── Floating nav — mobile only, hidden on settings ────────────────── */}
      {!hideNav && (
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
        style={{
          height: `calc(${BTN_H + PAD * 2}px + env(safe-area-inset-bottom))`,
          // Follow the draggable surface when it's lowered
          transform: 'translateY(var(--surface-y, 0px))',
        }}
      >
        {/* Pill — centred at bottom */}
        <div className="absolute left-1/2 -translate-x-1/2 pointer-events-auto"
          style={{ bottom: bottomOffset }}
        >
          <div
            className="floating-pill relative flex items-center rounded-full"
            style={{
              padding: PAD,
              gap: GAP,
              background: isDarkMode ? 'rgba(28,28,30,0.85)' : 'rgba(255,255,255,0.65)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            {/* Sliding stroke indicator — animates horizontally between
                Dashboard (x=0) and Subscriptions (x=2*(BTN_W+GAP)).
                The "+" button in the middle is skipped. */}
            <motion.div
              className="absolute rounded-full"
              style={{
                width: BTN_W,
                height: BTN_H,
                top: PAD,
                left: PAD,
                zIndex: 1,
                border: `2px solid ${isDarkMode ? '#F2F2F7' : '#000000'}`,
              }}
              animate={{ x: isSubs ? 2 * (BTN_W + GAP) : 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.8 }}
            />

            {/* Dashboard button */}
            <Link href="/dashboard" aria-label={t('nav.dashboard')}>
              <div className="relative flex items-center justify-center rounded-full"
                style={{
                  width: BTN_W,
                  height: BTN_H,
                  zIndex: 2,
                  border: isDash ? 'none' : `1.5px solid ${isDarkMode ? '#2C2C2E' : '#E5E5EA'}`,
                }}
              >
                <LayoutGrid size={20} strokeWidth={2} color={iconColor} fill={isDash ? iconColor : 'none'} />
              </div>
            </Link>

            {/* + button — black circle with white plus, same height */}
            <motion.button
              onClick={handlePlusTap}
              aria-label="Add subscription"
              className="relative flex items-center justify-center rounded-full bg-[#000000] dark:bg-[#F2F2F7]"
              style={{ width: BTN_W, height: BTN_H, zIndex: 2 }}
              animate={emphasizeAdd ? { scale: [1, 1.15, 1] } : { scale: 1 }}
              transition={
                emphasizeAdd
                  ? { duration: 1.6, ease: 'easeInOut', repeat: Infinity }
                  : { type: 'spring', stiffness: 300, damping: 22 }
              }
              whileTap={{ scale: 0.95 }}
            >
              <Plus size={20} color={isDarkMode ? '#000000' : '#ffffff'} strokeWidth={2.5} />
            </motion.button>

            {/* Subscriptions button */}
            <Link href="/subscriptions" aria-label={t('nav.subscriptions')}>
              <div className="relative flex items-center justify-center rounded-full"
                style={{
                  width: BTN_W,
                  height: BTN_H,
                  zIndex: 2,
                  color: iconColor,
                  border: isSubs ? 'none' : `1.5px solid ${isDarkMode ? '#2C2C2E' : '#E5E5EA'}`,
                }}
              >
                <CardIcon filled={isSubs} />
              </div>
            </Link>

          </div>
        </div>
      </nav>
      )}

      {/* ── Add panel — dark overlay expanding from the + button ─────────── */}
      <AnimatePresence>
        {step === 'pick' && (
          <motion.div
            className="lg:hidden fixed z-[55] overflow-hidden flex flex-col"
            style={{
              left: 10,
              right: 10,
              bottom: 10,
              height: '70dvh',
              transformOrigin: 'bottom center',
            }}
            initial={{ scaleX: 0.15, scaleY: 0.08, borderRadius: 40, opacity: 0 }}
            animate={{ scaleX: 1, scaleY: 1, borderRadius: 28, opacity: 1 }}
            exit={{ scaleX: 0.15, scaleY: 0.08, borderRadius: 40, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Background with blur */}
            <div
              className="absolute inset-0 bg-[#0a0a0a]/95"
              style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: 'inherit' }}
            />

            {/* Content */}
            <div className="relative flex flex-col h-full z-[1]">
              {/* Header with close button */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <h2 className="text-[17px] font-semibold text-white">{t('sheets.createNew')}</h2>
                <button
                  onClick={close}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20 transition-colors"
                >
                  <X size={15} strokeWidth={2.5} className="text-white" />
                </button>
              </div>

              {/* Scrollable platform list */}
              <div className="flex-1 overflow-y-auto px-3 pb-3">
                <div className="space-y-0.5">
                  {PLATFORMS.map(platform => (
                    <button
                      key={platform.id}
                      onClick={() => handleSelect(platform)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl active:bg-white/10 transition-colors text-left"
                    >
                      <SubscriptionAvatar
                        name={platform.name}
                        logoUrl={resolvePlatformLogoUrl(platform)}
                        size="sm40"
                        corner="rounded-xl"
                      />
                      <span className="text-[15px] font-medium text-white">{platform.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Footer buttons */}
              <div className="flex gap-3 px-5 py-4">
                <button
                  onClick={() => setStep('gmail')}
                  className="flex-1 h-12 rounded-full text-sm font-semibold text-white border border-white/30 bg-transparent flex items-center justify-center active:bg-white/10 transition-colors"
                >
                  {t('picker.searchGmail')}
                </button>
                <button
                  onClick={() => handleSelect(null)}
                  className="flex-1 h-12 rounded-full text-sm font-semibold text-black bg-white flex items-center justify-center active:bg-white/90 transition-colors"
                >
                  {t('picker.enterManually')}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop — dims the page when the add panel is open */}
      <AnimatePresence>
        {step === 'pick' && (
          <motion.div
            className="lg:hidden fixed inset-0 z-[54] bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={close}
          />
        )}
      </AnimatePresence>

      {/* Step 2 — Form */}
      <BottomSheet isOpen={step === 'form'} onClose={close} height="full">
        <SubscriptionForm mode="create" platformPreset={platform ?? undefined} onCancel={close} />
      </BottomSheet>

      {/* Gmail search sheet */}
      <GmailSubscriptionSearchSheet isOpen={step === 'gmail'} onClose={close} />
    </>
  )
}
