'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Plus } from 'lucide-react'
import { PLATFORMS, resolvePlatformLogoUrl, type PlatformPreset } from '@/lib/constants/platforms'
import { getAvatarPastel, getInitials } from '@/lib/utils/logos'
import BottomSheet from '@/components/ui/BottomSheet'
import SubscriptionForm from '@/components/subscriptions/SubscriptionForm'

const QUICK_ADD_IDS = [
  'netflix', 'spotify', 'disney-plus', 'youtube-premium', 'amazon-prime-video',
  'hbo-max', 'apple-tv-plus', 'apple-music', 'icloud', 'notion',
  'github', 'figma', 'chatgpt', 'adobe-creative-cloud', 'microsoft-365',
  'google-one', 'amazon-prime', 'twitch', 'duolingo', 'headspace',
]

const QUICK_ADD_PLATFORMS = QUICK_ADD_IDS
  .map(id => PLATFORMS.find(p => p.id === id))
  .filter(Boolean) as typeof PLATFORMS

function PlatformRow({
  platform,
  onAdd,
  isLast,
}: {
  platform: PlatformPreset
  onAdd: (p: PlatformPreset | null) => void
  isLast: boolean
}) {
  const logoUrl = resolvePlatformLogoUrl(platform)
  const { bg, fg } = getAvatarPastel(platform.name)
  const initials = getInitials(platform.name)

  return (
    <div>
      <div className="flex items-center gap-3 py-3">
        <div className="w-10 h-10 rounded-[10px] overflow-hidden flex items-center justify-center flex-shrink-0 bg-[#F2F2F7] dark:bg-[#2C2C2E]">
          {logoUrl ? (
            <Image src={logoUrl} alt={platform.name} width={40} height={40} className="w-full h-full object-contain p-1" unoptimized />
          ) : (
            <span className="text-[15px] font-bold" style={{ color: fg }}>{initials}</span>
          )}
        </div>
        <p className="text-[15px] font-medium text-[#000000] dark:text-[#F2F2F7] flex-1 truncate">
          {platform.name}
        </p>
        <button
          onClick={() => onAdd(platform)}
          className="text-[13px] font-semibold text-[#000000] dark:text-[#FFFFFF] flex-shrink-0 active:opacity-60 transition-opacity"
        >
          Añadir
        </button>
      </div>
      {!isLast && <div className="h-px bg-[#E5E5EA] dark:bg-[#2C2C2E]" />}
    </div>
  )
}

export default function QuickAddPlatforms() {
  const [selected, setSelected] = useState<PlatformPreset | null | undefined>(undefined)
  // undefined = closed, null = manual (no preset), PlatformPreset = with preset

  const isOpen = selected !== undefined

  function close() {
    setSelected(undefined)
  }

  return (
    <>
      <div>
        <p className="text-[13px] font-semibold text-[#737373] dark:text-[#8E8E93] mb-3">
          Añade tu primera suscripción
        </p>
        <div>
          {QUICK_ADD_PLATFORMS.map((platform, i) => (
            <PlatformRow
              key={platform.id}
              platform={platform}
              onAdd={setSelected}
              isLast={i === QUICK_ADD_PLATFORMS.length - 1}
            />
          ))}

          {/* Divider before manual */}
          <div className="h-px bg-[#E5E5EA] dark:bg-[#2C2C2E]" />

          {/* Custom / manual */}
          <button
            onClick={() => setSelected(null)}
            className="w-full flex items-center gap-3 py-3 text-left active:opacity-60 transition-opacity"
          >
            <div className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0 bg-[#F2F2F7] dark:bg-[#2C2C2E]">
              <Plus size={18} strokeWidth={2} className="text-[#8E8E93]" />
            </div>
            <p className="text-[15px] font-medium text-[#000000] dark:text-[#F2F2F7] flex-1">
              Añadir manualmente
            </p>
          </button>
        </div>
      </div>

      {/* Subscription form sheet */}
      <BottomSheet isOpen={isOpen} onClose={close} height="full">
        <SubscriptionForm
          mode="create"
          platformPreset={selected ?? undefined}
          onCancel={close}
          successRedirect="/dashboard"
        />
      </BottomSheet>
    </>
  )
}
