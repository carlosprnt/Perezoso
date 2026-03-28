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
      {/* Dim backdrop — NOT part of layoutId, fades independently */}
      <motion.div
        className="fixed inset-0 z-[70] bg-black/30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        onClick={onClose}
      />

      {/* Expanding card — same layoutId as the WalletCard in the list */}
      <motion.div
        layoutId={`card-${sub.id}`}
        className="fixed inset-0 z-[72] bg-[#F7F8FA] overflow-hidden"
        style={{ borderRadius: 0 }}
        transition={{ layout: SPRING }}
      >
        <div className="h-full overflow-y-auto overscroll-none">
          <div
            className="px-4 sm:px-6 pb-16"
            style={{ paddingTop: 'max(20px, env(safe-area-inset-top))' }}
          >
            {/* Close button */}
            <motion.div
              className="flex items-center pt-1 pb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.14, duration: 0.18 }}
            >
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-white border border-[#E5E5E5] hover:border-[#D4D4D4] transition-colors"
              >
                <X size={17} className="text-[#121212]" />
              </button>
            </motion.div>

            {/* Hero card */}
            <motion.div
              className="mb-2 bg-white rounded-2xl border border-[#E8E8E8] p-6 flex flex-col items-center text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.18, duration: 0.24, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <SubscriptionAvatar
                name={sub.name}
                logoUrl={resolveSubscriptionLogoUrl(sub.name, sub.logo_url)}
                size="xl"
              />
              <h1 className="text-xl font-bold text-[#121212] mt-4 mb-2 leading-tight">
                {sub.name}
              </h1>
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                style={{ color: status.color, backgroundColor: status.bg }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: status.color }}
                />
                {status.label}
                {sub.is_shared && (
                  <span className="ml-1 flex items-center gap-1 opacity-70">
                    · <Users size={11} /> {sub.shared_with_count}
                  </span>
                )}
              </span>
            </motion.div>

            {/* Body */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.26, duration: 0.26, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {/* Cost breakdown */}
              <div className="mb-2 bg-white rounded-2xl border border-[#E8E8E8] p-4">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs text-[#616161] mb-1">
                      {formatCurrency(sub.price_amount, sub.currency)} /{' '}
                      {BILLING_PERIOD_LABELS[sub.billing_period]}
                    </p>
                    <p className="text-3xl font-bold text-[#121212] tabular-nums leading-none">
                      {formatCurrency(sub.my_monthly_cost, sub.currency)}
                    </p>
                    <p className="text-sm text-[#616161] mt-1">per month</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#A3A3A3] mb-0.5">Annually</p>
                    <p className="text-lg font-semibold text-[#424242] tabular-nums">
                      {formatCurrency(sub.my_annual_cost, sub.currency)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Detail rows */}
              <div className="mb-2 bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#F0F0F0]">
                  <span className="text-[#B0B0B0] flex-shrink-0"><Tag size={15} /></span>
                  <span className="text-sm text-[#616161] flex-1">Category</span>
                  <span className="text-sm font-medium text-[#121212] flex items-center gap-1.5">
                    <CategoryIcon size={13} />{meta.label}
                  </span>
                </div>
                {sub.next_billing_date && (
                  <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#F0F0F0] last:border-b-0">
                    <span className="text-[#B0B0B0] flex-shrink-0"><Calendar size={15} /></span>
                    <span className="text-sm text-[#616161] flex-1">Next billing</span>
                    <span className="text-sm font-medium text-[#121212]">
                      {formatRelativeDate(sub.next_billing_date)}
                    </span>
                  </div>
                )}
                {sub.trial_end_date && (
                  <div className="flex items-center gap-3 px-4 py-3.5 last:border-b-0">
                    <span className="text-[#B0B0B0] flex-shrink-0"><Zap size={15} /></span>
                    <span className="text-sm text-[#616161] flex-1">Trial ends</span>
                    <span className="text-sm font-medium text-[#121212]">
                      {formatRelativeDate(sub.trial_end_date)}
                    </span>
                  </div>
                )}
              </div>

              {/* Notes */}
              {sub.notes && (
                <div className="mb-2 bg-white rounded-2xl border border-[#E8E8E8] p-4">
                  <p className="text-xs font-medium text-[#A3A3A3] uppercase tracking-wide mb-2">Notes</p>
                  <p className="text-sm text-[#424242] whitespace-pre-wrap leading-relaxed">{sub.notes}</p>
                </div>
              )}

              {/* CTA */}
              <div className="pb-12 mt-2">
                <button
                  onClick={() => setEditOpen(true)}
                  className="w-full h-12 rounded-[10px] bg-[#3D3BF3] text-white text-sm font-medium hover:bg-[#3230D0] active:bg-[#2B29B8] transition-colors pressable"
                >
                  Edit subscription
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Edit BottomSheet — sibling outside layoutId div, so fixed positioning works */}
      <BottomSheet
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit subscription"
        height="tall"
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
