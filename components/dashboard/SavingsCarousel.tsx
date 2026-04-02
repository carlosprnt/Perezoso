'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import InsightCard from './SavingsOpportunityCard'
import InsightAllSheet from './InsightAllSheet'
import SavingsDetailSheet from './SavingsDetailSheet'
import { useT } from '@/lib/i18n/LocaleProvider'
import type { SavingsOpportunity } from '@/lib/calculations/savings'

export type CarouselItem =
  | { kind: 'reminder' }
  | { kind: 'savings'; opportunity: SavingsOpportunity }

const MAX_CAROUSEL = 4   // max cards shown before "ver todo" appears

// ─── "Ver todo" card ──────────────────────────────────────────────────────────

function ViewAllCard({ count, onTap }: { count: number; onTap: () => void }) {
  const t = useT()
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onTap}
      onKeyDown={e => e.key === 'Enter' && onTap()}
      className="w-full flex items-center gap-3.5 bg-white dark:bg-[#1C1C1E] rounded-[20px] px-4 py-4 cursor-pointer active:scale-[0.98] transition-transform select-none"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}
    >
      {/* Count badge */}
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#F5F5F7] dark:bg-[#2C2C2E]">
        <span className="text-[15px] font-bold text-[#3D3BF3] dark:text-[#8B89FF]">+{count}</span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold text-[#121212] dark:text-[#F2F2F7] leading-snug">{t('savings.viewAll')}</p>
        <p className="text-[13px] text-[#737373] dark:text-[#8E8E93] mt-0.5">{t('savings.viewAllDesc').replace('{count}', String(count))}</p>
      </div>

      <svg width="7" height="12" viewBox="0 0 7 12" fill="none" className="flex-shrink-0 text-[#C7C7CC] dark:text-[#636366]">
        <path d="M1 1l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  )
}

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

  function dismiss(index: number) {
    const next = new Set(dismissed).add(index)
    setDismissed(next)
    // count non-dismissed items (excluding reminder once activated)
    const remaining = items.filter((_, i) => !next.has(i)).length
    if (remaining === 0) onAllDismissed()
  }

  function handleActivate() {
    onReminderActivate()
    // find and dismiss the reminder card
    const idx = items.findIndex(it => it.kind === 'reminder')
    if (idx !== -1) dismiss(idx)
  }

  // Visible items (non-dismissed) in original order
  const visible = items
    .map((item, i) => ({ item, i }))
    .filter(({ i }) => !dismissed.has(i))

  const hasMore = visible.length > MAX_CAROUSEL
  // Cards to show in the carousel: first MAX_CAROUSEL visible
  const carouselItems = visible.slice(0, MAX_CAROUSEL)
  const extraCount    = visible.length - MAX_CAROUSEL  // shown in "ver todo"

  const isSingle = visible.length === 1 && !hasMore

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
              /* ── Single item: full-width ── */
              <InsightCardForItem
                entry={visible[0]}
                onActivate={handleActivate}
                onTap={setDetail}
                onDismiss={dismiss}
              />
            ) : (
              /* ── Carousel: snap scroll ── */
              <div
                className="flex gap-3 overflow-x-auto snap-x snap-mandatory"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {carouselItems.map(entry => (
                  <div
                    key={entry.i}
                    className="snap-start flex-shrink-0"
                    style={{ width: 'calc(100% - 28px)' }}
                  >
                    <InsightCardForItem
                      entry={entry}
                      onActivate={handleActivate}
                      onTap={setDetail}
                      onDismiss={dismiss}
                    />
                  </div>
                ))}

                {/* Ver todo card */}
                {hasMore && (
                  <div className="snap-start flex-shrink-0" style={{ width: 'calc(100% - 28px)' }}>
                    <ViewAllCard count={extraCount} onTap={() => setShowAll(true)} />
                  </div>
                )}

                <div className="flex-shrink-0 w-1" aria-hidden />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail sheet for savings cards */}
      <SavingsDetailSheet opportunity={detail} onClose={() => setDetail(null)} />

      {/* Ver todo sheet */}
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

// ─── Helper: render the right InsightCard variant for a carousel entry ────────

function InsightCardForItem({
  entry,
  onActivate,
  onTap,
  onDismiss,
}: {
  entry: { item: CarouselItem; i: number }
  onActivate: () => void
  onTap: (opp: SavingsOpportunity) => void
  onDismiss: (i: number) => void
}) {
  const { item, i } = entry
  if (item.kind === 'reminder') {
    return <InsightCard kind="reminder" onActivate={onActivate} onDismiss={() => onDismiss(i)} />
  }
  return (
    <InsightCard
      kind="savings"
      opportunity={item.opportunity}
      onTap={() => onTap(item.opportunity)}
      onDismiss={() => onDismiss(i)}
    />
  )
}
