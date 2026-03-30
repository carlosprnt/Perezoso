'use client'

import { PenLine, Mail } from 'lucide-react'
import { PLATFORMS, resolvePlatformLogoUrl, type PlatformPreset } from '@/lib/constants/platforms'
import SubscriptionAvatar from './SubscriptionAvatar'
import { useT } from '@/lib/i18n/LocaleProvider'

interface PlatformPickerProps {
  onSelect: (platform: PlatformPreset | null) => void
  onGmailSearch?: () => void
}

export default function PlatformPicker({ onSelect, onGmailSearch }: PlatformPickerProps) {
  const t = useT()
  return (
    <div className="flex flex-col h-full">
      {/* Action buttons — two-column large cards */}
      <div className={`px-5 pt-4 pb-3 flex-shrink-0 ${onGmailSearch ? 'grid grid-cols-2 gap-3' : ''}`}>
        {/* Gmail search */}
        {onGmailSearch && (
          <button
            onClick={onGmailSearch}
            className="flex flex-col items-center justify-center gap-2.5 px-3 py-5 rounded-2xl border border-[#3D3BF3] bg-[#F5F5FF] active:bg-[#EDEDFF] transition-colors text-center"
          >
            <div className="w-11 h-11 rounded-2xl bg-[#3D3BF3] flex items-center justify-center flex-shrink-0">
              <Mail size={18} className="text-white" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-[#3D3BF3] leading-snug">{t('picker.searchGmail')}</p>
              <p className="text-[11px] text-[#7B79F7] mt-0.5 leading-snug">{t('picker.searchGmailDesc')}</p>
            </div>
          </button>
        )}

        {/* Manual entry */}
        <button
          onClick={() => onSelect(null)}
          className="flex flex-col items-center justify-center gap-2.5 px-3 py-5 rounded-2xl border border-[#E8E8E8] dark:border-[#3A3A3C] bg-white dark:bg-[#2C2C2E] active:bg-[#FAFAFA] dark:active:bg-[#3A3A3C] transition-colors text-center"
        >
          <div className="w-11 h-11 rounded-2xl bg-[#F5F5F5] dark:bg-[#1C1C1E] border border-[#E8E8E8] dark:border-[#3A3A3C] flex items-center justify-center flex-shrink-0">
            <PenLine size={18} className="text-[#666666] dark:text-[#AEAEB2]" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[#111111] dark:text-[#F2F2F7] leading-snug">{t('picker.enterManually')}</p>
            <p className="text-[11px] text-[#999999] dark:text-[#636366] mt-0.5 leading-snug">{t('picker.enterManuallyDesc')}</p>
          </div>
        </button>
      </div>

      {/* Section label */}
      <div className="px-5 pb-2 flex-shrink-0">
        <p className="text-[11px] font-semibold text-[#AAAAAA] dark:text-[#636366] uppercase tracking-wider">
          {t('picker.popularPlatforms')}
        </p>
      </div>

      {/* Scrollable platform list */}
      <div className="flex-1 overflow-y-auto px-5 pb-8">
        <div className="space-y-0.5">
          {PLATFORMS.map(platform => (
            <button
              key={platform.id}
              onClick={() => onSelect(platform)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#F5F5F5] dark:hover:bg-[#2C2C2E] transition-colors text-left"
            >
              <SubscriptionAvatar
                name={platform.name}
                logoUrl={resolvePlatformLogoUrl(platform)}
                size="sm"
              />
              <span className="text-sm font-medium text-[#111111] dark:text-[#F2F2F7]">{platform.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
