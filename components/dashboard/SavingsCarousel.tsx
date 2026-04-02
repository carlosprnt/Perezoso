'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { PanInfo } from 'framer-motion'
import InsightCard from './SavingsOpportunityCard'
import InsightAllSheet from './InsightAllSheet'
import SavingsDetailSheet from './SavingsDetailSheet'
import type { SavingsOpportunity } from '@/lib/calculations/savings'

export type CarouselItem =
  | { kind: 'reminder'; annualCount: number }
  | { kind: 'savings'; opportunity: SavingsOpportunity }

const MAX_STACK   = 8
const PEEK_COUNT  = 4
const PEEK_OFFSET = 3    // px per depth level
const PEEK_SCALE  = 0.025 // scale reduction per level
const PEEK_DIM    = 0.12 // opacity reduction per level

interface Props {
  items: CarouselItem[]
  onReminderActivate: () => void
  onAllDismissed: () => void
}

export default function SavingsCarousel({ items, onReminderActivate, onAllDismissed }: Props) {
  const [dismissed,  setDismissed] = useState<Set<number>>(new Set())
  const [detail,     setDetail]    = useState<SavingsOpportunity | null>(null)
  const [showAll,    setShowAll]   = useState(false)
  const [frontIdx,   setFrontIdx]  = useState(0)
  const [isExiting,  setIsExiting] = useState(false)
  const [exitDir,    setExitDir]   = useState(1)   // 1 = right, -1 = left

  const visible = items
    .map((item, i) => ({ item, i }))
    .filter(({ i }) => !dismissed.has(i))

  const deckSize     = Math.min(MAX_STACK, visible.length)
  const safeFront    = visible.length > 0 ? frontIdx % visible.length : 0
  const lastDeckIdx  = deckSize - 1
  const isAtLastCard = safeFront === lastDeckIdx && visible.length > 1

  // Rotate visible array so the front card is first
  const rotated = visible.length === 0 ? [] : [
    ...visible.slice(safeFront),
    ...visible.slice(0, safeFront),
  ].slice(0, deckSize)

  const frontEntry  = rotated[0]
  const peekEntries = rotated.slice(1, 1 + PEEK_COUNT)

  // ── Dismiss a card permanently ─────────────────────────────────────────────
  function dismiss(originalIdx: number) {
    const next = new Set(dismissed).add(originalIdx)
    const newVisible = items
      .map((item, idx) => ({ item, i: idx }))
      .filter(({ i }) => !next.has(i))

    setDismissed(next)

    if (newVisible.length === 0) {
      onAllDismissed()
      return
    }

    // Keep same front card if possible, else clamp
    const currentFront = visible[safeFront]
    const newIdx = currentFront ? newVisible.findIndex(e => e.i === currentFront.i) : -1
    setFrontIdx(newIdx === -1 ? Math.max(0, safeFront - 1) % newVisible.length : newIdx)
  }

  function handleActivate() {
    onReminderActivate()
    const idx = items.findIndex(it => it.kind === 'reminder')
    if (idx !== -1) dismiss(idx)
  }

  // ── Swipe front card to back ───────────────────────────────────────────────
  function cycleToBack() {
    setFrontIdx(prev => (prev + 1) % visible.length)
  }

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (isExiting || visible.length <= 1) return
    const shouldSwipe = Math.abs(info.offset.x) > 30 || Math.abs(info.velocity.x) > 200
    if (!shouldSwipe) return

    const dir = info.offset.x > 0 || info.velocity.x > 0 ? 1 : -1
    setExitDir(dir)
    setIsExiting(true)
    setTimeout(() => {
      cycleToBack()
      setIsExiting(false)
    }, 230)
  }

  if (visible.length === 0) return null

  return (
    <>
      <AnimatePresence onExitComplete={onAllDismissed}>
        <motion.div
          key="stack-wrap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Stack container — paddingBottom reveals peek cards */}
          <div
            className="relative w-full"
            style={{ paddingBottom: peekEntries.length * PEEK_OFFSET }}
          >
            {/* Peek cards — rendered as plain backgrounds, animate upward on swipe */}
            {peekEntries.map((entry, idx) => {
              const depth   = idx + 1
              // While exiting, rise one level; otherwise stay at depth
              const target  = isExiting ? depth - 1 : depth
              return (
                <motion.div
                  key={entry.i}
                  className="absolute inset-0 rounded-[24px] bg-white dark:bg-[#1C1C1E]"
                  animate={{
                    y:       target * PEEK_OFFSET,
                    scale:   1 - target * PEEK_SCALE,
                    opacity: 1 - target * PEEK_DIM,
                  }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  style={{
                    zIndex: PEEK_COUNT - idx,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                  }}
                />
              )
            })}

            {/* Front card — draggable, exits on swipe */}
            <motion.div
              key={frontEntry?.i}
              style={{ position: 'relative', zIndex: PEEK_COUNT + 1 }}
              animate={isExiting
                ? { x: exitDir * 420, opacity: 0, scale: 0.88, rotate: exitDir * 7 }
                : { x: 0, opacity: 1, scale: 1, rotate: 0 }
              }
              transition={isExiting
                ? { duration: 0.23, ease: [0.4, 0, 1, 1] }
                : { type: 'spring', stiffness: 400, damping: 30 }
              }
              initial={{ x: 0, opacity: 1, scale: 1, rotate: 0 }}
              drag={!isExiting && visible.length > 1 ? 'x' : false}
              dragElastic={0.35}
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={handleDragEnd}
              whileDrag={{ scale: 0.97 }}
            >
              {frontEntry && renderFront(frontEntry)}
            </motion.div>
          </div>
        </motion.div>
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

  // ── Render helpers ─────────────────────────────────────────────────────────
  function renderFront(entry: NonNullable<typeof frontEntry>) {
    const { item, i } = entry
    const verTodo = isAtLastCard ? () => setShowAll(true) : undefined

    if (item.kind === 'reminder') {
      return (
        <InsightCard
          kind="reminder"
          annualCount={item.annualCount}
          onActivate={handleActivate}
          onDismiss={() => dismiss(i)}
          onVerTodo={verTodo}
        />
      )
    }
    return (
      <InsightCard
        kind="savings"
        opportunity={item.opportunity}
        onTap={() => setDetail(item.opportunity)}
        onDismiss={() => dismiss(i)}
        onVerTodo={verTodo}
      />
    )
  }
}
