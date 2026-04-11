'use client'

import { useState, useEffect } from 'react'
import { Plus } from '@/lib/icons'
import BottomSheet from '@/components/ui/BottomSheet'
import PlatformPicker from './PlatformPicker'
import SubscriptionForm from './SubscriptionForm'
import GmailSubscriptionSearchSheet from './GmailSubscriptionSearchSheet'
import { useT } from '@/lib/i18n/LocaleProvider'
import { useFeatureGate } from '@/lib/revenuecat/useFeatureGate'
import type { PlatformPreset } from '@/lib/constants/platforms'

type Step = 'closed' | 'pick' | 'form' | 'gmail'

export default function AddSubscriptionFlow() {
  const t = useT()
  const gate = useFeatureGate()
  const [step, setStep] = useState<Step>('closed')
  const [platform, setPlatform] = useState<PlatformPreset | null>(null)
  const [subsCount, setSubsCount] = useState<number>(0)

  // Track the global subscription count (broadcast by SubscriptionsView)
  // so we can gate the "+" button against the 15-sub free limit.
  useEffect(() => {
    function onCount(e: Event) {
      const count = (e as CustomEvent<number>).detail
      setSubsCount(count)
    }
    window.addEventListener('perezoso:subs-count', onCount)
    return () => window.removeEventListener('perezoso:subs-count', onCount)
  }, [])

  function handleAddClick() {
    if (!gate.requireSubscriptionSlot(subsCount)) return
    setStep('pick')
  }

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
        onClick={handleAddClick}
        className="flex items-center gap-1.5 px-4 h-12 rounded-2xl bg-[#000000] text-white text-sm font-medium hover:bg-[#000000] transition-colors pressable"
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
          >
            <button
              onClick={() => setStep('gmail')}
              className="flex-1 h-12 rounded-full text-sm font-semibold text-[#000000] dark:text-[#FFFFFF] border border-[#000000] dark:border-[#FFFFFF] bg-transparent flex items-center justify-center active:bg-[#F5F5F5] dark:active:bg-[#2C2C2E] transition-colors"
            >
              {t('picker.searchGmail')}
            </button>
            <button
              onClick={() => handleSelect(null)}
              className="flex-1 h-12 rounded-full text-sm font-semibold text-white bg-[#000000] flex items-center justify-center active:bg-[#000000] transition-colors"
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
