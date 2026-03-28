'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import BottomSheet from '@/components/ui/BottomSheet'
import PlatformPicker from './PlatformPicker'
import SubscriptionForm from './SubscriptionForm'
import GmailSubscriptionSearchSheet from './GmailSubscriptionSearchSheet'
import type { PlatformPreset } from '@/lib/constants/platforms'

type Step = 'closed' | 'pick' | 'form' | 'gmail'

export default function AddSubscriptionFlow() {
  const [step, setStep] = useState<Step>('closed')
  const [platform, setPlatform] = useState<PlatformPreset | null>(null)

  // Re-open Gmail sheet after Supabase OAuth redirect (fallback flow)
  useEffect(() => {
    const pending = localStorage.getItem('perezoso_gmail_pending')
    if (pending === '1') {
      localStorage.removeItem('perezoso_gmail_pending')
      const t = setTimeout(() => setStep('gmail'), 350)
      return () => clearTimeout(t)
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

  return (
    <>
      <button
        onClick={() => setStep('pick')}
        className="flex items-center gap-1.5 px-4 h-12 rounded-[10px] bg-[#3D3BF3] text-white text-sm font-medium hover:bg-[#3230D0] transition-colors pressable"
      >
        <Plus size={15} />
        Add
      </button>

      {/* Step 1 — Platform list */}
      <BottomSheet isOpen={step === 'pick'} onClose={close} title="Create new" height="tall">
        <PlatformPicker
          onSelect={handleSelect}
          onGmailSearch={() => setStep('gmail')}
        />
      </BottomSheet>

      {/* Step 2 — Form */}
      <BottomSheet isOpen={step === 'form'} onClose={close} title="Create new" height="tall">
        <SubscriptionForm mode="create" platformPreset={platform ?? undefined} onCancel={close} />
      </BottomSheet>

      {/* Gmail search sheet — opened from platform picker or auto-opened after OAuth */}
      <GmailSubscriptionSearchSheet
        isOpen={step === 'gmail'}
        onClose={close}
      />
    </>
  )
}
