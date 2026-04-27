import type { Category, BillingPeriod } from '@/types'

export interface PlatformPreset {
  /** Unique identifier */
  id: string
  name: string
  /** Simple Icons slug — https://simpleicons.org */
  simpleIconSlug?: string
  /** Explicit logo URL override (takes priority over simpleIconSlug) */
  logoUrl?: string
  /** Domain kept for reference / future use */
  domain?: string
  category: Category
  defaultPrice?: number
  defaultBillingPeriod?: BillingPeriod
  /** Brand hex color for potential use in theming */
  brandColor?: string
  /** Search terms for fuzzy matching */
  searchTerms?: string[]
}

// ─── Catalog ──────────────────────────────────────────────────────────────────

export const PLATFORMS: PlatformPreset[] = [
  // Streaming
  {
    id: 'netflix',
    name: 'Netflix',
    simpleIconSlug: 'netflix',
    domain: 'netflix.com',
    category: 'streaming',
    defaultBillingPeriod: 'monthly',
    brandColor: '#E50914',
  },
  {
    id: 'youtube-premium',
    name: 'YouTube Premium',
    simpleIconSlug: 'youtube',
    domain: 'youtube.com',
    category: 'streaming',
    defaultBillingPeriod: 'monthly',
    brandColor: '#FF0000',
    searchTerms: ['youtube', 'yt premium'],
  },
  {
    id: 'disney-plus',
    name: 'Disney+',
    logoUrl: 'https://svgl.app/library/disneyplus.svg',
    domain: 'disneyplus.com',
    category: 'streaming',
    defaultBillingPeriod: 'monthly',
    brandColor: '#113CCF',
    searchTerms: ['disney', 'disney plus'],
  },
  {
    id: 'apple-tv-plus',
    name: 'Apple TV+',
    simpleIconSlug: 'appletv',
    domain: 'tv.apple.com',
    category: 'streaming',
    defaultBillingPeriod: 'monthly',
    searchTerms: ['apple tv', 'atv'],
  },
  {
    id: 'amazon-prime-video',
    name: 'Amazon Prime Video',
    logoUrl: 'https://svgl.app/library/prime-video.svg',
    domain: 'primevideo.com',
    category: 'streaming',
    defaultBillingPeriod: 'monthly',
    brandColor: '#00A8E1',
    searchTerms: ['prime video', 'amazon video'],
  },
  {
    id: 'hbo-max',
    name: 'HBO Max',
    simpleIconSlug: 'hbomax',
    domain: 'max.com',
    category: 'streaming',
    defaultBillingPeriod: 'monthly',
    brandColor: '#5822B4',
    searchTerms: ['hbo', 'max', 'hbomax'],
  },
  {
    id: 'hulu',
    name: 'Hulu',
    logoUrl: 'https://svgl.app/library/hulu.svg',
    domain: 'hulu.com',
    category: 'streaming',
    defaultBillingPeriod: 'monthly',
    brandColor: '#1CE783',
  },
  {
    id: 'national-geographic',
    name: 'National Geographic',
    logoUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Natgeologo.svg',
    domain: 'nationalgeographic.com',
    category: 'streaming',
    defaultBillingPeriod: 'monthly',
    brandColor: '#FFCC00',
    searchTerms: ['nat geo', 'natgeo'],
  },

  // Music
  {
    id: 'spotify',
    name: 'Spotify',
    simpleIconSlug: 'spotify',
    domain: 'spotify.com',
    category: 'music',
    defaultBillingPeriod: 'monthly',
    brandColor: '#1DB954',
  },
  {
    id: 'apple-music',
    name: 'Apple Music',
    simpleIconSlug: 'applemusic',
    domain: 'music.apple.com',
    category: 'music',
    defaultBillingPeriod: 'monthly',
    searchTerms: ['apple music', 'itunes'],
  },

  // Productivity
  {
    id: 'notion',
    name: 'Notion',
    simpleIconSlug: 'notion',
    domain: 'notion.so',
    category: 'productivity',
    defaultBillingPeriod: 'monthly',
  },
  {
    id: 'evernote',
    name: 'Evernote',
    simpleIconSlug: 'evernote',
    domain: 'evernote.com',
    category: 'productivity',
    defaultBillingPeriod: 'monthly',
    brandColor: '#00A82D',
  },
  {
    id: 'basecamp',
    name: 'Basecamp',
    simpleIconSlug: 'basecamp',
    domain: 'basecamp.com',
    category: 'productivity',
    defaultBillingPeriod: 'monthly',
    brandColor: '#1D2D35',
  },
  {
    id: 'slack',
    name: 'Slack',
    logoUrl: 'https://svgl.app/library/slack.svg',
    domain: 'slack.com',
    category: 'productivity',
    defaultBillingPeriod: 'monthly',
    brandColor: '#4A154B',
  },
  {
    id: 'adobe-creative-cloud',
    name: 'Adobe Creative Cloud',
    logoUrl: 'https://svgl.app/library/adobe.svg',
    domain: 'adobe.com',
    category: 'productivity',
    defaultBillingPeriod: 'monthly',
    brandColor: '#DA1F26',
    searchTerms: ['adobe', 'creative cloud', 'adobe cc'],
  },
  {
    id: 'github',
    name: 'GitHub',
    simpleIconSlug: 'github',
    domain: 'github.com',
    category: 'productivity',
    defaultBillingPeriod: 'monthly',
  },

  // Cloud / Storage
  {
    id: 'icloud-plus',
    name: 'iCloud+',
    simpleIconSlug: 'icloud',
    domain: 'icloud.com',
    category: 'cloud',
    defaultBillingPeriod: 'monthly',
    searchTerms: ['icloud', 'apple icloud'],
  },
  {
    id: 'google-one',
    name: 'Google One',
    simpleIconSlug: 'google',
    domain: 'one.google.com',
    category: 'cloud',
    defaultBillingPeriod: 'monthly',
    searchTerms: ['google storage', 'google drive'],
  },
  {
    id: 'microsoft-onedrive',
    name: 'Microsoft OneDrive',
    logoUrl: 'https://svgl.app/library/microsoft-onedrive.svg',
    domain: 'microsoft.com',
    category: 'cloud',
    defaultBillingPeriod: 'monthly',
    brandColor: '#0078D4',
    searchTerms: ['onedrive', 'microsoft storage'],
  },
  {
    id: 'aws',
    name: 'Amazon Web Services',
    logoUrl: 'https://svgl.app/library/aws_light.svg',
    domain: 'aws.amazon.com',
    category: 'cloud',
    defaultBillingPeriod: 'monthly',
    brandColor: '#232F3E',
    searchTerms: ['aws', 'amazon cloud'],
  },
  {
    id: 'digitalocean',
    name: 'DigitalOcean',
    simpleIconSlug: 'digitalocean',
    domain: 'digitalocean.com',
    category: 'cloud',
    defaultBillingPeriod: 'monthly',
    brandColor: '#0080FF',
  },
  {
    id: 'namecheap',
    name: 'Namecheap',
    simpleIconSlug: 'namecheap',
    domain: 'namecheap.com',
    category: 'cloud',
    defaultBillingPeriod: 'yearly',
    brandColor: '#DE3723',
  },
  {
    id: 'google-domains',
    name: 'Google Domains',
    simpleIconSlug: 'google',
    domain: 'domains.google',
    category: 'cloud',
    defaultBillingPeriod: 'yearly',
    searchTerms: ['google domains'],
  },

  // AI
  {
    id: 'chatgpt-plus',
    name: 'ChatGPT Plus',
    logoUrl: 'https://svgl.app/library/openai.svg',
    domain: 'openai.com',
    category: 'ai',
    defaultPrice: 20,
    defaultBillingPeriod: 'monthly',
    searchTerms: ['chatgpt', 'openai', 'gpt'],
  },

  // Gaming
  {
    id: 'playstation-plus',
    name: 'PlayStation Plus',
    simpleIconSlug: 'playstation',
    domain: 'playstation.com',
    category: 'gaming',
    defaultBillingPeriod: 'monthly',
    brandColor: '#003087',
    searchTerms: ['ps plus', 'psn', 'playstation'],
  },
  {
    id: 'xbox-game-pass',
    name: 'Xbox Game Pass',
    logoUrl: 'https://svgl.app/library/xbox.svg',
    domain: 'xbox.com',
    category: 'gaming',
    defaultBillingPeriod: 'monthly',
    brandColor: '#107C10',
    searchTerms: ['xbox', 'game pass', 'microsoft gaming'],
  },
  {
    id: 'nintendo-switch-online',
    name: 'Nintendo Switch Online',
    logoUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Nintendo.svg',
    domain: 'nintendo.com',
    category: 'gaming',
    defaultBillingPeriod: 'yearly',
    brandColor: '#E4000F',
    searchTerms: ['nintendo', 'switch online'],
  },

  // Education
  {
    id: 'medium',
    name: 'Medium',
    simpleIconSlug: 'medium',
    domain: 'medium.com',
    category: 'education',
    defaultBillingPeriod: 'monthly',
  },
  {
    id: 'coursera',
    name: 'Coursera',
    simpleIconSlug: 'coursera',
    domain: 'coursera.org',
    category: 'education',
    defaultBillingPeriod: 'monthly',
    brandColor: '#0056D2',
  },
  {
    id: 'skillshare',
    name: 'Skillshare',
    simpleIconSlug: 'skillshare',
    domain: 'skillshare.com',
    category: 'education',
    defaultBillingPeriod: 'monthly',
    brandColor: '#00FF84',
  },
  {
    id: 'duolingo',
    name: 'Duolingo',
    simpleIconSlug: 'duolingo',
    domain: 'duolingo.com',
    category: 'education',
    defaultBillingPeriod: 'monthly',
    brandColor: '#58CC02',
  },

  // Finance / Other
  {
    id: 'amazon-prime',
    name: 'Amazon Prime',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e3/Amazon_Prime_Logo.svg',
    domain: 'amazon.com',
    category: 'other',
    defaultBillingPeriod: 'yearly',
    brandColor: '#00A8E1',
    searchTerms: ['amazon', 'prime'],
  },
  {
    id: 'paypal',
    name: 'PayPal',
    simpleIconSlug: 'paypal',
    domain: 'paypal.com',
    category: 'other',
    defaultBillingPeriod: 'monthly',
    brandColor: '#003087',
  },
  {
    id: 'revolut',
    name: 'Revolut',
    simpleIconSlug: 'revolut',
    domain: 'revolut.com',
    category: 'other',
    defaultBillingPeriod: 'monthly',
  },
  {
    id: 'wise',
    name: 'Wise',
    simpleIconSlug: 'wise',
    domain: 'wise.com',
    category: 'other',
    defaultBillingPeriod: 'monthly',
    brandColor: '#9FE870',
    searchTerms: ['transferwise'],
  },
  {
    id: 'american-express',
    name: 'American Express',
    simpleIconSlug: 'americanexpress',
    domain: 'americanexpress.com',
    category: 'other',
    defaultBillingPeriod: 'yearly',
    brandColor: '#007AC1',
    searchTerms: ['amex', 'american express'],
  },
]

// ─── Logo resolution ──────────────────────────────────────────────────────────

const SIMPLE_ICONS_CDN = 'https://cdn.simpleicons.org'

/**
 * Returns a CDN URL for the platform's logo, or null if none can be resolved.
 * Uses the explicit logoUrl override first, then Simple Icons CDN.
 *
 * When the platform has a `brandColor`, it's appended to the URL so the
 * icon renders in that colour. Otherwise the CDN serves the icon in its
 * default brand colour automatically.
 */
export function resolvePlatformLogoUrl(platform: PlatformPreset): string | null {
  if (platform.logoUrl) return platform.logoUrl
  if (platform.simpleIconSlug) {
    if (platform.brandColor) {
      return `${SIMPLE_ICONS_CDN}/${platform.simpleIconSlug}/${platform.brandColor.replace('#', '')}`
    }
    return `${SIMPLE_ICONS_CDN}/${platform.simpleIconSlug}`
  }
  return null
}

// ─── Lookup helpers ───────────────────────────────────────────────────────────

/** Find a platform by its id */
export function getPlatformById(id: string): PlatformPreset | undefined {
  return PLATFORMS.find(p => p.id === id)
}

/** Find a platform by exact name (case-insensitive) */
export function getPlatformByName(name: string): PlatformPreset | undefined {
  const q = name.trim().toLowerCase()
  return PLATFORMS.find(p => p.name.toLowerCase() === q)
}

/**
 * Try to match a free-text subscription name to a catalog platform.
 * Checks exact name, then searchTerms.
 */
export function resolvePlatformFromSubscriptionName(name: string): PlatformPreset | undefined {
  const q = name.trim().toLowerCase()
  return PLATFORMS.find(p => {
    if (p.name.toLowerCase() === q) return true
    return p.searchTerms?.some(t => t.toLowerCase() === q)
  })
}

/**
 * Resolve the best logo URL for a subscription given its stored logo_url and name.
 * Priority: stored URL → catalog match via name → null (renders initials)
 */
export function resolveSubscriptionLogoUrl(
  name: string,
  storedLogoUrl?: string | null
): string | null {
  if (storedLogoUrl) return storedLogoUrl
  const platform = resolvePlatformFromSubscriptionName(name)
  if (platform) return resolvePlatformLogoUrl(platform)
  return null
}

/**
 * Returns the form pre-fill values for a given platform preset.
 */
export function getPrefilledPlatformValues(platform: PlatformPreset) {
  return {
    name: platform.name,
    category: platform.category,
    billingPeriod: platform.defaultBillingPeriod ?? 'monthly',
    priceAmount: platform.defaultPrice?.toString() ?? '',
    logoUrl: resolvePlatformLogoUrl(platform) ?? '',
  }
}

// ─── Legacy alias (kept for backward compat) ─────────────────────────────────
/** @deprecated Use resolvePlatformLogoUrl instead */
export function getPlatformLogoUrl(domain: string): string {
  const platform = PLATFORMS.find(p => p.domain === domain)
  if (platform) return resolvePlatformLogoUrl(platform) ?? ''
  return ''
}
