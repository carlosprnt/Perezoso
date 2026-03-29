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
import type { PlatformPreset } from '@/lib/constants/platforms'

type Step = 'closed' | 'pick' | 'form' | 'gmail'

// Button width + gap — used to compute sliding bg offset
const BTN_W = 64
const GAP = 8

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
  const [step, setStep] = useState<Step>('closed')
  const [platform, setPlatform] = useState<PlatformPreset | null>(null)

  useEffect(() => {
    const pending = localStorage.getItem('perezoso_gmail_pending')
    if (pending === '1') {
      localStorage.removeItem('perezoso_gmail_pending')
      const timer = setTimeout(() => setStep('gmail'), 350)
      return () => clearTimeout(timer)
    }
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

  // x offset of the sliding bg: 0 = dashboard, BTN_W+GAP = subscriptions
  const bgX = isSubs ? BTN_W + GAP : 0

  return (
    <>
      {/* ── Floating nav bar — mobile only ──────────────────────────────────── */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
        style={{ height: 64, paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Pill — centered */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
        >
          <div
            className="relative flex items-center rounded-full overflow-hidden"
            style={{
              padding: 8,
              gap: GAP,
              background: 'rgba(255,255,255,0.80)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid #BCBCBC',
            }}
          >
            {/* Sliding black background — sits behind icons */}
            <motion.div
              className="absolute rounded-full bg-[#111111]"
              style={{ width: BTN_W, height: 48, top: 8, left: 8 }}
              animate={{ x: bgX }}
              transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.8 }}
            />

            {/* Dashboard button */}
            <Link href="/dashboard" aria-label={t('nav.dashboard')}>
              <div
                className="relative z-10 flex items-center justify-center rounded-full"
                style={{ width: BTN_W, height: 48 }}
              >
                <LayoutGrid
                  size={20}
                  strokeWidth={isDash ? 2.5 : 2}
                  color={isDash ? '#ffffff' : '#111111'}
                />
              </div>
            </Link>

            {/* Subscriptions button */}
            <Link href="/subscriptions" aria-label={t('nav.subscriptions')}>
              <div
                className="relative z-10 flex items-center justify-center rounded-full"
                style={{ width: BTN_W, height: 48, color: isSubs ? '#ffffff' : '#111111' }}
              >
                <TagHeartIcon active={isSubs} />
              </div>
            </Link>
          </div>
        </div>

        {/* + button — fixed to right edge, vertically centered in nav bar */}
        <button
          onClick={() => setStep('pick')}
          aria-label="Add subscription"
          className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-auto flex items-center justify-center rounded-full bg-[#3D3BF3] active:scale-95 transition-transform duration-100"
          style={{
            width: 48,
            height: 48,
            boxShadow: '0 4px 16px rgba(61,59,243,0.40)',
          }}
        >
          <Plus size={22} color="#ffffff" strokeWidth={2.5} />
        </button>
      </nav>

      {/* Step 1 — Platform picker */}
      <BottomSheet isOpen={step === 'pick'} onClose={close} title={t('sheets.createNew')} height="tall">
        <PlatformPicker onSelect={handleSelect} onGmailSearch={() => setStep('gmail')} />
      </BottomSheet>

      {/* Step 2 — Form */}
      <BottomSheet isOpen={step === 'form'} onClose={close} title={t('sheets.createNew')} height="tall">
        <SubscriptionForm mode="create" platformPreset={platform ?? undefined} onCancel={close} />
      </BottomSheet>

      {/* Gmail search sheet */}
      <GmailSubscriptionSearchSheet isOpen={step === 'gmail'} onClose={close} />
    </>
  )
}
