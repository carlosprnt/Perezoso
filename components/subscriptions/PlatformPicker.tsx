'use client'

import { PLATFORMS, resolvePlatformLogoUrl, type PlatformPreset } from '@/lib/constants/platforms'
import SubscriptionAvatar from './SubscriptionAvatar'

interface PlatformPickerProps {
  onSelect: (platform: PlatformPreset | null) => void
}

export default function PlatformPicker({ onSelect }: PlatformPickerProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Scrollable platform list */}
      <div className="flex-1 overflow-y-auto pb-4">
        <div className="space-y-0.5">
          {PLATFORMS.map(platform => (
            <button
              key={platform.id}
              onClick={() => onSelect(platform)}
              className="w-full flex items-center gap-3 px-5 py-2.5 rounded-xl active:bg-[#F5F5F5] dark:active:bg-[#2C2C2E] transition-colors text-left"
            >
              <SubscriptionAvatar
                name={platform.name}
                logoUrl={resolvePlatformLogoUrl(platform)}
                size="md48"
                corner="rounded-2xl"
              />
              <span className="text-base font-medium text-[#000000] dark:text-[#F2F2F7]">{platform.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
