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
import { useT, useLocale } from '@/lib/i18n/LocaleProvider'
import type { SubscriptionWithCosts } from '@/types'

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

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  active:    { color: '#16A34A', bg: '#F0FDF4' },
  trial:     { color: '#D97706', bg: '#FFFBEB' },
  paused:    { color: '#6B7280', bg: '#F9FAFB' },
  cancelled: { color: '#DC2626', bg: '#FEF2F2' },
}

const SPRING = { type: 'spring' as const, stiffness: 340, damping: 32, mass: 0.85 }

interface Props {
  sub: SubscriptionWithCosts
  onClose: () => void
  /** When true, layoutId is disconnected so the exit uses a clean slide-down
   *  instead of trying to morph back to the (possibly off-screen) card. */
  isClosing?: boolean
}

export default function SubscriptionDetailOverlay({ sub, onClose, isClosing }: Props) {
  const t = useT()
  const locale = useLocale()
  const [editOpen, setEditOpen] = useState(false)

  const billingProg = billingProgress(sub.next_billing_date, sub.billing_period, sub.billing_interval_count)
  const daysLeft = daysUntilBilling(sub.next_billing_date)
  const nextDateFormatted = formatShortDate(sub.next_billing_date, locale)
  const meta = getCategoryMeta(sub.category)
  const CategoryIcon = meta.icon
  const status = STATUS_CONFIG[sub.status] ?? STATUS_CONFIG.active

  return (
    <>
      {/* Backdrop — exits in sync with the sheet slide-down */}
      <motion.div
        className="fixed inset-0 z-[70] bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.32 }}
        onClick={onClose}
      />

      {/* Bottom sheet.
          Open:  layoutId active  → card morphs into sheet (App Store style).
          Close: layoutId removed → clean spring slide-down, no layout return. */}
      <motion.div
        layoutId={isClosing ? undefined : `card-${sub.id}`}
        className="fixed bottom-0 left-0 right-0 z-[72] bg-white flex flex-col"
        style={{ borderRadius: '28px 28px 0 0', maxHeight: '92dvh' }}
        animate={{ y: 0 }}
        exit={{ y: '100%', transition: { type: 'spring', stiffness: 320, damping: 34, mass: 0.9 } }}
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
            {t(`status.${sub.status}` as Parameters<typeof t>[0])}
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
                <p className="text-sm text-[#737373] mt-1">{t('detail.perMonth')}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#737373] mb-0.5">{t('detail.annually')}</p>
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
              <span className="text-sm text-[#737373] flex-1">{t('detail.category')}</span>
              <span className="text-sm font-medium text-[#121212] flex items-center gap-1.5">
                <CategoryIcon size={13} />{t(`categories.${sub.category}` as Parameters<typeof t>[0])}
              </span>
            </div>
            {sub.next_billing_date && (
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#EBEBEB] last:border-b-0">
                <span className="text-[#B0B0B0] flex-shrink-0"><Calendar size={15} /></span>
                <span className="text-sm text-[#737373] flex-1">{t('detail.nextBilling')}</span>
                <span className="text-sm font-medium text-[#121212]">
                  {formatRelativeDate(sub.next_billing_date)}
                </span>
              </div>
            )}
            {sub.trial_end_date && (
              <div className="flex items-center gap-3 px-4 py-3.5 last:border-b-0">
                <span className="text-[#B0B0B0] flex-shrink-0"><Zap size={15} /></span>
                <span className="text-sm text-[#737373] flex-1">{t('detail.trialEnds')}</span>
                <span className="text-sm font-medium text-[#121212]">
                  {formatRelativeDate(sub.trial_end_date)}
                </span>
              </div>
            )}
          </div>

          {/* Notes */}
          {sub.notes && (
            <div className="bg-[#F7F8FA] rounded-2xl border border-[#F0F0F0] p-4">
              <p className="text-xs font-medium text-[#737373] mb-2">{t('detail.notes')}</p>
              <p className="text-sm text-[#424242] whitespace-pre-wrap leading-relaxed">{sub.notes}</p>
            </div>
          )}

          {/* Próximo cobro — billing timeline */}
          {sub.next_billing_date && (
            <div
              className="bg-[#F7F8FA] rounded-2xl border border-[#F0F0F0] p-4"
              style={{ marginTop: 20 }}
            >
              <p className="text-[11px] font-semibold text-[#888888] uppercase tracking-wider mb-3">
                {t('detail.nextBillingSection')}
              </p>
              <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: 'rgba(0,0,0,0.07)' }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.round(billingProg * 100)}%`, background: '#22C55E' }}
                />
              </div>
              <div className="flex justify-between items-center mt-2.5">
                <span className="text-sm font-semibold text-[#121212]">
                  {daysLeft === 0
                    ? t('dashboard.dueToday')
                    : daysLeft === 1
                    ? t('dashboard.tomorrow')
                    : t('dashboard.inDays').replace('{days}', String(daysLeft))}
                </span>
                <span className="text-sm text-[#737373]">{nextDateFormatted}</span>
              </div>
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
            {t('detail.edit')}
          </button>
        </div>
      </motion.div>

      {/* Edit sheet — z-index above the detail overlay */}
      <BottomSheet
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title={t('sheets.editSubscription')}
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
