'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import InsightCard from './SavingsOpportunityCard'
import InsightAllSheet from './InsightAllSheet'
import SavingsDetailSheet from './SavingsDetailSheet'
import { useT } from '@/lib/i18n/LocaleProvider'
import type { SavingsOpportunity } from '@/lib/calculations/savings'

export type CarouselItem =
  | { kind: 'reminder' }
  | { kind: 'savings'; opportunity: SavingsOpportunity }

const MAX_ITEMS = 4    // max regular cards before "ver todo" appears

// ─── "Ver todo" card ──────────────────────────────────────────────────────────

function ViewAllCard({ count, onTap }: { count: number; onTap: () => void }) {
  const t = useT()
  return (
    <div
      role="button" tabIndex={0}
      onClick={onTap}
      onKeyDown={e => e.key === 'Enter' && onTap()}
      className="w-full flex items-center gap-3.5 bg-white dark:bg-[#1C1C1E] rounded-[20px] px-4 py-4 cursor-pointer active:scale-[0.98] transition-transform select-none"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}
    >
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#F5F5F7] dark:bg-[#2C2C2E]">
        <span className="text-[15px] font-bold text-[#3D3BF3] dark:text-[#8B89FF]">+{count}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold text-[#121212] dark:text-[#F2F2F7] leading-snug truncate">{t('savings.viewAll')}</p>
        <p className="text-[13px] text-[#737373] dark:text-[#8E8E93] mt-0.5 line-clamp-2">{t('savings.viewAllDesc').replace('{count}', String(count))}</p>
      </div>
      <svg width="7" height="12" viewBox="0 0 7 12" fill="none" className="flex-shrink-0 text-[#C7C7CC] dark:text-[#636366]">
        <path d="M1 1l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  )
}

// ─── Slot type (insight or ver-todo) ─────────────────────────────────────────

type Slot =
  | { slotKind: 'insight'; item: CarouselItem; originalIdx: number }
  | { slotKind: 'view_all'; count: number }

// ─── Carousel ─────────────────────────────────────────────────────────────────

interface Props {
  items: CarouselItem[]
  onReminderActivate: () => void
  onAllDismissed: () => void
}

export default function SavingsCarousel({ items, onReminderActivate, onAllDismissed }: Props) {
  const [dismissed, setDismissed] = useState<Set<number>>(new Set())
  const [detail,    setDetail]    = useState<SavingsOpportunity | null>(null)
  const [showAll,   setShowAll]   = useState(false)
  const scrollRef   = useRef<HTMLDivElement>(null)
  const resetTimer  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Non-dismissed items
  const visible = items
    .map((item, i) => ({ item, i }))
    .filter(({ i }) => !dismissed.has(i))

  // Build the loop sequence: first MAX_ITEMS + optional ver-todo
  const coreSlots: Slot[] = visible.slice(0, MAX_ITEMS).map(e => ({
    slotKind: 'insight',
    item: e.item,
    originalIdx: e.i,
  }))
  const extraCount = visible.length - MAX_ITEMS
  if (extraCount > 0) coreSlots.push({ slotKind: 'view_all', count: extraCount })

  // Triple for infinite loop (only if 2+ slots)
  const loopSlots: Slot[] = coreSlots.length > 1
    ? [...coreSlots, ...coreSlots, ...coreSlots]
    : coreSlots

  const isSingle = coreSlots.length === 1

  // ── Initialise scroll to middle copy ──────────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current
    if (!el || isSingle) return
    // Wait for layout
    requestAnimationFrame(() => {
      el.scrollLeft = el.scrollWidth / 3
    })
  // Reset whenever the set of visible slots changes (card dismissed)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coreSlots.length, isSingle])

  // ── Silent loop-reset after scroll stops ──────────────────────────────────
  function handleScroll() {
    clearTimeout(resetTimer.current)
    resetTimer.current = setTimeout(() => {
      const el = scrollRef.current
      if (!el) return
      const third = el.scrollWidth / 3
      if (el.scrollLeft < third * 0.5) {
        el.scrollLeft += third
      } else if (el.scrollLeft > third * 2 - third * 0.5) {
        el.scrollLeft -= third
      }
    }, 80)
  }

  // ── Dismiss ───────────────────────────────────────────────────────────────
  function dismiss(originalIdx: number) {
    const next = new Set(dismissed).add(originalIdx)
    setDismissed(next)
    if (items.filter((_, i) => !next.has(i)).length === 0) onAllDismissed()
  }

  function handleActivate() {
    onReminderActivate()
    const idx = items.findIndex(it => it.kind === 'reminder')
    if (idx !== -1) dismiss(idx)
  }

  // ── Render a single slot ──────────────────────────────────────────────────
  function renderSlot(slot: Slot, key: string | number) {
    if (slot.slotKind === 'view_all') {
      return <ViewAllCard key={key} count={slot.count} onTap={() => setShowAll(true)} />
    }
    const { item, originalIdx } = slot
    if (item.kind === 'reminder') {
      return (
        <InsightCard key={key} kind="reminder"
          onActivate={handleActivate}
          onDismiss={() => dismiss(originalIdx)} />
      )
    }
    return (
      <InsightCard key={key} kind="savings"
        opportunity={item.opportunity}
        onTap={() => setDetail(item.opportunity)}
        onDismiss={() => dismiss(originalIdx)} />
    )
  }

  return (
    <>
      <AnimatePresence onExitComplete={onAllDismissed}>
        {visible.length > 0 && (
          <motion.div
            key="carousel-wrap"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            {isSingle ? (
              renderSlot(coreSlots[0], 'single')
            ) : (
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex gap-3 overflow-x-auto snap-x snap-mandatory items-stretch"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {loopSlots.map((slot, idx) => (
                  <div
                    key={idx}
                    className="snap-start flex-shrink-0"
                    style={{ width: 'calc(100% - 28px)' }}
                  >
                    {renderSlot(slot, idx)}
                  </div>
                ))}
                <div className="flex-shrink-0 w-1" aria-hidden />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <SavingsDetailSheet opportunity={detail} onClose={() => setDetail(null)} />

      <InsightAllSheet
        isOpen={showAll}
        onClose={() => setShowAll(false)}
        items={items}
        dismissed={dismissed}
        onDismiss={dismiss}
        onDetail={opp => { setDetail(opp); setShowAll(false) }}
        onActivate={handleActivate}
      />
    </>
  )
}
