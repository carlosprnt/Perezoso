'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, Plus } from 'lucide-react'
import BottomSheet from '@/components/ui/BottomSheet'
import PlatformPicker from '@/components/subscriptions/PlatformPicker'
import SubscriptionForm from '@/components/subscriptions/SubscriptionForm'
import GmailSubscriptionSearchSheet from '@/components/subscriptions/GmailSubscriptionSearchSheet'
import type { PlatformPreset } from '@/lib/constants/platforms'

type Step = 'closed' | 'pick' | 'form' | 'gmail'

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
  const pathname = usePathname()
  const [step, setStep] = useState<Step>('closed')
  const [platform, setPlatform] = useState<PlatformPreset | null>(null)

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

  return (
    <>
      {/* ── Floating pill nav — mobile only, 10px from bottom ──── */}
      <nav className="lg:hidden fixed bottom-[10px] left-1/2 -translate-x-1/2 z-50">
        <div
          className="
            flex items-center gap-2
            bg-white/95 backdrop-blur-md
            rounded-full px-5 py-2.5
            border border-[#DCDCDC]
            shadow-[0_2px_16px_rgba(0,0,0,0.12)]
          "
        >
          {/* Dashboard */}
          <Link href="/dashboard">
            <div
              className={`
                w-12 h-12 rounded-full flex items-center justify-center transition-colors
                ${isDash ? 'bg-[#EBEBEB]' : 'hover:bg-[#F5F5F5]'}
              `}
            >
              <LayoutGrid
                size={20}
                strokeWidth={isDash ? 2.5 : 2}
                className={isDash ? 'text-[#111111]' : 'text-[#888888]'}
              />
            </div>
          </Link>

          {/* Add — goes straight to form, no platform picker */}
          <button
            onClick={() => setStep('pick')}
            aria-label="Add subscription"
            className="
              w-[108px] h-[54px] rounded-[27px]
              bg-[#3D3BF3]
              flex items-center justify-center
              shadow-[0_2px_14px_rgba(61,59,243,0.38)]
              active:scale-95 transition-transform duration-100
            "
          >
            <Plus size={26} className="text-white" strokeWidth={2.5} />
          </button>

          {/* Subscriptions */}
          <Link href="/subscriptions">
            <div
              className={`
                w-12 h-12 rounded-full flex items-center justify-center transition-colors
                ${isSubs ? 'bg-[#EBEBEB]' : 'hover:bg-[#F5F5F5]'}
              `}
            >
              <TagHeartIcon active={isSubs} />
              <span className="sr-only">Subscriptions</span>
            </div>
          </Link>
        </div>
      </nav>

      {/* Step 1 — Platform list */}
      <BottomSheet isOpen={step === 'pick'} onClose={close} title="Create new" height="tall">
        <PlatformPicker onSelect={handleSelect} onGmailSearch={() => setStep('gmail')} />
      </BottomSheet>

      {/* Step 2 — Form */}
      <BottomSheet isOpen={step === 'form'} onClose={close} title="Create new" height="tall">
        <SubscriptionForm mode="create" platformPreset={platform ?? undefined} onCancel={close} />
      </BottomSheet>

      {/* Gmail search sheet */}
      <GmailSubscriptionSearchSheet isOpen={step === 'gmail'} onClose={close} />
    </>
  )
}
