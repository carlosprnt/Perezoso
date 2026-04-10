'use client'

import { formatCurrency } from '@/lib/utils/currency'
import { useT, useLocale } from '@/lib/i18n/LocaleProvider'
import { getCategoryMeta } from '@/lib/constants/categories'
import type { Category } from '@/types'

const TREEMAP_COLORS: Record<string, string> = {
  streaming:    '#F87171',
  music:        '#4ADE80',
  productivity: '#60A5FA',
  cloud:        '#38BDF8',
  ai:           '#A78BFA',
  health:       '#2DD4BF',
  gaming:       '#FB923C',
  education:    '#FBBF24',
  mobility:     '#F472B6',
  home:         '#FCD34D',
  other:        '#9CA3AF',
  _resto:       '#6B7280',
}

interface CategoryRow {
  category: string
  monthly_cost: number
  pct: number
}

export default function CategoryTreemap({ categories, currency = 'EUR' }: { categories: CategoryRow[]; currency?: string }) {
  const t = useT()
  const locale = useLocale()

  if (categories.length === 0) return null

  const sorted = [...categories].sort((a, b) => b.monthly_cost - a.monthly_cost)
  const top5 = sorted.slice(0, 5)
  const rest = sorted.slice(5)

  const items: (CategoryRow & { color: string })[] = [
    ...top5,
    ...(rest.length > 0
      ? [{
          category:     '_resto',
          monthly_cost: rest.reduce((s, c) => s + c.monthly_cost, 0),
          pct:          rest.reduce((s, c) => s + c.pct, 0),
        }]
      : []),
  ].map(cat => ({ ...cat, color: TREEMAP_COLORS[cat.category] ?? '#9CA3AF' }))

  function label(cat: string) {
    if (cat === '_resto') return 'Resto'
    return t(`categories.${cat}` as Parameters<typeof t>[0])
  }

  function iconForCategory(cat: string) {
    if (cat === '_resto') return null
    const meta = getCategoryMeta(cat as Category)
    const Icon = meta.icon
    return <Icon size={16} strokeWidth={2} />
  }

  // Layout: first item takes left 60%, remaining stack on the right
  // If only 1-2 items, simpler layout
  if (items.length === 0) return null

  const [first, ...rest_items] = items

  // Split remaining into top-right and bottom row
  const rightCol = rest_items.slice(0, 2)
  const bottomRow = rest_items.slice(2)

  return (
    <div className="flex flex-col gap-[3px]" style={{ height: 240 }}>
      {/* Top section: big left + right column */}
      <div className="flex gap-[3px] flex-1 min-h-0">
        {/* Big primary cell */}
        <TreemapCell
          item={first}
          label={label(first.category)}
          icon={iconForCategory(first.category)}
          currency={currency}
          locale={locale}
          size="large"
          className="flex-[3]"
        />

        {/* Right column */}
        {rightCol.length > 0 && (
          <div className="flex flex-col gap-[3px] flex-[1.6]">
            {rightCol.map(item => (
              <TreemapCell
                key={item.category}
                item={item}
                label={label(item.category)}
                icon={iconForCategory(item.category)}
                currency={currency}
                locale={locale}
                size="small"
                className="flex-1"
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom row */}
      {bottomRow.length > 0 && (
        <div className="flex gap-[3px]" style={{ height: 80 }}>
          {bottomRow.map(item => (
            <TreemapCell
              key={item.category}
              item={item}
              label={label(item.category)}
              icon={iconForCategory(item.category)}
              currency={currency}
              locale={locale}
              size="small"
              className="flex-1"
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TreemapCell({
  item,
  label,
  icon,
  currency,
  locale,
  size,
  className = '',
}: {
  item: CategoryRow & { color: string }
  label: string
  icon: React.ReactNode
  currency: string
  locale: string
  size: 'large' | 'small'
  className?: string
}) {
  const isLarge = size === 'large'

  return (
    <div
      className={`rounded-[20px] p-3 flex flex-col justify-between overflow-hidden ${className}`}
      style={{ backgroundColor: item.color }}
    >
      {/* Top: icon + name */}
      <div className="flex items-center gap-1.5">
        {icon && (
          <span className="opacity-80 text-black">{icon}</span>
        )}
        <span className={`font-semibold text-black truncate ${isLarge ? 'text-[15px]' : 'text-[13px]'}`}>
          {label}
        </span>
      </div>

      {/* Bottom: percentage + amount */}
      <div>
        <p className={`font-bold text-black ${isLarge ? 'text-[32px] leading-none' : 'text-[20px] leading-none'}`}>
          {Math.round(item.pct)}%
        </p>
        <p className={`text-black/60 font-medium mt-0.5 ${isLarge ? 'text-[13px]' : 'text-[11px]'}`}>
          {formatCurrency(item.monthly_cost, currency, locale)}/mo
        </p>
      </div>
    </div>
  )
}
