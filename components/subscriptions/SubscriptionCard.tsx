'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import SubscriptionAvatar from './SubscriptionAvatar'
import { formatCurrency } from '@/lib/utils/currency'
import type { SubscriptionWithCosts } from '@/types'

// ─── Category labels ──────────────────────────────────────────────────────────
const CATEGORY_LABEL: Record<string, string> = {
  streaming:   'Streaming',
  music:       'Music',
  productivity:'Productivity',
  cloud:       'Cloud',
  ai:          'AI',
  health:      'Health',
  gaming:      'Gaming',
  education:   'Education',
  mobility:    'Mobility',
  home:        'Home',
  other:       'Other',
}

// ─── Status ───────────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  active:    'Active',
  trial:     'Trial',
  paused:    'Paused',
  cancelled: 'Cancelled',
}

const STATUS_COLOR: Record<string, string> = {
  active:    '#16A34A',
  trial:     '#D97706',
  paused:    '#9CA3AF',
  cancelled: '#EF4444',
}

// ─── Card colour themes ───────────────────────────────────────────────────────
interface CardTheme {
  bg: string
  border: string
  title: string
  subtitle: string
  price: string
}

const THEMES: CardTheme[] = [
  // white (default)
  { bg: '#FFFFFF',  border: '#E8E8E8', title: '#111111', subtitle: '#999999', price: '#111111' },
  // white
  { bg: '#FFFFFF',  border: '#E8E8E8', title: '#111111', subtitle: '#999999', price: '#111111' },
  // near-black
  { bg: '#111111',  border: 'transparent', title: '#FFFFFF', subtitle: '#777777', price: '#FFFFFF' },
  // white
  { bg: '#FFFFFF',  border: '#E8E8E8', title: '#111111', subtitle: '#999999', price: '#111111' },
  // light teal
  { bg: '#BDE8F0',  border: 'transparent', title: '#0D3B4A', subtitle: '#3B7A8A', price: '#0D3B4A' },
  // white
  { bg: '#FFFFFF',  border: '#E8E8E8', title: '#111111', subtitle: '#999999', price: '#111111' },
  // light lime-green
  { bg: '#C6EDAC',  border: 'transparent', title: '#1A3A0A', subtitle: '#4A7A2A', price: '#1A3A0A' },
  // white
  { bg: '#FFFFFF',  border: '#E8E8E8', title: '#111111', subtitle: '#999999', price: '#111111' },
]

function getTheme(name: string): CardTheme {
  const hash = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return THEMES[hash % THEMES.length]
}

// ─── Component ────────────────────────────────────────────────────────────────
interface SubscriptionCardProps {
  subscription: SubscriptionWithCosts
  index?: number
}

export default function SubscriptionCard({ subscription: sub, index = 0 }: SubscriptionCardProps) {
  const theme = getTheme(sub.name)
  const categoryLabel = CATEGORY_LABEL[sub.category] ?? sub.category
  const statusLabel   = STATUS_LABEL[sub.status]  ?? sub.status
  const statusColor   = STATUS_COLOR[sub.status]  ?? '#9CA3AF'

  return (
    <motion.div
      initial={{ y: 56, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{
        delay: index * 0.055,
        duration: 0.38,
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
            <p className="leading-snug" style={{ color: theme.price }}>
              <span className="text-base font-bold tabular-nums">
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
