/**
 * Returns initials from a subscription name for fallback avatars.
 * "Netflix" → "N", "Apple TV+" → "AT", "Xbox Game Pass" → "XG"
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
 * Deterministic color from a string (for avatar backgrounds).
 * Returns a Tailwind-compatible hex color.
 */
const AVATAR_COLORS = [
  '#6366F1', // indigo
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#F59E0B', // amber
  '#10B981', // emerald
  '#3B82F6', // blue
  '#F97316', // orange
  '#14B8A6', // teal
  '#EF4444', // red
  '#84CC16', // lime
]

export function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}
