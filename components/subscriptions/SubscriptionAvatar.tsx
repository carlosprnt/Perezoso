'use client'

import { useState } from 'react'
import { getInitials, getAvatarPastel } from '@/lib/utils/logos'

interface SubscriptionAvatarProps {
  name: string
  /** Explicit logo URL (takes priority over simpleIconSlug) */
  logoUrl?: string | null
  /** Simple Icons slug — resolves to cdn.simpleicons.org/{slug} */
  simpleIconSlug?: string | null
  size?: 'sm' | 'sm40' | 'md' | 'md48' | 'lg' | 'xl'
  /** Override corner radius class. Defaults to 'rounded-xl' (12px). Use e.g. 'rounded-[8px]' for 8px. */
  corner?: string
}

const SIZE = {
  sm:   { cls: 'w-9 h-9',            text: 'text-xs font-semibold',  px: 36  },
  sm40: { cls: 'w-10 h-10',          text: 'text-xs font-semibold',  px: 40  },
  md:   { cls: 'w-11 h-11',          text: 'text-sm font-semibold',  px: 44  },
  md48: { cls: 'w-12 h-12',          text: 'text-sm font-semibold',  px: 48  },
  lg:   { cls: 'w-14 h-14',          text: 'text-base font-bold',    px: 56  },
  xl:   { cls: 'w-[72px] h-[72px]',  text: 'text-xl font-bold',      px: 72  },
}

const SIMPLE_ICONS_CDN = 'https://cdn.simpleicons.org'

export default function SubscriptionAvatar({
  name,
  logoUrl,
  simpleIconSlug,
  size = 'md',
  corner = 'rounded-xl',
}: SubscriptionAvatarProps) {
  const [imgError, setImgError] = useState(false)
  const { cls, text } = SIZE[size]
  const { bg, fg } = getAvatarPastel(name)
  const initials = getInitials(name)

  // Resolve which URL to attempt (explicit URL wins over slug-derived URL)
  const resolvedUrl = logoUrl
    ? logoUrl
    : simpleIconSlug
      ? `${SIMPLE_ICONS_CDN}/${simpleIconSlug}`
      : null

  if (resolvedUrl && !imgError) {
    // SVG-based sources (Simple Icons + SVGL) need a bg + inset padding.
    // Rasterized sources (Clearbit, custom URLs) fill edge-to-edge.
    const needsPadding =
      resolvedUrl.includes('cdn.simpleicons.org') ||
      resolvedUrl.includes('svgl.app') ||
      resolvedUrl.includes('wikimedia.org')

    return (
      <div
        className={`${cls} ${corner} overflow-hidden flex-shrink-0 border border-[#E0E0E0] dark:border-[#3A3A3C] ${needsPadding ? 'bg-white dark:bg-white flex items-center justify-center' : ''}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolvedUrl}
          alt={name}
          width={SIZE[size].px}
          height={SIZE[size].px}
          className={needsPadding ? 'w-[78%] h-[78%] object-contain' : 'w-full h-full object-cover'}
          onError={() => setImgError(true)}
          loading="lazy"
        />
      </div>
    )
  }

  // Initials fallback — deterministic pastel background
  return (
    <div
      className={`${cls} ${corner} flex-shrink-0 flex items-center justify-center select-none border border-[#E0E0E0] dark:border-[#3A3A3C] ${text}`}
      style={{ backgroundColor: bg, color: fg }}
      aria-label={`${name} avatar`}
    >
      {initials}
    </div>
  )
}
