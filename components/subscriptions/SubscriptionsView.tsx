'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { SlidersHorizontal, X, Check } from 'lucide-react'
import SubscriptionAvatar from '@/components/subscriptions/SubscriptionAvatar'
import { formatCurrency } from '@/lib/utils/currency'
import { CATEGORIES } from '@/lib/constants/categories'
import type { SubscriptionWithCosts, SubscriptionStatus, Category, DashboardStats } from '@/types'

// ─── Category labels ───────────────────────────────────────────────────────
const CATEGORY_LABEL: Record<string, string> = {
  streaming: 'Streaming', music: 'Music', productivity: 'Productivity',
  cloud: 'Cloud', ai: 'AI', health: 'Health', gaming: 'Gaming',
  education: 'Education', mobility: 'Mobility', home: 'Home', other: 'Other',
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Active', trial: 'Trial', paused: 'Paused', cancelled: 'Cancelled',
}

const STATUS_COLOR: Record<string, string> = {
  active: '#16A34A', trial: '#D97706', paused: '#E07B1A', cancelled: '#EF4444',
}

// ─── Single wallet card (always white) ────────────────────────────────────
function WalletCard({ sub }: { sub: SubscriptionWithCosts }) {
  return (
    <Link href={`/subscriptions/${sub.id}`}>
      <div
        className="w-full bg-white rounded-[28px] px-5 py-[18px] flex items-center gap-4 active:scale-[0.985] transition-transform duration-100"
        style={{ border: '1.5px solid #E8E8E8' }}
      >
        {/* Avatar */}
        <SubscriptionAvatar name={sub.name} logoUrl={sub.logo_url} size="md" />

        {/* Name + category */}
        <div className="flex-1 min-w-0">
          <p className="text-[19px] font-bold text-[#111111] leading-snug truncate">
            {sub.name}
          </p>
          <p className="text-[13px] text-[#999999] mt-0.5 leading-snug">
            {CATEGORY_LABEL[sub.category] ?? sub.category}
          </p>
        </div>

        {/* Price + status */}
        <div className="text-right flex-shrink-0">
          <p className="text-[15px] font-bold text-[#111111] tabular-nums leading-snug">
            {formatCurrency(sub.my_monthly_cost, sub.currency)}
            <span className="text-[13px] font-normal text-[#999999] ml-0.5">/mo</span>
          </p>
          <p
            className="text-[13px] font-semibold mt-0.5 leading-snug"
            style={{ color: STATUS_COLOR[sub.status] ?? '#9CA3AF' }}
          >
            {STATUS_LABEL[sub.status] ?? sub.status}
          </p>
        </div>
      </div>
    </Link>
  )
}

// ─── Filter bottom sheet ───────────────────────────────────────────────────
const STATUS_OPTIONS: Array<{ value: SubscriptionStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'trial', label: 'Trial' },
  { value: 'paused', label: 'Paused' },
  { value: 'cancelled', label: 'Cancelled' },
]

interface FilterSheetProps {
  currentStatus: string
  currentCategory: string
  onClose: () => void
}

function FilterSheet({ currentStatus, currentCategory, onClose }: FilterSheetProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [status, setStatus] = useState<SubscriptionStatus | 'all'>((currentStatus as SubscriptionStatus) ?? 'all')
  const [category, setCategory] = useState<Category | 'all'>((currentCategory as Category) ?? 'all')

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

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

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black/40 z-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[28px]"
        style={{ border: '1px solid #E5E5E5', borderBottom: 'none' }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 36 }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-[#DADADA] rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#F0F0F0]">
          <h2 className="text-[17px] font-semibold text-[#111111]">Filters</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-2xl bg-[#F5F5F5] flex items-center justify-center"
          >
            <X size={15} strokeWidth={2.5} className="text-[#666666]" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Status */}
          <div>
            <p className="text-[11px] font-semibold text-[#888888] uppercase tracking-wider mb-3">Status</p>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setStatus(opt.value)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-medium border transition-colors duration-150 ${
                    status === opt.value
                      ? 'bg-[#111111] text-white border-[#111111]'
                      : 'bg-white text-[#444444] border-[#E0E0E0]'
                  }`}
                >
                  {status === opt.value && <Check size={12} strokeWidth={3} />}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <p className="text-[11px] font-semibold text-[#888888] uppercase tracking-wider mb-3">Category</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setCategory('all')}
                className={`flex items-center gap-2 px-3 py-2 rounded-2xl text-sm font-medium border transition-colors duration-150 ${
                  category === 'all'
                    ? 'bg-[#111111] text-white border-[#111111]'
                    : 'bg-white text-[#444444] border-[#E0E0E0]'
                }`}
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
                    className={`flex items-center gap-2 px-3 py-2 rounded-2xl text-sm font-medium border transition-colors duration-150 ${
                      active
                        ? 'bg-[#111111] text-white border-[#111111]'
                        : 'bg-white text-[#444444] border-[#E0E0E0]'
                    }`}
                  >
                    <Icon size={13} strokeWidth={2} />
                    {cat.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-5 py-4 border-t border-[#F0F0F0]" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
          <button
            onClick={reset}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold text-[#444444] bg-[#F5F5F5] transition-colors active:bg-[#ECECEC]"
          >
            Reset
          </button>
          <button
            onClick={apply}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white bg-[#111111] transition-colors active:bg-[#333333]"
          >
            Apply
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Main view ─────────────────────────────────────────────────────────────
interface SubscriptionsViewProps {
  subscriptions: SubscriptionWithCosts[]
  allCount: number
  stats: DashboardStats
  currentStatus: string
  currentCategory: string
}

const STACK_OVERLAP = 20 // px overlap between cards

export default function SubscriptionsView({
  subscriptions,
  allCount,
  stats,
  currentStatus,
  currentCategory,
}: SubscriptionsViewProps) {
  const [filterOpen, setFilterOpen] = useState(false)
  const hasActiveFilters = (currentStatus && currentStatus !== 'all') || (currentCategory && currentCategory !== 'all')

  return (
    <>
      <div className="space-y-5">
        {/* ── Header ───────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <h1 className="text-[28px] font-bold text-[#111111] tracking-tight">Subscriptions</h1>

          {/* Filter button — small rounded square */}
          <button
            onClick={() => setFilterOpen(true)}
            className="relative w-10 h-10 rounded-2xl bg-white flex items-center justify-center transition-colors active:bg-[#F0F0F0]"
            style={{ border: '1.5px solid #E0E0E0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
          >
            <SlidersHorizontal size={17} strokeWidth={2} className="text-[#333333]" />
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#111111] border-2 border-white" />
            )}
          </button>
        </div>

        {/* ── Summary cards ────────────────────────────────────── */}
        {allCount > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-[20px] p-4" style={{ border: '1.5px solid #E8E8E8' }}>
              <p className="text-[13px] text-[#999999] font-medium">Total</p>
              <p className="text-[18px] font-bold text-[#111111] mt-1 leading-tight tabular-nums">
                {allCount} Suscriptions
              </p>
            </div>
            <div className="bg-white rounded-[20px] p-4" style={{ border: '1.5px solid #E8E8E8' }}>
              <p className="text-[13px] text-[#999999] font-medium">Per month</p>
              <p className="text-[18px] font-bold text-[#111111] mt-1 leading-tight tabular-nums">
                {formatCurrency(stats.total_monthly_cost, 'EUR')}
              </p>
            </div>
          </div>
        )}

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            {currentStatus && currentStatus !== 'all' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#111111] text-white text-xs font-medium capitalize">
                {currentStatus}
              </span>
            )}
            {currentCategory && currentCategory !== 'all' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#111111] text-white text-xs font-medium capitalize">
                {currentCategory}
              </span>
            )}
          </div>
        )}

        {/* ── Wallet stacked card list ──────────────────────────── */}
        {subscriptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm font-medium text-[#111111] mb-1">
              {allCount === 0 ? 'No subscriptions yet' : 'No results'}
            </p>
            <p className="text-xs text-[#888888]">
              {allCount === 0 ? 'Tap + to get started.' : 'Try adjusting your filters.'}
            </p>
          </div>
        ) : (
          <div className="relative">
            {subscriptions.map((sub, i) => (
              <motion.div
                key={sub.id}
                style={{
                  marginTop: i === 0 ? 0 : -STACK_OVERLAP,
                  zIndex: subscriptions.length - i,
                  position: 'relative',
                }}
                initial={{ y: 70, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                  delay: i * 0.06,
                  duration: 0.42,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <WalletCard sub={sub} />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ── Filter bottom sheet ───────────────────────────────── */}
      <AnimatePresence>
        {filterOpen && (
          <FilterSheet
            currentStatus={currentStatus}
            currentCategory={currentCategory}
            onClose={() => setFilterOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
