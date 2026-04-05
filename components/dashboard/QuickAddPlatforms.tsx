'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Plus } from 'lucide-react'
import { PLATFORMS, resolvePlatformLogoUrl } from '@/lib/constants/platforms'
import { getAvatarPastel, getInitials } from '@/lib/utils/logos'

// Curated list of popular platforms to show in the quick-add grid
const QUICK_ADD_IDS = [
  'netflix', 'spotify', 'disney-plus', 'youtube-premium', 'amazon-prime-video',
  'hbo-max', 'apple-tv-plus', 'apple-music', 'icloud', 'notion',
  'github', 'figma', 'chatgpt', 'adobe-creative-cloud', 'microsoft-365',
  'google-one', 'amazon-prime', 'twitch', 'duolingo', 'headspace',
]

const QUICK_ADD_PLATFORMS = QUICK_ADD_IDS
  .map(id => PLATFORMS.find(p => p.id === id))
  .filter(Boolean) as typeof PLATFORMS

export default function QuickAddPlatforms() {
  const router = useRouter()

  return (
    <div>
      <p className="text-[13px] font-semibold text-[#737373] dark:text-[#8E8E93] mb-3">
        Añade rápido
      </p>
      <div className="grid grid-cols-4 gap-3">
        {QUICK_ADD_PLATFORMS.map(platform => {
          const logoUrl = resolvePlatformLogoUrl(platform)
          const { bg, fg } = getAvatarPastel(platform.name)
          const initials = getInitials(platform.name)

          return (
            <button
              key={platform.id}
              onClick={() => router.push(`/subscriptions/new?preset=${platform.id}`)}
              className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
            >
              <div className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center flex-shrink-0"
                style={{ background: logoUrl ? 'transparent' : bg }}>
                {logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt={platform.name}
                    width={56}
                    height={56}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <span className="text-[18px] font-bold" style={{ color: fg }}>{initials}</span>
                )}
              </div>
              <p className="text-[11px] font-medium text-[#424242] dark:text-[#AEAEB2] text-center leading-tight line-clamp-2 w-full px-0.5">
                {platform.name}
              </p>
            </button>
          )
        })}

        {/* Manual add button */}
        <button
          onClick={() => router.push('/subscriptions/new')}
          className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[#F2F2F7] dark:bg-[#2C2C2E]">
            <Plus size={22} strokeWidth={2} className="text-[#8E8E93]" />
          </div>
          <p className="text-[11px] font-medium text-[#8E8E93] text-center leading-tight">
            Otra
          </p>
        </button>
      </div>
    </div>
  )
}
