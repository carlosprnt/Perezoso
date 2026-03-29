'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Calendar, Tag, Zap, Users } from 'lucide-react'
import SubscriptionAvatar from './SubscriptionAvatar'
import BottomSheet from '@/components/ui/BottomSheet'
import SubscriptionForm from './SubscriptionForm'
import { resolveSubscriptionLogoUrl } from '@/lib/constants/platforms'
import { formatCurrency } from '@/lib/utils/currency'
import { formatRelativeDate } from '@/lib/utils/dates'
import { getCategoryMeta } from '@/lib/constants/categories'
import { BILLING_PERIOD_LABELS } from '@/lib/constants/currencies'
import type { SubscriptionWithCosts } from '@/types'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  active:    { label: 'Active',    color: '#16A34A', bg: '#F0FDF4' },
  trial:     { label: 'Trial',     color: '#D97706', bg: '#FFFBEB' },
  paused:    { label: 'Paused',    color: '#6B7280', bg: '#F9FAFB' },
  cancelled: { label: 'Cancelled', color: '#DC2626', bg: '#FEF2F2' },
}

const SPRING = { type: 'spring' as const, stiffness: 340, damping: 32, mass: 0.85 }

interface Props {
  sub: SubscriptionWithCosts
  onClose: () => void
}

export default function SubscriptionDetailOverlay({ sub, onClose }: Props) {
  const [editOpen, setEditOpen] = useState(false)
  const meta = getCategoryMeta(sub.category)
  const CategoryIcon = meta.icon
  const status = STATUS_CONFIG[sub.status] ?? STATUS_CONFIG.active

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-[70] bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      />

      {/* Bottom sheet — layoutId animates from card to here */}
      <motion.div
        layoutId={`card-${sub.id}`}
        className="fixed bottom-0 left-0 right-0 z-[72] bg-white flex flex-col"
        style={{ borderRadius: '28px 28px 0 0', maxHeight: '92dvh' }}
        transition={{ layout: SPRING }}
      >
        {/* Handle bar */}
        <div className="flex-shrink-0 flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-[#D4D4D4] rounded-full" />
        </div>

        {/* Close button row */}
        <motion.div
          className="flex-shrink-0 flex justify-end px-5 pt-1 pb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 0.12, duration: 0.16 }}
        >
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-2xl bg-[#F5F5F5] flex items-center justify-center text-[#666666] active:bg-[#EBEBEB] transition-colors"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </motion.div>

        {/* Hero — logo + title + status directly on sheet background, no card */}
        <motion.div
          className="flex-shrink-0 flex flex-col items-center text-center px-6 pb-6"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 0.16, duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <SubscriptionAvatar
            name={sub.name}
            logoUrl={resolveSubscriptionLogoUrl(sub.name, sub.logo_url)}
            size="xl"
          />
          <h1 className="text-[22px] font-bold text-[#121212] mt-4 mb-2 leading-tight">
            {sub.name}
          </h1>
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
            style={{ color: status.color, backgroundColor: status.bg }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: status.color }} />
            {status.label}
            {sub.is_shared && (
              <span className="ml-1 flex items-center gap-1 opacity-70">
                · <Users size={11} /> {sub.shared_with_count}
              </span>
            )}
          </span>
        </motion.div>

        {/* Scrollable content */}
        <motion.div
          className="flex-1 overflow-y-auto overscroll-contain px-4 space-y-[8px] pb-28"
          style={{ WebkitOverflowScrolling: 'touch' }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 0.22, duration: 0.24, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {/* Cost breakdown */}
          <div className="bg-[#F7F8FA] rounded-2xl border border-[#F0F0F0] p-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-[#737373] mb-1">
                  {formatCurrency(sub.price_amount, sub.currency)} / {BILLING_PERIOD_LABELS[sub.billing_period]}
                </p>
                <p className="text-3xl font-bold text-[#121212] tabular-nums leading-none">
                  {formatCurrency(sub.my_monthly_cost, sub.currency)}
                </p>
                <p className="text-sm text-[#737373] mt-1">per month</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#737373] mb-0.5">Annually</p>
                <p className="text-lg font-semibold text-[#424242] tabular-nums">
                  {formatCurrency(sub.my_annual_cost, sub.currency)}
                </p>
              </div>
            </div>
          </div>

          {/* Detail rows */}
          <div className="bg-[#F7F8FA] rounded-2xl border border-[#F0F0F0] overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#EBEBEB]">
              <span className="text-[#B0B0B0] flex-shrink-0"><Tag size={15} /></span>
              <span className="text-sm text-[#737373] flex-1">Category</span>
              <span className="text-sm font-medium text-[#121212] flex items-center gap-1.5">
                <CategoryIcon size={13} />{meta.label}
              </span>
            </div>
            {sub.next_billing_date && (
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#EBEBEB] last:border-b-0">
                <span className="text-[#B0B0B0] flex-shrink-0"><Calendar size={15} /></span>
                <span className="text-sm text-[#737373] flex-1">Next billing</span>
                <span className="text-sm font-medium text-[#121212]">
                  {formatRelativeDate(sub.next_billing_date)}
                </span>
              </div>
            )}
            {sub.trial_end_date && (
              <div className="flex items-center gap-3 px-4 py-3.5 last:border-b-0">
                <span className="text-[#B0B0B0] flex-shrink-0"><Zap size={15} /></span>
                <span className="text-sm text-[#737373] flex-1">Trial ends</span>
                <span className="text-sm font-medium text-[#121212]">
                  {formatRelativeDate(sub.trial_end_date)}
                </span>
              </div>
            )}
          </div>

          {/* Notes */}
          {sub.notes && (
            <div className="bg-[#F7F8FA] rounded-2xl border border-[#F0F0F0] p-4">
              <p className="text-xs font-medium text-[#737373] mb-2">Notes</p>
              <p className="text-sm text-[#424242] whitespace-pre-wrap leading-relaxed">{sub.notes}</p>
            </div>
          )}
        </motion.div>

        {/* Fixed CTA at bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 bg-white border-t border-[#F0F0F0] px-4 pt-3"
          style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
        >
          <button
            onClick={() => setEditOpen(true)}
            className="w-full h-12 rounded-[10px] bg-[#3D3BF3] text-white text-sm font-semibold hover:bg-[#3230D0] active:bg-[#2B29B8] transition-colors"
          >
            Edit subscription
          </button>
        </div>
      </motion.div>

      {/* Edit sheet — z-index above the detail overlay */}
      <BottomSheet
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit subscription"
        height="full"
        zIndex={80}
      >
        <SubscriptionForm
          mode="edit"
          subscription={sub}
          onCancel={() => setEditOpen(false)}
        />
      </BottomSheet>
    </>
  )
}
