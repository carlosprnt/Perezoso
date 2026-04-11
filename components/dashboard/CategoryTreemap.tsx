'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils/currency'
import { useT, useLocale } from '@/lib/i18n/LocaleProvider'

const TREEMAP_COLORS: Record<string, string> = {
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

export default function CategoryTreemap({ categories, currency = 'EUR' }: { categories: CategoryRow[]; currency?: string }) {
  const t = useT()
  const locale = useLocale()
  const [showPrice, setShowPrice] = useState(false)

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
  ].map(cat => ({ ...cat, color: TREEMAP_COLORS[cat.category] ?? '#E5E7EB' }))

  function label(cat: string) {
    if (cat === '_resto') return 'Resto'
    return t(`categories.${cat}` as Parameters<typeof t>[0])
  }

  if (items.length === 0) return null

  const [first, ...rest_items] = items
  const rightCol = rest_items.slice(0, 2)
  const bottomRow = rest_items.slice(2)

  // Proportional sizes based on percentage
  const rightTotal = rightCol.reduce((s, i) => s + i.pct, 0)
  const bottomTotal = bottomRow.reduce((s, i) => s + i.pct, 0)
  const topTotal = first.pct + rightTotal

  // Height ratio: top section vs bottom section
  const topFlex = topTotal || 1
  const bottomFlex = bottomTotal || 0

  return (
    <div
      className="flex flex-col gap-[3px] cursor-pointer select-none"
      style={{ height: 260 }}
      onClick={() => setShowPrice(prev => !prev)}
    >
      {/* Top section: big left + right column */}
      <div className="flex gap-[3px] min-h-0" style={{ flex: topFlex }}>
        <TreemapCell
          item={first}
          label={label(first.category)}
          currency={currency}
          locale={locale}
          size="large"
          showPrice={showPrice}
          style={{ flex: first.pct }}
        />
        {rightCol.length > 0 && (
          <div className="flex flex-col gap-[3px]" style={{ flex: rightTotal }}>
            {rightCol.map(item => (
              <TreemapCell
                key={item.category}
                item={item}
                label={label(item.category)}
                currency={currency}
                locale={locale}
                size="small"
                showPrice={showPrice}
                style={{ flex: item.pct }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom row */}
      {bottomRow.length > 0 && (
        <div className="flex gap-[3px]" style={{ flex: bottomFlex }}>
          {bottomRow.map(item => (
            <TreemapCell
              key={item.category}
              item={item}
              label={label(item.category)}
              currency={currency}
              locale={locale}
              size="small"
              showPrice={showPrice}
              style={{ flex: item.pct }}
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
  currency,
  locale,
  size,
  showPrice,
  style,
}: {
  item: CategoryRow & { color: string }
  label: string
  currency: string
  locale: string
  size: 'large' | 'small'
  showPrice: boolean
  style?: React.CSSProperties
}) {
  const isLarge = size === 'large'

  return (
    <div
      className="rounded-[20px] p-3 flex flex-col justify-between overflow-hidden"
      style={{ backgroundColor: item.color, ...style }}
    >
      {/* Top: name */}
      <p className={`font-semibold text-[#000000]/80 truncate ${isLarge ? 'text-[15px]' : 'text-[13px]'}`}>
        {label}
      </p>

      {/* Bottom: percentage or price */}
      <p className={`font-bold text-[#000000]/80 ${isLarge ? 'text-[32px] leading-none' : 'text-[20px] leading-none'}`}>
        {showPrice
          ? formatCurrency(item.monthly_cost, currency, locale)
          : `${Math.round(item.pct)}%`
        }
      </p>
    </div>
  )
}
