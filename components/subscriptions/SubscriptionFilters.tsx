'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { CATEGORIES } from '@/lib/constants/categories'
import type { SubscriptionStatus } from '@/types'

const STATUS_FILTERS: Array<{ value: SubscriptionStatus | 'all'; label: string }> = [
  { value: 'all',       label: 'All' },
  { value: 'active',    label: 'Active' },
  { value: 'trial',     label: 'Trial' },
  { value: 'paused',    label: 'Paused' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function SubscriptionFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentStatus = searchParams.get('status') ?? 'all'
  const currentCategory = searchParams.get('category') ?? 'all'

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === 'all') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  return (
    <div className="space-y-3">
      {/* Status filters */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {STATUS_FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => updateFilter('status', value)}
            className={`
              px-3 py-1.5 rounded-xl text-xs font-medium
              transition-all duration-150
              ${currentStatus === value
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:text-gray-900'
              }
            `}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Category filters */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={() => updateFilter('category', 'all')}
          className={`
            px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150
            ${currentCategory === 'all'
              ? 'bg-gray-900 text-white'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }
          `}
        >
          All categories
        </button>
        {CATEGORIES.map(({ value, label, emoji }) => (
          <button
            key={value}
            onClick={() => updateFilter('category', value)}
            className={`
              flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium
              transition-all duration-150
              ${currentCategory === value
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }
            `}
          >
            <span>{emoji}</span>
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
