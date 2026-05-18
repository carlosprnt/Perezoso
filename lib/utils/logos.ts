/**
 * Returns initials from a subscription name for fallback avatars.
 * "Netflix" → "NE", "Apple TV+" → "AT", "Xbox Game Pass" → "XG"
 */
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

/**
 * Soft pastel pairs — light background + dark text for readability.
 * All pairs pass WCAG AA contrast ratio on their background.
 */
const PASTEL_PAIRS: Array<{ bg: string; fg: string }> = [
  { bg: '#FDE8E8', fg: '#9B1C1C' }, // rose
  { bg: '#FEF3C7', fg: '#92400E' }, // amber
  { bg: '#D1FAE5', fg: '#065F46' }, // emerald
  { bg: '#DBEAFE', fg: '#1E3A8A' }, // blue
  { bg: '#EDE9FE', fg: '#4C1D95' }, // violet
  { bg: '#FCE7F3', fg: '#831843' }, // pink
  { bg: '#E0F2FE', fg: '#0C4A6E' }, // sky
  { bg: '#FEF9C3', fg: '#713F12' }, // yellow
  { bg: '#DCFCE7', fg: '#14532D' }, // green
  { bg: '#F3E8FF', fg: '#581C87' }, // purple
  { bg: '#FFE4E6', fg: '#9F1239' }, // red
  { bg: '#E0E7FF', fg: '#3730A3' }, // indigo
]

export function getAvatarPastel(name: string): { bg: string; fg: string } {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return PASTEL_PAIRS[Math.abs(hash) % PASTEL_PAIRS.length]
}

/** Legacy: kept for backward compat with LogoAvatar */
export function getAvatarColor(name: string): string {
  return getAvatarPastel(name).bg
}
