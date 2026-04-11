'use client'

import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/utils/currency'
import { useT, useLocale } from '@/lib/i18n/LocaleProvider'

const COLORS: Record<string, string> = {
  streaming:    '#FECACA',
  music:        '#BBF7D0',
  productivity: '#BFDBFE',
  cloud:        '#BAE6FD',
  ai:           '#DDD6FE',
  health:       '#A7F3D0',
  gaming:       '#FED7AA',
  education:    '#FEF08A',
  mobility:     '#FBCFE8',
  home:         '#FDE68A',
  other:        '#E5E7EB',
  _resto:       '#D1D5DB',
}

interface CategoryRow {
  category: string
  monthly_cost: number
  pct: number
}

export default function TopCategoriesSection({ categories, currency = 'EUR' }: { categories: CategoryRow[]; currency?: string }) {
  const t = useT()
  const locale = useLocale()
  const [active, setActive] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (categories.length === 0) return null

  const sorted = [...categories].sort((a, b) => b.monthly_cost - a.monthly_cost)
  const top4   = sorted.slice(0, 4)
  const rest   = sorted.slice(4)

  const segments: (CategoryRow & { color: string })[] = [
    ...top4,
    ...(rest.length > 0
      ? [{
          category:     '_resto',
          monthly_cost: rest.reduce((s, c) => s + c.monthly_cost, 0),
          pct:          rest.reduce((s, c) => s + c.pct, 0),
        }]
      : []),
  ].map(cat => ({ ...cat, color: COLORS[cat.category] ?? '#E5E7EB' }))

  function label(cat: string) {
    if (cat === '_resto') return 'Resto'
    return t(`categories.${cat}` as Parameters<typeof t>[0])
  }

  return (
    <div>
      {/* Segmented bar — each segment individually rounded */}
      <div
        className="flex h-12 mb-4"
        style={{
          transform:       mounted ? 'scaleX(1)' : 'scaleX(0)',
          transformOrigin: 'left',
          transition:      'transform 0.5s cubic-bezier(0.2, 0, 0, 1)',
          gap:             '3px',
        }}
      >
        {segments.map((seg, i) => (
          <div
            key={seg.category}
            className="rounded-[12px]"
            style={{
              width:           `${seg.pct}%`,
              backgroundColor: seg.color,
              opacity:         active !== null && active !== i ? 0.35 : 1,
              transition:      'opacity 0.15s ease',
              cursor:          'pointer',
              flexShrink:      0,
              minWidth:        8,
            }}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            onClick={() => setActive(active === i ? null : i)}
            role="button"
            tabIndex={0}
            aria-label={`${label(seg.category)}: ${formatCurrency(seg.monthly_cost, currency, locale)}`}
            onKeyDown={e => e.key === 'Enter' && setActive(active === i ? null : i)}
          />
        ))}
      </div>

      {/* Legend — single column rows */}
      <div className="space-y-0.5">
        {segments.map((seg, i) => {
          const isActive = active === i
          return (
            <button
              key={seg.category}
              className="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 transition-colors text-left"
              style={{ backgroundColor: isActive ? `${seg.color}80` : 'transparent' }}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onClick={() => setActive(active === i ? null : i)}
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: seg.color }}
              />
              <span className="flex-1 text-[13px] text-[#000000] dark:text-[#F2F2F7] truncate">
                {label(seg.category)}
              </span>
              <span className="text-[11px] text-[#8E8E93] flex-shrink-0">
                {Math.round(seg.pct)}%
              </span>
              <span className="text-[13px] font-semibold tabular-nums text-[#000000] dark:text-[#F2F2F7]">
                {formatCurrency(seg.monthly_cost, currency, locale)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
