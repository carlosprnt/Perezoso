'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import BottomSheet from '@/components/ui/BottomSheet'
import PlatformPicker from './PlatformPicker'
import SubscriptionForm from './SubscriptionForm'
import GmailSubscriptionSearchSheet from './GmailSubscriptionSearchSheet'
import { useT } from '@/lib/i18n/LocaleProvider'
import type { PlatformPreset } from '@/lib/constants/platforms'

type Step = 'closed' | 'pick' | 'form' | 'gmail'

export default function AddSubscriptionFlow() {
  const t = useT()
  const [step, setStep] = useState<Step>('closed')
  const [platform, setPlatform] = useState<PlatformPreset | null>(null)

  // Re-open Gmail sheet after Supabase OAuth redirect (fallback flow)
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

  return (
    <>
      <button
        onClick={() => setStep('pick')}
        className="flex items-center gap-1.5 px-4 h-12 rounded-2xl bg-[#3D3BF3] text-white text-sm font-medium hover:bg-[#3230D0] transition-colors pressable"
      >
        <Plus size={15} />
        {t('common.add')}
      </button>

      {/* Step 1 — Platform list */}
      <BottomSheet
        isOpen={step === 'pick'}
        onClose={close}
        title={t('sheets.createNew')}
        height="tall"
        footer={
          <div
            className="flex gap-3 px-5 py-4 border-t border-[#F0F0F0] dark:border-[#2C2C2E]"
            style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
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

      {/* Gmail search sheet — opened from platform picker or auto-opened after OAuth */}
      <GmailSubscriptionSearchSheet
        isOpen={step === 'gmail'}
        onClose={close}
      />
    </>
  )
}
