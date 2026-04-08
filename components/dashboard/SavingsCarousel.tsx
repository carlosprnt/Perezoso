'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, useAnimation } from 'framer-motion'
import type { PanInfo } from 'framer-motion'
import InsightCard from './SavingsOpportunityCard'
import InsightAllSheet from './InsightAllSheet'
import SavingsDetailSheet from './SavingsDetailSheet'
import { useFeatureGate } from '@/lib/revenuecat/useFeatureGate'
import type { SavingsOpportunity } from '@/lib/calculations/savings'

export type CarouselItem =
  | { kind: 'reminder';     annualCount: number }
  | { kind: 'totalSavings'; totalAnnual: number; currency: string }

const PEEK_COUNT   = 1
const PEEK_OFFSET  = 4
const PEEK_SCALE   = 0.025
const PEEK_DIM     = 0.10

interface Props {
  items: CarouselItem[]
  opportunities: SavingsOpportunity[]
  onReminderActivate: () => void
  onAllDismissed: () => void
}

export default function SavingsCarousel({ items, opportunities, onReminderActivate, onAllDismissed }: Props) {
  const gate = useFeatureGate()
  const [dismissed, setDismissed] = useState<Set<number>>(new Set())
  const [detail,    setDetail]    = useState<SavingsOpportunity | null>(null)
  const [showAll,   setShowAll]   = useState(false)
  const [frontIdx,  setFrontIdx]  = useState(0)
  const [isExiting, setIsExiting] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Free users only get to peek at the first 3 savings opportunities.
  // Pro sees everything. The sheet is gated separately, but if it somehow
  // opens (e.g. stale Pro state), we still limit what's rendered.
  const visibleOpportunities = gate.isPro ? opportunities : opportunities.slice(0, 3)

  const dragX    = useMotionValue(0)
  const rotation = useTransform(dragX, [-180, 0, 180], [-8, 0, 8])
  const frontAnim = useAnimation()

  const visible = items
    .map((item, i) => ({ item, i }))
    .filter(({ i }) => !dismissed.has(i))

  const safeFront   = visible.length > 0 ? frontIdx % visible.length : 0
  const rotated     = visible.length === 0 ? [] : [
    ...visible.slice(safeFront),
    ...visible.slice(0, safeFront),
  ].slice(0, PEEK_COUNT + 1)

  const frontEntry  = rotated[0]
  const peekEntries = rotated.slice(1, 1 + PEEK_COUNT)

  useEffect(() => { dragX.set(0) }, [frontEntry?.i, dragX])

  // Swipe hint — plays twice when 2 cards are visible
  const isExitingRef    = useRef(isExiting)
  const visibleCountRef = useRef(visible.length)
  useEffect(() => { isExitingRef.current    = isExiting },     [isExiting])
  useEffect(() => { visibleCountRef.current = visible.length }, [visible.length])

  useEffect(() => {
    let count = 0
    const id = setInterval(async () => {
      if (isExitingRef.current || visibleCountRef.current <= 1) return
      await frontAnim.start({ x: -10, rotate: -2, transition: { duration: 1.4, ease: [0.12, 0, 0.4, 1] } })
      await frontAnim.start({ x:  0, rotate:  0, transition: { duration: 0.25, ease: 'easeIn' } })
      count++
      if (count >= 2) clearInterval(id)
    }, 6000)
    return () => clearInterval(id)
  }, [frontAnim, frontEntry?.i])

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
    // Renewal reminders are a Pro feature — gate before activating.
    if (!gate.requirePro('renewal_reminders')) return
    onReminderActivate()
    const idx = items.findIndex(it => it.kind === 'reminder')
    if (idx !== -1) dismiss(idx)
  }

  function handleShowAll() {
    // Savings recommendations list is Pro — open the paywall for free
    // users instead of the full InsightAllSheet.
    if (!gate.requirePro('savings_recommendations')) return
    setShowAll(true)
  }

  async function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (isExiting || visible.length <= 1) return
    const shouldSwipe = Math.abs(info.offset.x) > 30 || Math.abs(info.velocity.x) > 200
    if (!shouldSwipe) return
    const dir = info.offset.x > 0 || info.velocity.x > 0 ? 1 : -1
    setIsExiting(true)
    await frontAnim.start({
      x: dir * 420, opacity: 0, scale: 0.88, rotate: dir * 7,
      transition: { duration: 0.22, ease: [0.4, 0, 1, 1] },
    })
    setFrontIdx(prev => (prev + 1) % visible.length)
    dragX.set(0)
    frontAnim.set({ x: 0, opacity: 1, scale: 1, rotate: 0 })
    setIsExiting(false)
  }

  if (items.length === 0) return null

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
          <div
            ref={containerRef}
            className="relative w-full"
            style={{ paddingBottom: peekEntries.length * PEEK_OFFSET }}
          >
            {/* Peek card */}
            {peekEntries.map((entry, idx) => {
              const depth  = idx + 1
              const target = isExiting ? depth - 1 : depth
              return (
                <motion.div
                  key={entry.i}
                  className="absolute inset-0 rounded-[24px] bg-white dark:bg-[#1C1C1E]"
                  initial={{ y: depth * PEEK_OFFSET, scale: 1 - depth * PEEK_SCALE, opacity: 1 - depth * PEEK_DIM }}
                  animate={{ y: target * PEEK_OFFSET, scale: 1 - target * PEEK_SCALE, opacity: 1 - target * PEEK_DIM }}
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
        </motion.div>
      </AnimatePresence>

      <SavingsDetailSheet opportunity={detail} onClose={() => setDetail(null)} />
      <InsightAllSheet
        isOpen={showAll}
        onClose={() => setShowAll(false)}
        opportunities={visibleOpportunities}
        onDetail={opp => { setDetail(opp); setShowAll(false) }}
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
        kind="totalSavings"
        totalAnnual={item.totalAnnual}
        currency={item.currency}
        onTap={handleShowAll}
      />
    )
  }
}
