'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import BottomSheet from '@/components/ui/BottomSheet'
import PlatformPicker from '@/components/subscriptions/PlatformPicker'
import SubscriptionForm from '@/components/subscriptions/SubscriptionForm'
import GmailSubscriptionSearchSheet from '@/components/subscriptions/GmailSubscriptionSearchSheet'
import { useT } from '@/lib/i18n/LocaleProvider'
import { useTheme } from '@/components/ui/ThemeProvider'
import { useFeatureGate } from '@/lib/revenuecat/useFeatureGate'
import haptics from '@/lib/haptics'
import type { PlatformPreset } from '@/lib/constants/platforms'

type Step = 'closed' | 'pick' | 'form' | 'gmail'

const BTN_W = 72   // button width
const BTN_H = 48   // button height
const PAD  = 8     // pill padding
const GAP  = 8     // gap between buttons

function TagHeartIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
      <path d="M8.5 8.5c.5-1 2-1 2 .5 0 1-2 2-2 2s-2-1-2-2c0-1.5 1.5-1.5 2-.5z" strokeWidth="1.5" />
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

  // x offset of the sliding bg: Dashboard=0, Subscriptions=1
  const bgX = isSubs ? BTN_W + GAP : 0

  // Icon colors depend on dark mode
  const activeIconColor = isDarkMode ? '#121212' : '#ffffff'
  const inactiveIconColor = isDarkMode ? '#AEAEB2' : '#121212'

  // Bottom offset: 20px + safe-area
  const bottomOffset = 'calc(env(safe-area-inset-bottom) - 20px)'

  return (
    <>
      {/* ── Floating nav — mobile only, hidden on settings ────────────────── */}
      {!hideNav && (
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
        style={{ height: `calc(${BTN_H + PAD * 2}px + env(safe-area-inset-bottom))` }}
      >
        {/* Pill — left-aligned at 20px, 16px from bottom */}
        <div className="absolute left-5 pointer-events-auto"
          style={{ bottom: bottomOffset }}
        >
          <div
            className="floating-pill relative flex items-center rounded-full overflow-hidden"
            style={{
              padding: PAD,
              gap: GAP,
              background: isDarkMode ? 'rgba(28,28,30,0.85)' : 'rgba(255,255,255,0.65)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: `1px solid ${isDarkMode ? '#3A3A3C' : '#BCBCBC'}`,
            }}
          >
            {/* Static backgrounds — always visible behind each button */}
            <div
              className="absolute rounded-full"
              style={{ width: BTN_W, height: BTN_H, top: PAD, left: PAD, backgroundColor: isDarkMode ? '#2C2C2E' : '#EEEEEE' }}
            />
            <div
              className="absolute rounded-full"
              style={{ width: BTN_W, height: BTN_H, top: PAD, left: PAD + BTN_W + GAP, backgroundColor: isDarkMode ? '#2C2C2E' : '#EEEEEE' }}
            />

            {/* Sliding indicator */}
            <motion.div
              className="absolute rounded-full"
              style={{ width: BTN_W, height: BTN_H, top: PAD, left: PAD, zIndex: 1, backgroundColor: isDarkMode ? '#F2F2F7' : '#121212' }}
              animate={{ x: bgX }}
              transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.8 }}
            />

            {/* Dashboard button */}
            <Link href="/dashboard" aria-label={t('nav.dashboard')}>
              <div className="relative flex items-center justify-center rounded-full"
                style={{ width: BTN_W, height: BTN_H, zIndex: 2 }}
              >
                <LayoutGrid size={20} strokeWidth={2}
                  color={isDash ? activeIconColor : inactiveIconColor} />
              </div>
            </Link>

            {/* Subscriptions button */}
            <Link href="/subscriptions" aria-label={t('nav.subscriptions')}>
              <div className="relative flex items-center justify-center rounded-full"
                style={{ width: BTN_W, height: BTN_H, zIndex: 2, color: isSubs ? activeIconColor : inactiveIconColor }}
              >
                <TagHeartIcon active={false} />
              </div>
            </Link>

          </div>
        </div>

        {/* + button — right edge, 16px margin, same bottom as pill.
            When the user has no subscriptions yet, it scales to 2x to
            emphasize it as the primary call to action. */}
        <div
          className="absolute right-4 pointer-events-auto"
          style={{ bottom: `calc(${bottomOffset} + 4px)` }}
        >
          {/* Animated shimmer ring */}
          <div
            className="absolute inset-[-2px] rounded-full"
            style={{
              background: 'conic-gradient(from 0deg, transparent 0%, transparent 60%, rgba(255,255,255,0.45) 75%, transparent 90%, transparent 100%)',
              animation: 'shimmer-spin 3s linear infinite',
            }}
          />
          <motion.button
            onClick={handlePlusTap}
            aria-label="Add subscription"
            className="relative flex items-center justify-center rounded-full bg-[#3D3BF3]"
            style={{
              width: 56,
              height: 56,
              originX: 1,
              originY: 1,
              boxShadow: '0 4px 16px rgba(61,59,243,0.40)',
            }}
            animate={emphasizeAdd ? { scale: [1, 1.25, 1] } : { scale: 1 }}
            transition={
              emphasizeAdd
                ? { duration: 1.6, ease: 'easeInOut', repeat: Infinity }
                : { type: 'spring', stiffness: 300, damping: 22 }
            }
            whileTap={{ scale: 0.95 }}
          >
            <Plus size={22} color="#ffffff" strokeWidth={2.5} />
          </motion.button>
        </div>
      </nav>
      )}

      {/* Step 1 — Platform picker */}
      <BottomSheet
        isOpen={step === 'pick'}
        onClose={close}
        title={t('sheets.createNew')}
        height="tall"
        footer={
          <div
            className="flex gap-3 px-5 py-4 border-t border-[#F0F0F0] dark:border-[#2C2C2E]"
          >
            <button
              onClick={() => setStep('gmail')}
              className="flex-1 h-12 rounded-full text-sm font-semibold text-[#3D3BF3] dark:text-[#8B89FF] border border-[#3D3BF3] dark:border-[#8B89FF] bg-transparent flex items-center justify-center active:bg-[#F0F0FF] dark:active:bg-[#1E1D3A] transition-colors"
            >
              {t('picker.searchGmail')}
            </button>
            <button
              onClick={() => handleSelect(null)}
              className="flex-1 h-12 rounded-full text-sm font-semibold text-white bg-[#3D3BF3] flex items-center justify-center active:bg-[#3230D0] transition-colors"
            >
              {t('picker.enterManually')}
            </button>
          </div>
        }
      >
        <PlatformPicker onSelect={handleSelect} />
      </BottomSheet>

      {/* Step 2 — Form */}
      <BottomSheet isOpen={step === 'form'} onClose={close} height="full">
        <SubscriptionForm mode="create" platformPreset={platform ?? undefined} onCancel={close} />
      </BottomSheet>

      {/* Gmail search sheet */}
      <GmailSubscriptionSearchSheet isOpen={step === 'gmail'} onClose={close} />
    </>
  )
}
