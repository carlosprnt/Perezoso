'use client'

import { PenLine } from 'lucide-react'
import { PLATFORMS, resolvePlatformLogoUrl, type PlatformPreset } from '@/lib/constants/platforms'
import SubscriptionAvatar from './SubscriptionAvatar'

interface PlatformPickerProps {
  onSelect: (platform: PlatformPreset | null) => void
}

export default function PlatformPicker({ onSelect }: PlatformPickerProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Manual entry */}
      <div className="px-5 pt-4 pb-3 flex-shrink-0">
        <button
          onClick={() => onSelect(null)}
          className="w-full h-12 flex items-center gap-3 px-4 rounded-[10px] border border-dashed border-[#D4D4D4] hover:border-[#A3A3A3] hover:bg-[#FAFAFA] transition-colors text-left"
        >
          <div className="w-9 h-9 rounded-xl bg-[#F5F5F5] border border-[#E8E8E8] flex items-center justify-center flex-shrink-0">
            <PenLine size={15} className="text-[#666666]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[#111111]">Enter manually</p>
            <p className="text-xs text-[#999999]">Any custom service or subscription</p>
          </div>
        </button>
      </div>

      {/* Section label */}
      <div className="px-5 pb-2 flex-shrink-0">
        <p className="text-[11px] font-semibold text-[#AAAAAA] uppercase tracking-wider">
          Popular platforms
        </p>
      </div>

      {/* Scrollable platform list */}
      <div className="flex-1 overflow-y-auto px-5 pb-8">
        <div className="space-y-0.5">
          {PLATFORMS.map(platform => (
            <button
              key={platform.id}
              onClick={() => onSelect(platform)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#F5F5F5] transition-colors text-left"
            >
              <SubscriptionAvatar
                name={platform.name}
                logoUrl={resolvePlatformLogoUrl(platform)}
                size="sm"
              />
              <span className="text-sm font-medium text-[#111111]">{platform.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
