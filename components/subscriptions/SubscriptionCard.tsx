'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import SubscriptionAvatar from './SubscriptionAvatar'
import { formatCurrency } from '@/lib/utils/currency'
import type { SubscriptionWithCosts } from '@/types'

// ─── Category labels ──────────────────────────────────────────────────────────
const CATEGORY_LABEL: Record<string, string> = {
  streaming:    'Streaming',
  music:        'Music',
  productivity: 'Productivity',
  cloud:        'Cloud',
  ai:           'AI',
  health:       'Health',
  gaming:       'Gaming',
  education:    'Education',
  mobility:     'Mobility',
  home:         'Home',
  other:        'Other',
}

// ─── Status ───────────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  active:    'Active',
  trial:     'Trial',
  paused:    'Paused',
  cancelled: 'Cancelled',
}

const STATUS_COLOR_LIGHT: Record<string, string> = {
  active:    '#16A34A',
  trial:     '#D97706',
  paused:    '#9CA3AF',
  cancelled: '#EF4444',
}

// On dark card backgrounds use slightly lighter status colours
const STATUS_COLOR_DARK: Record<string, string> = {
  active:    '#4ADE80',
  trial:     '#FCD34D',
  paused:    '#9CA3AF',
  cancelled: '#F87171',
}

// ─── Card colour theme ────────────────────────────────────────────────────────
// All cards are white by default. A custom card_color stored in DB overrides.
interface CardTheme {
  bg: string
  border: string
  title: string
  subtitle: string
  price: string
  dark: boolean  // determines which status palette to use
}

// Preset pairings for the color swatches (same values used in the form picker)
export const CARD_COLOR_PRESETS: Array<{
  hex: string | null
  label: string
  theme: CardTheme
}> = [
  {
    hex: null, label: 'White',
    theme: { bg: '#FFFFFF', border: '#E8E8E8', title: '#111111', subtitle: '#999999', price: '#111111', dark: false },
  },
  {
    hex: '#111111', label: 'Black',
    theme: { bg: '#111111', border: 'transparent', title: '#FFFFFF', subtitle: '#666666', price: '#FFFFFF', dark: true },
  },
  {
    hex: '#1A3B8A', label: 'Navy',
    theme: { bg: '#1A3B8A', border: 'transparent', title: '#FFFFFF', subtitle: '#8BA8D4', price: '#FFFFFF', dark: true },
  },
  {
    hex: '#B8E8F0', label: 'Teal',
    theme: { bg: '#B8E8F0', border: 'transparent', title: '#0A3D4A', subtitle: '#3A7A88', price: '#0A3D4A', dark: false },
  },
  {
    hex: '#C4EDA8', label: 'Lime',
    theme: { bg: '#C4EDA8', border: 'transparent', title: '#1A3D08', subtitle: '#4A7A28', price: '#1A3D08', dark: false },
  },
  {
    hex: '#E0D8FF', label: 'Lavender',
    theme: { bg: '#E0D8FF', border: 'transparent', title: '#2D1A6B', subtitle: '#6B5BAA', price: '#2D1A6B', dark: false },
  },
  {
    hex: '#FFE4CC', label: 'Peach',
    theme: { bg: '#FFE4CC', border: 'transparent', title: '#5C2A00', subtitle: '#9A6040', price: '#5C2A00', dark: false },
  },
  {
    hex: '#FFD6E0', label: 'Rose',
    theme: { bg: '#FFD6E0', border: 'transparent', title: '#5C0A1A', subtitle: '#9A4060', price: '#5C0A1A', dark: false },
  },
]

const WHITE_THEME = CARD_COLOR_PRESETS[0].theme

export function getCardTheme(cardColor: string | null | undefined): CardTheme {
  if (!cardColor) return WHITE_THEME
  return CARD_COLOR_PRESETS.find(p => p.hex === cardColor)?.theme ?? WHITE_THEME
}

// ─── Component ────────────────────────────────────────────────────────────────
interface SubscriptionCardProps {
  subscription: SubscriptionWithCosts
  index?: number
}

export default function SubscriptionCard({ subscription: sub, index = 0 }: SubscriptionCardProps) {
  const theme = getCardTheme(sub.card_color)
  const categoryLabel = CATEGORY_LABEL[sub.category] ?? sub.category
  const statusLabel   = STATUS_LABEL[sub.status]     ?? sub.status
  const statusColor   = (theme.dark ? STATUS_COLOR_DARK : STATUS_COLOR_LIGHT)[sub.status] ?? '#9CA3AF'

  return (
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{
        delay: index * 0.055,
        duration: 0.4,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <Link href={`/subscriptions/${sub.id}`}>
        <div
          className="rounded-3xl px-5 py-4 flex items-center gap-4 active:scale-[0.98] transition-transform duration-100"
          style={{
            background: theme.bg,
            border: theme.border !== 'transparent' ? `1.5px solid ${theme.border}` : 'none',
          }}
        >
          {/* Avatar */}
          <SubscriptionAvatar
            name={sub.name}
            logoUrl={sub.logo_url}
            size="lg"
          />

          {/* Name + category */}
          <div className="flex-1 min-w-0">
            <p
              className="text-xl font-bold leading-tight truncate"
              style={{ color: theme.title }}
            >
              {sub.name}
            </p>
            <p
              className="text-sm mt-0.5 leading-snug"
              style={{ color: theme.subtitle }}
            >
              {categoryLabel}
            </p>
          </div>

          {/* Price + status */}
          <div className="text-right flex-shrink-0">
            <p className="leading-snug">
              <span className="text-base font-bold tabular-nums" style={{ color: theme.price }}>
                {formatCurrency(sub.my_monthly_cost, sub.currency)}
              </span>
              <span className="text-sm font-normal ml-0.5" style={{ color: theme.subtitle }}>
                /mo
              </span>
            </p>
            <p
              className="text-sm font-semibold mt-0.5 leading-snug"
              style={{ color: statusColor }}
            >
              {statusLabel}
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
