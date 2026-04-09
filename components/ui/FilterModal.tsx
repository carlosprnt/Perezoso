'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { X, Check, SlidersHorizontal } from 'lucide-react'
import { CATEGORIES } from '@/lib/constants/categories'
import { Button } from '@/components/ui/Button'
import type { SubscriptionStatus, Category } from '@/types'

const STATUS_OPTIONS: Array<{ value: SubscriptionStatus | 'all'; label: string }> = [
  { value: 'all',       label: 'All' },
  { value: 'active',    label: 'Active' },
  { value: 'trial',     label: 'Trial' },
  { value: 'paused',    label: 'Paused' },
  { value: 'cancelled', label: 'Cancelled' },
]

interface FilterModalProps {
  currentStatus?: string
  currentCategory?: string
}

export default function FilterModal({ currentStatus, currentCategory }: FilterModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router    = useRouter()
  const pathname  = usePathname()
  const params    = useSearchParams()

  const [status,   setStatus]   = useState<SubscriptionStatus | 'all'>(
    (currentStatus as SubscriptionStatus) ?? 'all'
  )
  const [category, setCategory] = useState<Category | 'all'>(
    (currentCategory as Category) ?? 'all'
  )

  // Sync local state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStatus((params.get('status') as SubscriptionStatus) ?? 'all')
      setCategory((params.get('category') as Category) ?? 'all')
    }
  }, [isOpen, params])

  // Trap body scroll
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else        document.body.style.overflow = ''
    return ()  => { document.body.style.overflow = '' }
  }, [isOpen])

  const activeFilterCount = [
    currentStatus && currentStatus !== 'all',
    currentCategory && currentCategory !== 'all',
  ].filter(Boolean).length

  function apply() {
    const p = new URLSearchParams()
    if (status   !== 'all') p.set('status',   status)
    if (category !== 'all') p.set('category', category)
    router.push(`${pathname}${p.size ? '?' + p.toString() : ''}`, { scroll: false })
    setIsOpen(false)
  }

  function reset() {
    setStatus('all')
    setCategory('all')
    router.push(pathname, { scroll: false })
    setIsOpen(false)
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`
          relative flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium
          border transition-colors duration-150 pressable
          ${activeFilterCount > 0
            ? 'bg-[#121212] dark:bg-[#F2F2F7] text-white dark:text-[#121212] border-[#121212] dark:border-[#F2F2F7]'
            : 'bg-white dark:bg-[#2C2C2E] text-[#424242] dark:text-[#AEAEB2] border-[#D4D4D4] dark:border-[#3A3A3C] hover:border-[#A3A3A3] dark:hover:border-[#636366]'
          }
        `}
      >
        <SlidersHorizontal size={14} />
        Filters
        {activeFilterCount > 0 && (
          <span className="ml-0.5 w-4 h-4 rounded-full bg-white text-[#121212] text-[10px] font-bold flex items-center justify-center">
            {activeFilterCount}
          </span>
        )}
      </button>

      {!isOpen ? null : (
        <>
          {/* Backdrop — bleeds into the iOS PWA bottom safe area. */}
          <div
            className="fixed inset-0 bg-black/40 z-40 animate-backdrop-in"
            style={{ bottom: 'calc(max(env(safe-area-inset-bottom), 34px) * -1)' }}
            onClick={() => setIsOpen(false)}
          />

          {/* Sheet — slides up on mobile, centered on desktop.
              On mobile uses the safe-area bleed pattern (see
              components/ui/BottomSheet.tsx). Arbitrary Tailwind value
              instead of inline style so `sm:bottom-auto` can still
              win the cascade on sm+ breakpoints. */}
          <div
            className="
              fixed z-50 bg-white dark:bg-[#1C1C1E]
              bottom-[calc(max(env(safe-area-inset-bottom),34px)*-1)] left-0 right-0
              rounded-t-2xl
              animate-slide-up
              sm:bottom-auto sm:top-1/2 sm:left-1/2
              sm:-translate-x-1/2 sm:-translate-y-1/2
              sm:w-[440px] sm:rounded-2xl
              sm:animate-fade-in-scale
              border border-[#D4D4D4] dark:border-[#2C2C2E]
            "
          >
            {/* Handle (mobile) */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 bg-[#D4D4D4] dark:bg-[#3A3A3C] rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E8E8] dark:border-[#2C2C2E]">
              <h2 className="text-base font-semibold text-[#121212] dark:text-[#F2F2F7]">Filters</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#616161] dark:text-[#AEAEB2] hover:bg-[#F5F5F5] dark:hover:bg-[#2C2C2E] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Status */}
              <div>
                <p className="text-xs font-semibold text-[#424242] dark:text-[#AEAEB2] uppercase tracking-widest mb-3">Status</p>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setStatus(opt.value)}
                      className={`
                        flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium
                        border transition-colors duration-150
                        ${status === opt.value
                          ? 'bg-[#121212] dark:bg-[#F2F2F7] text-white dark:text-[#121212] border-[#121212] dark:border-[#F2F2F7]'
                          : 'bg-white dark:bg-[#2C2C2E] text-[#424242] dark:text-[#AEAEB2] border-[#D4D4D4] dark:border-[#3A3A3C] hover:border-[#A3A3A3] dark:hover:border-[#636366]'
                        }
                      `}
                    >
                      {status === opt.value && <Check size={12} strokeWidth={3} />}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div>
                <p className="text-xs font-semibold text-[#424242] dark:text-[#AEAEB2] uppercase tracking-widest mb-3">Category</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setCategory('all')}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium
                      border transition-colors duration-150
                      ${category === 'all'
                        ? 'bg-[#121212] text-white border-[#121212]'
                        : 'bg-white text-[#424242] border-[#D4D4D4] hover:border-[#A3A3A3]'
                      }
                    `}
                  >
                    {category === 'all' && <Check size={12} strokeWidth={3} />}
                    All categories
                  </button>

                  {CATEGORIES.map(cat => {
                    const Icon = cat.icon
                    const active = category === cat.value
                    return (
                      <button
                        key={cat.value}
                        onClick={() => setCategory(cat.value)}
                        className={`
                          flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium
                          border transition-colors duration-150
                          ${active
                            ? 'bg-[#121212] text-white border-[#121212]'
                            : 'bg-white text-[#424242] border-[#D4D4D4] hover:border-[#A3A3A3]'
                          }
                        `}
                      >
                        <Icon size={14} strokeWidth={2} />
                        {cat.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Footer — pb compensates the mobile safe-area bleed on
                the sheet above. `sm:pb-4` restores the flat padding on
                desktop where the sheet is a centered modal without bleed. */}
            <div className="flex gap-3 px-5 pt-4 pb-[calc(1rem+max(env(safe-area-inset-bottom),34px))] sm:pb-4 border-t border-[#E8E8E8] dark:border-[#2C2C2E]">
              <Button variant="secondary" onClick={reset} className="flex-1">
                Reset
              </Button>
              <Button onClick={apply} className="flex-1">
                Apply filters
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
