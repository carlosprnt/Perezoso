'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, useAnimation } from 'framer-motion'
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
const PEEK_OFFSET = 4    // px per depth level
const PEEK_SCALE  = 0.025
const PEEK_DIM    = 0.10

interface Props {
  items: CarouselItem[]
  onReminderActivate: () => void
  onAllDismissed: () => void
}

export default function SavingsCarousel({ items, onReminderActivate, onAllDismissed }: Props) {
  const [dismissed, setDismissed] = useState<Set<number>>(new Set())
  const [detail,    setDetail]    = useState<SavingsOpportunity | null>(null)
  const [showAll,   setShowAll]   = useState(false)
  const [frontIdx,  setFrontIdx]  = useState(0)
  const [isExiting, setIsExiting] = useState(false)

  // Motion values for drag-based rotation
  const dragX    = useMotionValue(0)
  const rotation = useTransform(dragX, [-180, 0, 180], [-8, 0, 8])
  const frontAnim = useAnimation()

  const visible = items
    .map((item, i) => ({ item, i }))
    .filter(({ i }) => !dismissed.has(i))

  const deckSize  = Math.min(MAX_STACK, visible.length)
  const safeFront = visible.length > 0 ? frontIdx % visible.length : 0

  const rotated = visible.length === 0 ? [] : [
    ...visible.slice(safeFront),
    ...visible.slice(0, safeFront),
  ].slice(0, deckSize)

  const frontEntry  = rotated[0]
  const peekEntries = rotated.slice(1, 1 + PEEK_COUNT)

  // Reset drag position when the front card changes
  useEffect(() => {
    dragX.set(0)
  }, [frontEntry?.i, dragX])

  // ── Dismiss ────────────────────────────────────────────────────────────────
  function dismiss(originalIdx: number) {
    const next = new Set(dismissed).add(originalIdx)
    const newVisible = items
      .map((item, idx) => ({ item, i: idx }))
      .filter(({ i }) => !next.has(i))

    setDismissed(next)

    if (newVisible.length === 0) { onAllDismissed(); return }

    const currentFront = visible[safeFront]
    const newIdx = currentFront ? newVisible.findIndex(e => e.i === currentFront.i) : -1
    setFrontIdx(newIdx === -1 ? Math.max(0, safeFront - 1) % newVisible.length : newIdx)
  }

  function handleActivate() {
    onReminderActivate()
    const idx = items.findIndex(it => it.kind === 'reminder')
    if (idx !== -1) dismiss(idx)
  }

  function cycleToBack() {
    setFrontIdx(prev => (prev + 1) % visible.length)
  }

  // ── Swipe handler (async for clean animation sequencing) ──────────────────
  async function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (isExiting || visible.length <= 1) return
    const shouldSwipe = Math.abs(info.offset.x) > 30 || Math.abs(info.velocity.x) > 200
    if (!shouldSwipe) return

    const dir = info.offset.x > 0 || info.velocity.x > 0 ? 1 : -1
    setIsExiting(true)

    await frontAnim.start({
      x: dir * 420,
      opacity: 0,
      scale: 0.88,
      rotate: dir * 7,
      transition: { duration: 0.22, ease: [0.4, 0, 1, 1] },
    })

    cycleToBack()
    dragX.set(0)
    frontAnim.set({ x: 0, opacity: 1, scale: 1, rotate: 0 })
    setIsExiting(false)
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
          {/* Stack container */}
          <div
            className="relative w-full"
            style={{ paddingBottom: peekEntries.length * PEEK_OFFSET }}
          >
            {/* Peek cards — rise up while front card exits */}
            {peekEntries.map((entry, idx) => {
              const depth  = idx + 1
              const target = isExiting ? depth - 1 : depth
              const tv     = target * PEEK_OFFSET
              return (
                <motion.div
                  key={entry.i}
                  className="absolute inset-0 rounded-[24px] bg-white dark:bg-[#1C1C1E]"
                  initial={{ y: depth * PEEK_OFFSET, scale: 1 - depth * PEEK_SCALE, opacity: 1 - depth * PEEK_DIM }}
                  animate={{
                    y:       tv,
                    scale:   1 - target * PEEK_SCALE,
                    opacity: 1 - target * PEEK_DIM,
                  }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  style={{ zIndex: PEEK_COUNT - idx, boxShadow: '0 2px 8px rgba(0,0,0,0.09)' }}
                />
              )
            })}

            {/* Front card */}
            <motion.div
              key={frontEntry?.i}
              animate={frontAnim}
              initial={{ x: 0, opacity: 1, scale: 1, rotate: 0 }}
              style={{
                position: 'relative',
                zIndex: PEEK_COUNT + 1,
                touchAction: 'pan-y',
                x: dragX,
                rotate: rotation,
              }}
              drag={!isExiting && visible.length > 1 ? 'x' : false}
              dragElastic={0.35}
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={handleDragEnd}
              whileDrag={{ scale: 0.97 }}
            >
              {frontEntry && renderFront(frontEntry)}
            </motion.div>
          </div>

          {/* Discover all link */}
          {visible.length > 0 && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full mt-2 text-center text-[14px] font-medium text-[#3D3BF3] dark:text-[#8B89FF]"
            >
              Más oportunidades de ahorro
            </button>
          )}
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

  function renderFront(entry: NonNullable<typeof frontEntry>) {
    const { item, i } = entry
    if (item.kind === 'reminder') {
      return (
        <InsightCard
          kind="reminder"
          annualCount={item.annualCount}
          onActivate={handleActivate}
          onDismiss={() => dismiss(i)}
        />
      )
    }
    return (
      <InsightCard
        kind="savings"
        opportunity={item.opportunity}
        onTap={() => setDetail(item.opportunity)}
        onDismiss={() => dismiss(i)}
      />
    )
  }
}
