'use client'

import { useState, useEffect, useRef } from 'react'
import {
  motion, AnimatePresence, LayoutGroup,
  useScroll, useVelocity, useSpring, useTransform, useMotionTemplate,
  type MotionValue,
} from 'framer-motion'
import { useRouter, usePathname } from 'next/navigation'
import { useEffectiveScrollY } from '@/lib/hooks/useEffectiveScrollY'
import SubscriptionDetailOverlay from './SubscriptionDetailOverlay'
import { SlidersHorizontal, CalendarDays, Check, ChevronsUpDown } from 'lucide-react'
import BottomSheet from '@/components/ui/BottomSheet'
import CalendarView from '@/components/calendar/CalendarView'
import SubscriptionAvatar from '@/components/subscriptions/SubscriptionAvatar'
import { resolveSubscriptionLogoUrl } from '@/lib/constants/platforms'
import { formatCurrency } from '@/lib/utils/currency'
import { CATEGORIES } from '@/lib/constants/categories'
import { useElasticPullDown } from '@/lib/hooks/useElasticPullDown'
import { useT, useLocale } from '@/lib/i18n/LocaleProvider'
import type { SubscriptionWithCosts, SubscriptionStatus, Category, DashboardStats } from '@/types'

// ─── Billing helpers ──────────────────────────────────────────────────────────
function billingPeriodDays(period: string, intervalCount: number): number {
  const base: Record<string, number> = { weekly: 7, monthly: 30, quarterly: 91, yearly: 365 }
  return (base[period] ?? 30) * intervalCount
}

function billingProgress(nextBillingDate: string | null, period: string, intervalCount: number): number {
  if (!nextBillingDate) return 0
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const next = new Date(nextBillingDate); next.setHours(0, 0, 0, 0)
  const totalDays = billingPeriodDays(period, intervalCount)
  const daysLeft = Math.max(0, Math.round((next.getTime() - today.getTime()) / 86_400_000))
  return Math.min(1, Math.max(0, (totalDays - daysLeft) / totalDays))
}

function daysUntilBilling(nextBillingDate: string | null): number {
  if (!nextBillingDate) return 0
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const next = new Date(nextBillingDate); next.setHours(0, 0, 0, 0)
  return Math.max(0, Math.round((next.getTime() - today.getTime()) / 86_400_000))
}

function formatShortDate(dateStr: string | null, locale: string): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

const STATUS_COLOR: Record<string, string> = {
  active: '#16A34A', trial: '#D97706', paused: '#E07B1A', cancelled: '#EF4444',
}

// ─── Sorting ───────────────────────────────────────────────────────────────
type SortMode = 'alphabetical' | 'recently_added' | 'recently_updated' | 'price_high' | 'price_low' | 'by_category'

function sortSubscriptions(subs: SubscriptionWithCosts[], mode: SortMode): SubscriptionWithCosts[] {
  const s = [...subs]
  switch (mode) {
    case 'alphabetical':
      return s.sort((a, b) => a.name.localeCompare(b.name))
    case 'recently_added':
      return s.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    case 'recently_updated':
      return s.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    case 'price_high':
      return s.sort((a, b) => b.my_monthly_cost - a.my_monthly_cost)
    case 'price_low':
      return s.sort((a, b) => a.my_monthly_cost - b.my_monthly_cost)
    case 'by_category':
      return s.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
  }
}

// ─── Stack geometry ────────────────────────────────────────────────────────
// Cards have content-driven height. Each card peeks ~92px from behind the next.
// STACK_MARGIN = -(avg_card_height - peek) ≈ -(180 - 92) = -88px
const STACK_MARGIN_PX = -88

const CARD_SPRING = { type: 'spring' as const, stiffness: 340, damping: 32, mass: 0.85 }

// ─── Single wallet card ────────────────────────────────────────────────────
interface WalletCardProps {
  sub: SubscriptionWithCosts
  isNew?: boolean
  index: number
  velocityMv: MotionValue<number>
  isSelected: boolean
  onOpen: (sub: SubscriptionWithCosts) => void
  viewMode: 'monthly' | 'yearly'
  numSkeleton: boolean
}

function WalletCard({ sub, isNew, index, velocityMv, isSelected, onOpen, viewMode, numSkeleton }: WalletCardProps) {
  const t = useT()
  const locale = useLocale()
  const [shimmer, setShimmer] = useState(isNew ?? false)

  // Billing
  const progress = billingProgress(sub.next_billing_date, sub.billing_period, sub.billing_interval_count)
  const daysLeft = daysUntilBilling(sub.next_billing_date)
  const nextDateFormatted = formatShortDate(sub.next_billing_date, locale)

  useEffect(() => {
    if (!isNew) return
    const t = setTimeout(() => setShimmer(false), 3000)
    return () => clearTimeout(t)
  }, [isNew])

  // Organic parallax: each card shifts slightly based on scroll velocity.
  // Higher-index cards (deeper in stack) shift more — creates a depth feel.
  const maxShift = (index + 1) * 2.5 // px; very subtle
  const yOffset = useTransform(velocityMv, [-2500, 0, 2500], [maxShift, 0, -maxShift])

  // Scale down as card exits viewport from the top
  const cardRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: cardRef, offset: ['start 0.35', 'end start'] })
  const exitScale = useTransform(scrollYProgress, [0, 1], [1, 0.85])

  return (
    // Parallax wrapper — must NOT have layoutId, otherwise the transform
    // interferes with Framer Motion's position measurement during expansion.
    <motion.div
      ref={cardRef}
      style={{ y: yOffset, scale: exitScale, transformOrigin: 'center bottom', visibility: isSelected ? 'hidden' : undefined }}
    >
      <motion.div
        layoutId={`card-${sub.id}`}
        onClick={() => onOpen(sub)}
        className="w-full bg-white dark:bg-[#1C1C1E] px-5 pt-5 pb-5 flex flex-col relative overflow-hidden cursor-pointer"
        style={{
          border: '1.5px solid var(--border-card)',
          borderRadius: 28,
        }}
        whileTap={{ scale: 0.985 }}
        animate={shimmer ? {
          boxShadow: [
            '0 0 0px 0px rgba(61,59,243,0)',
            '0 0 0px 3px rgba(61,59,243,0.5)',
            '0 0 24px 6px rgba(61,59,243,0.22)',
            '0 0 0px 3px rgba(61,59,243,0.5)',
            '0 0 0px 0px rgba(61,59,243,0)',
          ],
        } : { boxShadow: '0 0 0px 0px rgba(61,59,243,0)' }}
        transition={shimmer ? {
          layout: CARD_SPRING,
          duration: 2.8, ease: 'easeInOut', times: [0, 0.2, 0.5, 0.8, 1],
        } : {
          layout: CARD_SPRING,
          duration: 0,
        }}
      >
        {/* Sweep reflection on new card */}
        {isNew && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(110deg, transparent 20%, rgba(255,255,255,0.72) 50%, transparent 80%)',
              borderRadius: 28,
              zIndex: 10,
            }}
            initial={{ x: '-160%' }}
            animate={{ x: '260%' }}
            transition={{ duration: 1.1, ease: [0.4, 0, 0.2, 1], delay: 0.15 }}
          />
        )}

        {/* Top row */}
        <div className="flex items-start gap-5">
          <SubscriptionAvatar
            name={sub.name}
            logoUrl={resolveSubscriptionLogoUrl(sub.name, sub.logo_url)}
            size="md48"
            corner="rounded-2xl"
          />

          <div className="flex-1 min-w-0">
            <p className="text-[16px] font-bold text-[#111111] dark:text-[#F2F2F7] leading-snug truncate">{sub.name}</p>
            <p className="text-[14px] text-[#999999] dark:text-[#636366] mt-1 leading-snug">
              {t(`categories.${sub.category}` as Parameters<typeof t>[0])}
            </p>
          </div>

          <div className="text-right flex-shrink-0">
            {numSkeleton ? (
              <div className="flex flex-col items-end gap-1.5">
                <div className="h-5 w-20 rounded-lg bg-[#EFEFEF] dark:bg-[#3A3A3C] animate-pulse" />
                <div className="h-4 w-12 rounded-md bg-[#EFEFEF] dark:bg-[#3A3A3C] animate-pulse" />
              </div>
            ) : (
              <>
                <p className="text-[16px] font-bold text-[#111111] dark:text-[#F2F2F7] tabular-nums leading-snug">
                  {viewMode === 'monthly'
                    ? formatCurrency(sub.my_monthly_cost, sub.currency)
                    : formatCurrency(sub.my_annual_cost, sub.currency)}
                  <span className="text-[13px] font-normal text-[#999999] dark:text-[#636366] ml-0.5">
                    {viewMode === 'monthly' ? '/mo' : '/yr'}
                  </span>
                </p>
                {sub.status !== 'active' && (
                  <p className="text-[14px] font-semibold mt-1 leading-snug"
                    style={{ color: STATUS_COLOR[sub.status] ?? '#9CA3AF' }}>
                    {t(`status.${sub.status}` as Parameters<typeof t>[0])}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Billing progress */}
        {sub.next_billing_date && (
          <div className="mt-5">
            <p className="text-[11px] font-semibold text-[#888888] dark:text-[#636366] uppercase tracking-wider mb-2">
              {t('detail.nextBillingSection')}
            </p>
            <div className="w-full rounded-full overflow-hidden" style={{ height: 4, background: 'rgba(0,0,0,0.07)' }}>
              <div className="h-full rounded-full" style={{ width: `${Math.round(progress * 100)}%`, background: '#22C55E' }} />
            </div>
            <div className="flex justify-between items-center mt-1.5">
              <span className="text-[12px] text-[#999999] dark:text-[#636366]">
                {daysLeft === 0
                  ? t('dashboard.dueToday')
                  : daysLeft === 1
                  ? t('dashboard.tomorrow')
                  : t('dashboard.inDays').replace('{days}', String(daysLeft))}
              </span>
              <span className="text-[12px] text-[#999999] dark:text-[#636366]">{nextDateFormatted}</span>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

// ─── Stacked card list with scroll physics ────────────────────────────────
function CardStack({
  subscriptions,
  newSubscriptionId,
  selectedSubId,
  onOpen,
  viewMode,
  numSkeleton,
}: {
  subscriptions: SubscriptionWithCosts[]
  newSubscriptionId?: string
  selectedSubId: string | null
  onOpen: (sub: SubscriptionWithCosts) => void
  viewMode: 'monthly' | 'yearly'
  numSkeleton: boolean
}) {
  // Organic scroll: spring-smoothed velocity drives per-card parallax
  const { scrollY } = useScroll()
  const rawVelocity = useVelocity(scrollY)
  const springVelocity = useSpring(rawVelocity, { stiffness: 180, damping: 28 })

  // Pull-down elastic: drives both the stack Y translation and card gap expansion
  const elasticY = useElasticPullDown()
  const gapExtra = useTransform(elasticY, [0, 65], [0, 24])
  const dynamicMargin = useTransform(gapExtra, v => `${STACK_MARGIN_PX + v}px`)

  return (
    <motion.div className="relative" style={{ y: elasticY }}>
      {subscriptions.map((sub, i) => (
        <motion.div
          key={sub.id}
          style={{
            marginTop: i === 0 ? 0 : dynamicMargin,
            zIndex: i + 1,
            position: 'relative',
          }}
        >
          <WalletCard
            sub={sub}
            isNew={sub.id === newSubscriptionId}
            index={i}
            velocityMv={springVelocity}
            isSelected={sub.id === selectedSubId}
            onOpen={onOpen}
            viewMode={viewMode}
            numSkeleton={numSkeleton}
          />
        </motion.div>
      ))}
    </motion.div>
  )
}

// ─── Filter bottom sheet ───────────────────────────────────────────────────

interface FilterSheetProps {
  isOpen: boolean
  currentStatus: string
  currentCategory: string
  onClose: () => void
}

function FilterSheet({ isOpen, currentStatus, currentCategory, onClose }: FilterSheetProps) {
  const t = useT()
  const router = useRouter()
  const pathname = usePathname()
  const [status, setStatus] = useState<SubscriptionStatus | 'all'>((currentStatus as SubscriptionStatus) ?? 'all')
  const [category, setCategory] = useState<Category | 'all'>((currentCategory as Category) ?? 'all')

  function apply() {
    const p = new URLSearchParams()
    if (status !== 'all') p.set('status', status)
    if (category !== 'all') p.set('category', category)
    router.push(`${pathname}${p.size ? '?' + p.toString() : ''}`, { scroll: false })
    onClose()
  }

  function reset() {
    router.push(pathname, { scroll: false })
    onClose()
  }

  const footer = (
    <div
      className="flex gap-3 px-5 py-4 border-t border-[#F0F0F0] dark:border-[#2C2C2E]"
      style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
    >
      <button onClick={reset}
        className="flex-1 h-12 rounded-full text-sm font-semibold text-[#444444] dark:text-[#AEAEB2] bg-[#F5F5F5] dark:bg-[#2C2C2E] transition-colors active:bg-[#ECECEC] dark:active:bg-[#3A3A3C]">
        {t('subscriptions.reset')}
      </button>
      <button onClick={apply}
        className="flex-1 h-12 rounded-full text-sm font-semibold text-white bg-[#3D3BF3] hover:bg-[#3230D0] transition-colors active:bg-[#2B29B8]">
        {t('subscriptions.apply')}
      </button>
    </div>
  )

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={t('sheets.filter')} footer={footer}>
      <div className="px-5 pt-2 pb-5 space-y-6">
        <div>
          <p className="text-[11px] font-semibold text-[#888888] dark:text-[#636366] uppercase tracking-wider mb-3">{t('subscriptions.filterStatus')}</p>
          <div className="flex flex-wrap gap-2">
            {([
              { value: 'all' as const, label: t('common.all') },
              { value: 'active' as const, label: t('status.active') },
              { value: 'trial' as const, label: t('status.trial') },
              { value: 'paused' as const, label: t('status.paused') },
              { value: 'cancelled' as const, label: t('status.cancelled') },
            ] as Array<{ value: SubscriptionStatus | 'all'; label: string }>).map(opt => (
              <button key={opt.value} onClick={() => setStatus(opt.value)}
                className={`flex items-center gap-1.5 px-4 h-12 rounded-full text-sm font-medium border transition-colors duration-150 ${status === opt.value ? 'bg-[#3D3BF3] text-white border-[#3D3BF3]' : 'bg-white dark:bg-[#2A2A2C] text-[#444444] dark:text-[#AEAEB2] border-[#E0E0E0] dark:border-[#3A3A3C]'}`}>
                {status === opt.value && <Check size={12} strokeWidth={3} />}
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-[#888888] dark:text-[#636366] uppercase tracking-wider mb-3">{t('subscriptions.filterCategory')}</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setCategory('all')}
              className={`flex items-center gap-2 px-3 h-12 rounded-full text-sm font-medium border transition-colors duration-150 ${category === 'all' ? 'bg-[#3D3BF3] text-white border-[#3D3BF3]' : 'bg-white dark:bg-[#2A2A2C] text-[#444444] dark:text-[#AEAEB2] border-[#E0E0E0] dark:border-[#3A3A3C]'}`}>
              {category === 'all' && <Check size={12} strokeWidth={3} />}
              {t('subscriptions.allCategories')}
            </button>
            {CATEGORIES.map(cat => {
              const Icon = cat.icon
              const active = category === cat.value
              return (
                <button key={cat.value} onClick={() => setCategory(cat.value)}
                  className={`flex items-center gap-2 px-3 h-12 rounded-full text-sm font-medium border transition-colors duration-150 ${active ? 'bg-[#3D3BF3] text-white border-[#3D3BF3]' : 'bg-white dark:bg-[#2A2A2C] text-[#444444] dark:text-[#AEAEB2] border-[#E0E0E0] dark:border-[#3A3A3C]'}`}>
                  <Icon size={13} strokeWidth={2} />
                  {t(`categories.${cat.value}` as Parameters<typeof t>[0])}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </BottomSheet>
  )
}

// ─── Sort dropdown ─────────────────────────────────────────────────────────
function SortDropdown({
  current,
  onSelect,
}: {
  current: SortMode
  onSelect: (mode: SortMode) => void
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const options: { mode: SortMode; label: string }[] = [
    { mode: 'alphabetical',     label: t('subscriptions.sortAlphabetical') },
    { mode: 'recently_added',   label: t('subscriptions.sortRecentlyAdded') },
    { mode: 'recently_updated', label: t('subscriptions.sortRecentlyUpdated') },
    { mode: 'price_high',       label: t('subscriptions.sortPriceHigh') },
    { mode: 'price_low',        label: t('subscriptions.sortPriceLow') },
  ]

  const currentLabel = options.find(o => o.mode === current)?.label ?? ''

  // Close on outside click or scroll
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onScroll() { setOpen(false) }
    if (open) {
      document.addEventListener('mousedown', onMouseDown)
      window.addEventListener('scroll', onScroll, { passive: true })
    }
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('scroll', onScroll)
    }
  }, [open])

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 active:opacity-60 transition-opacity"
      >
        <span className="text-[13px] text-[#999999] dark:text-[#636366]">{t('subscriptions.sortBy')}:</span>
        <span className="text-[13px] text-[#444444] dark:text-[#AEAEB2]">{currentLabel}</span>
        <ChevronsUpDown size={11} className="text-[#BBBBBB] dark:text-[#636366] ml-0.5" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-2 w-44 bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5E5] dark:border-[#2C2C2E] shadow-[0_4px_24px_rgba(0,0,0,0.12)] z-50 animate-fade-in-scale">
          <div className="p-2">
            {options.map(({ mode, label }) => {
              const active = current === mode
              return (
                <button
                  key={mode}
                  onClick={() => { onSelect(mode); setOpen(false) }}
                  className={`w-full flex items-center justify-between gap-4 px-3 py-2 text-sm transition-colors text-left rounded-[8px] ${active ? 'text-[#3D3BF3] bg-[#F0F0FF] dark:bg-[#2A2A4A]' : 'text-[#424242] dark:text-[#AEAEB2] hover:bg-[#F5F5F5] dark:hover:bg-[#2C2C2E]'}`}
                >
                  {label}
                  {active && <Check size={13} strokeWidth={2.5} className="text-[#3D3BF3] flex-shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main view ─────────────────────────────────────────────────────────────
interface SubscriptionsViewProps {
  subscriptions: SubscriptionWithCosts[]
  allCount: number
  stats: DashboardStats
  currentStatus: string
  currentCategory: string
  newSubscriptionId?: string
}

export default function SubscriptionsView({
  subscriptions,
  allCount,
  stats,
  currentStatus,
  currentCategory,
  newSubscriptionId,
}: SubscriptionsViewProps) {
  const t = useT()
  const [filterOpen, setFilterOpen] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [sortMode, setSortMode] = useState<SortMode>('alphabetical')

  // ── Header scroll-fade: content scrolls OVER the header ──────────────────
  const scrollY = useEffectiveScrollY()
  const headerOpacity      = useTransform(scrollY, [0, 130], [1, 0])
  const headerBlurPx       = useTransform(scrollY, [0, 130], [0, 8])
  const headerFilter       = useMotionTemplate`blur(${headerBlurPx}px)`
  const headerPointerEvents = useTransform(headerOpacity, (v) => v < 0.05 ? 'none' : 'auto')
  const [selectedSub, setSelectedSub] = useState<SubscriptionWithCosts | null>(null)
  const [overlayVisible, setOverlayVisible] = useState(false)
  const [closingSubId, setClosingSubId] = useState<string | null>(null)

  // Monthly ↔ Yearly toggle with skeleton transition
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly')
  const [numSkeleton, setNumSkeleton] = useState(false)
  const skeletonTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function toggleViewMode() {
    if (numSkeleton) return
    setNumSkeleton(true)
    skeletonTimer.current = setTimeout(() => {
      setViewMode(prev => prev === 'monthly' ? 'yearly' : 'monthly')
      setNumSkeleton(false)
    }, 1200)
  }

  useEffect(() => {
    return () => { if (skeletonTimer.current) clearTimeout(skeletonTimer.current) }
  }, [])

  function openSub(sub: SubscriptionWithCosts) {
    setClosingSubId(null)
    setSelectedSub(sub)
    setOverlayVisible(true)
  }

  function closeSub() {
    setClosingSubId(selectedSub?.id ?? null) // break layoutId before exit
    setOverlayVisible(false)
  }

  const hasActiveFilters = (currentStatus && currentStatus !== 'all') || (currentCategory && currentCategory !== 'all')

  const sortedSubscriptions = sortSubscriptions(subscriptions, sortMode)

  return (
    <LayoutGroup>
      {/* ── Sticky header zone — sits BEHIND cards (low z-index)
              fades + blurs as cards scroll over it ─────────────── */}
      <motion.div
        className="sticky top-0 z-[20] pb-4"
        style={{ opacity: headerOpacity, filter: headerFilter, pointerEvents: headerPointerEvents }}
      >
        {/* Title row */}
        <div className="flex items-center justify-between pt-2">
          <h1 className="text-[28px] font-bold text-[#111111] dark:text-[#F2F2F7] tracking-tight">{t('subscriptions.title')}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCalendarOpen(true)}
              className="w-10 h-10 rounded-full bg-white dark:bg-[#1C1C1E] flex items-center justify-center transition-colors active:bg-[#F0F0F0] dark:active:bg-[#2C2C2E]"
              style={{ border: '1.5px solid var(--border-nav-btn)' }}
            >
              <CalendarDays size={17} strokeWidth={2} className="text-[#333333] dark:text-[#F2F2F7]" />
            </button>
            <button
              onClick={() => setFilterOpen(true)}
              className="relative w-10 h-10 rounded-full bg-white dark:bg-[#1C1C1E] flex items-center justify-center transition-colors active:bg-[#F0F0F0] dark:active:bg-[#2C2C2E]"
              style={{ border: '1.5px solid var(--border-nav-btn)' }}
            >
              <SlidersHorizontal size={17} strokeWidth={2} className="text-[#333333] dark:text-[#F2F2F7]" />
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#3D3BF3] border-2 border-white" />
              )}
            </button>
          </div>
        </div>

        {/* Summary card */}
        {allCount > 0 && (
          <div className="mt-3 bg-white dark:bg-[#1C1C1E] border border-[#EFEFEF] dark:border-[#2C2C2E] rounded-[20px] p-4 flex items-center gap-5">
            <div>
              <p className="text-[13px] text-[#999999] dark:text-[#636366] font-medium">{t('subscriptions.total')}</p>
              <p className="text-[22px] font-bold text-[#111111] dark:text-[#F2F2F7] mt-0.5 leading-tight tabular-nums">
                {allCount}
              </p>
            </div>
            <div className="w-px self-stretch bg-[#EFEFEF] dark:bg-[#2C2C2E] my-1" />
            <button
              onClick={toggleViewMode}
              className="text-left active:opacity-60 transition-opacity duration-100"
            >
              <p className="text-[13px] text-[#999999] dark:text-[#636366] font-medium flex items-center gap-1.5">
                {viewMode === 'monthly' ? t('subscriptions.perMonth') : t('subscriptions.perYear')}
                <ChevronsUpDown size={11} className="text-[#BBBBBB] dark:text-[#636366]" />
              </p>
              {numSkeleton ? (
                <div className="h-[26px] w-24 rounded-lg bg-[#EFEFEF] dark:bg-[#2C2C2E] animate-pulse mt-0.5" />
              ) : (
                <p className="text-[22px] font-bold text-[#111111] dark:text-[#F2F2F7] mt-0.5 leading-tight tabular-nums">
                  {viewMode === 'monthly'
                    ? formatCurrency(stats.total_monthly_cost, 'EUR')
                    : formatCurrency(stats.total_annual_cost, 'EUR')}
                </p>
              )}
            </button>
          </div>
        )}
      </motion.div>

      {/* Sort control — just above cards */}
      <div className="relative z-[30] mt-2 mb-[9px]">
        <SortDropdown current={sortMode} onSelect={setSortMode} />
      </div>

      {/* ── Cards — higher z-index, scroll over the header ────── */}
      <div className="relative z-[1] space-y-5">
        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            {currentStatus && currentStatus !== 'all' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#3D3BF3] text-white text-xs font-medium capitalize">
                {currentStatus}
              </span>
            )}
            {currentCategory && currentCategory !== 'all' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#3D3BF3] text-white text-xs font-medium capitalize">
                {currentCategory}
              </span>
            )}
          </div>
        )}

        {/* Wallet stacked card list */}
        {sortedSubscriptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm font-medium text-[#111111] dark:text-[#F2F2F7] mb-1">
              {allCount === 0 ? t('subscriptions.noSubscriptions') : t('subscriptions.noResults')}
            </p>
            <p className="text-xs text-[#888888] dark:text-[#636366]">
              {allCount === 0 ? t('subscriptions.getStarted') : t('subscriptions.noResultsHint')}
            </p>
          </div>
        ) : (
          <CardStack
            subscriptions={sortedSubscriptions}
            newSubscriptionId={newSubscriptionId}
            selectedSubId={selectedSub?.id ?? null}
            onOpen={openSub}
            viewMode={viewMode}
            numSkeleton={numSkeleton}
          />
        )}
      </div>

      {/* ── Card expansion overlay ────────────────────────────── */}
      <AnimatePresence onExitComplete={() => { setSelectedSub(null); setClosingSubId(null) }}>
        {overlayVisible && selectedSub && (
          <SubscriptionDetailOverlay
            sub={selectedSub}
            onClose={closeSub}
            isClosing={closingSubId === selectedSub.id}
          />
        )}
      </AnimatePresence>

      {/* ── Filter bottom sheet ───────────────────────────────── */}
      <FilterSheet
        isOpen={filterOpen}
        currentStatus={currentStatus}
        currentCategory={currentCategory}
        onClose={() => setFilterOpen(false)}
      />

      {/* ── Calendar bottom sheet ─────────────────────────────── */}
      <BottomSheet isOpen={calendarOpen} onClose={() => setCalendarOpen(false)} height="full">
        <div className="px-5 pt-3 pb-5">
          <CalendarView subscriptions={subscriptions} />
        </div>
      </BottomSheet>

    </LayoutGroup>
  )
}
