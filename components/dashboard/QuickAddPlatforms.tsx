'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Plus } from 'lucide-react'
import { PLATFORMS, resolvePlatformLogoUrl } from '@/lib/constants/platforms'
import { getAvatarPastel, getInitials } from '@/lib/utils/logos'

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
      <div className="flex flex-col gap-2">
        {QUICK_ADD_PLATFORMS.map(platform => {
          const logoUrl = resolvePlatformLogoUrl(platform)
          const { bg, fg } = getAvatarPastel(platform.name)
          const initials = getInitials(platform.name)

          return (
            <div
              key={platform.id}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#F2F2F7] dark:bg-[#1C1C1E]"
            >
              {/* Logo */}
              <div
                className="w-10 h-10 rounded-[16px] overflow-hidden flex items-center justify-center flex-shrink-0 bg-white dark:bg-[#2C2C2E]"
              >
                {logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt={platform.name}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <span className="text-[15px] font-bold" style={{ color: fg }}>{initials}</span>
                )}
              </div>

              {/* Name */}
              <p className="text-[14px] font-semibold text-[#121212] dark:text-[#F2F2F7] flex-1 truncate">
                {platform.name}
              </p>

              {/* Add link */}
              <button
                onClick={() => router.push(`/subscriptions/new?preset=${platform.id}`)}
                className="text-[13px] font-semibold text-[#3D3BF3] dark:text-[#8B89FF] flex-shrink-0 active:opacity-60 transition-opacity"
              >
                Añadir
              </button>
            </div>
          )
        })}

        {/* Custom subscription */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#F2F2F7] dark:bg-[#1C1C1E]">
          <div className="w-10 h-10 rounded-[16px] flex items-center justify-center flex-shrink-0 bg-white dark:bg-[#2C2C2E]">
            <Plus size={18} strokeWidth={2} className="text-[#8E8E93]" />
          </div>
          <p className="text-[14px] font-semibold text-[#121212] dark:text-[#F2F2F7] flex-1">
            Otra suscripción
          </p>
          <button
            onClick={() => router.push('/subscriptions/new')}
            className="text-[13px] font-semibold text-[#3D3BF3] dark:text-[#8B89FF] flex-shrink-0 active:opacity-60 transition-opacity"
          >
            Añadir
          </button>
        </div>
      </div>
    </div>
  )
}
