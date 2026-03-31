'use client'

import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/utils/currency'
import { useT } from '@/lib/i18n/LocaleProvider'
import type { Category } from '@/types'
import { getCategoryMeta } from '@/lib/constants/categories'

const COLORS: Record<string, string> = {
  streaming:    '#F87171',
  music:        '#4ADE80',
  productivity: '#60A5FA',
  cloud:        '#38BDF8',
  ai:           '#A78BFA',
  health:       '#34D399',
  gaming:       '#FB923C',
  education:    '#FBBF24',
  mobility:     '#F472B6',
  home:         '#FCD34D',
  other:        '#9CA3AF',
  _resto:       '#C4C4C4',
}

interface CategoryRow {
  category: string
  monthly_cost: number
  pct: number
}

export default function TopCategoriesSection({ categories }: { categories: CategoryRow[] }) {
  const t = useT()
  const [active, setActive] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (categories.length === 0) return null

  // Top 4 + merge rest into "Resto"
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
  ].map(cat => ({ ...cat, color: COLORS[cat.category] ?? '#9CA3AF' }))

  function label(cat: string) {
    if (cat === '_resto') return 'Resto'
    return t(`categories.${cat}` as Parameters<typeof t>[0])
  }

  return (
    <div>
      {/* Segmented bar — 56px tall */}
      <div
        className="flex h-14 rounded-2xl overflow-hidden mb-4"
        style={{
          transform:       mounted ? 'scaleX(1)' : 'scaleX(0)',
          transformOrigin: 'left',
          transition:      'transform 0.5s cubic-bezier(0.2, 0, 0, 1)',
          gap:             '2px',
          backgroundColor: '#E5E7EB',
        }}
      >
        {segments.map((seg, i) => (
          <div
            key={seg.category}
            style={{
              width:           `${seg.pct}%`,
              backgroundColor: seg.color,
              opacity:         active !== null && active !== i ? 0.3 : 1,
              transition:      'opacity 0.15s ease',
              cursor:          'pointer',
              flexShrink:      0,
            }}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            onClick={() => setActive(active === i ? null : i)}
            role="button"
            tabIndex={0}
            aria-label={`${label(seg.category)}: ${formatCurrency(seg.monthly_cost, 'EUR')}`}
            onKeyDown={e => e.key === 'Enter' && setActive(active === i ? null : i)}
          />
        ))}
      </div>

      {/* Legend — 20px padding sides + bottom */}
      <div className="space-y-0.5 px-5 pb-5">
        {segments.map((seg, i) => {
          const isActive = active === i
          return (
            <button
              key={seg.category}
              className="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 transition-colors text-left"
              style={{ backgroundColor: isActive ? `${seg.color}1A` : 'transparent' }}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onClick={() => setActive(active === i ? null : i)}
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: seg.color }}
              />
              <span className="flex-1 text-[13px] text-[#121212] dark:text-[#F2F2F7] truncate">
                {label(seg.category)}
              </span>
              <span className="text-[13px] font-semibold tabular-nums text-[#121212] dark:text-[#F2F2F7]">
                {formatCurrency(seg.monthly_cost, 'EUR')}
              </span>
              <span className="text-[11px] text-[#8E8E93] w-8 text-right flex-shrink-0">
                {Math.round(seg.pct)}%
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
