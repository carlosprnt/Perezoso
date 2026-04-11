'use client'

import { useState } from 'react'
import { getInitials, getAvatarPastel } from '@/lib/utils/logos'

interface SubscriptionAvatarProps {
  name: string
  /** Explicit logo URL (takes priority over simpleIconSlug) */
  logoUrl?: string | null
  /** Simple Icons slug — resolves to cdn.simpleicons.org/{slug}/000000 */
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

/**
 * Normalise a URL so Simple Icons requests always include an explicit
 * colour. Historical subscriptions may have been saved with the old
 * format `cdn.simpleicons.org/{slug}` (no colour suffix), which the
 * CDN serves as SVGs that render near-invisible on white backgrounds.
 * This patches both old stored URLs AND new slug-derived URLs to
 * always append `/000000` when missing.
 */
function normaliseLogoUrl(url: string): string {
  if (!url.includes('cdn.simpleicons.org')) return url
  // Strip any query string while inspecting path structure.
  const [base, query] = url.split('?')
  const withoutHost = base.replace(/^https?:\/\/cdn\.simpleicons\.org\//, '')
  const parts = withoutHost.split('/').filter(Boolean)
  // /slug (1 part) → no colour → append 000000
  // /slug/color (2 parts) → already has colour
  // /slug/_/bg (3 parts) → already has colour
  if (parts.length >= 2) return url
  const patched = `${SIMPLE_ICONS_CDN}/${parts[0]}/000000`
  return query ? `${patched}?${query}` : patched
}

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

  // Resolve which URL to attempt (explicit URL wins over slug-derived URL).
  // Both paths are normalised so Simple Icons URLs always carry a colour.
  const rawUrl = logoUrl
    ? logoUrl
    : simpleIconSlug
      ? `${SIMPLE_ICONS_CDN}/${simpleIconSlug}/000000`
      : null
  const resolvedUrl = rawUrl ? normaliseLogoUrl(rawUrl) : null

  if (resolvedUrl && !imgError) {
    return (
      <div
        className={`${cls} ${corner} overflow-hidden flex-shrink-0 flex items-center justify-center border border-[#E8E8E8] dark:border-[#3A3A3C] bg-white p-1.5`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolvedUrl}
          alt={name}
          className="block w-full h-full object-contain"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      </div>
    )
  }

  // Initials fallback — deterministic pastel background
  return (
    <div
      className={`${cls} ${corner} flex-shrink-0 flex items-center justify-center select-none border border-[#E8E8E8] dark:border-[#3A3A3C] ${text}`}
      style={{ backgroundColor: bg, color: fg }}
      aria-label={`${name} avatar`}
    >
      {initials}
    </div>
  )
}
