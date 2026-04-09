'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Calendar, Tag, Zap, Users,
  RefreshCw, CreditCard, PieChart, BellOff,
} from 'lucide-react'
import SubscriptionAvatar from './SubscriptionAvatar'
import SubscriptionForm from './SubscriptionForm'
import BottomSheet from '@/components/ui/BottomSheet'
import { resolveSubscriptionLogoUrl } from '@/lib/constants/platforms'
import { formatCurrency } from '@/lib/utils/currency'
import { formatRelativeDate } from '@/lib/utils/dates'
import { getCategoryMeta } from '@/lib/constants/categories'
import { useTheme } from '@/components/ui/ThemeProvider'
import { BILLING_PERIOD_LABELS } from '@/lib/constants/currencies'
import { useBrandTint } from '@/lib/hooks/useBrandTint'

const BILLING_PERIOD_LABELS_ES: Record<string, string> = {
  monthly: 'Mensual', yearly: 'Anual', quarterly: 'Trimestral',
  weekly: 'Semanal', custom: 'Personalizado',
}
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

const STATUS_CONFIG: Record<string, { color: string; bg: string; darkColor: string; darkBg: string }> = {
  active:    { color: '#16A34A', bg: '#F0FDF4', darkColor: '#4ADE80', darkBg: '#052E16' },
  trial:     { color: '#D97706', bg: '#FFFBEB', darkColor: '#FCD34D', darkBg: '#2D1F00' },
  paused:    { color: '#6B7280', bg: '#F9FAFB', darkColor: '#9CA3AF', darkBg: '#1F2937' },
  cancelled: { color: '#DC2626', bg: '#FEF2F2', darkColor: '#F87171', darkBg: '#2D0A0A' },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PlainCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#F7F8FA] dark:bg-[#232325] rounded-2xl border border-[#F0F0F0] dark:border-[#2C2C2E] overflow-hidden">
      {children}
    </div>
  )
}

function DetailRow({
  icon, label, value, last = false,
}: {
  icon: React.ReactNode; label: string; value: React.ReactNode; last?: boolean
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3.5 ${last ? '' : 'border-b border-[#EBEBEB] dark:border-[#2C2C2E]'}`}>
      <span className="text-[#C0C0C0] dark:text-[#8E8E93] flex-shrink-0">{icon}</span>
      <span className="text-sm text-[#737373] dark:text-[#AEAEB2] flex-1 leading-tight">{label}</span>
      <span className="text-sm font-medium text-[#121212] dark:text-[#F2F2F7] text-right leading-tight">{value}</span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  sub: SubscriptionWithCosts
  onClose: () => void
  isClosing?: boolean
}

export default function SubscriptionDetailOverlay({ sub, onClose }: Props) {
  const t = useT()
  const locale = useLocale()
  const [editOpen, setEditOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const logoUrl = resolveSubscriptionLogoUrl(sub.name, sub.logo_url)
  const brandTint = useBrandTint(logoUrl)

  // Lock body scroll. We use overflow:hidden (not position:fixed) so iOS
  // never enters the broken fixed-body scroll mode.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const billingProg = billingProgress(sub.next_billing_date, sub.billing_period, sub.billing_interval_count)
  const daysLeft = daysUntilBilling(sub.next_billing_date)
  const nextDateFormatted = formatShortDate(sub.next_billing_date, locale)
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const meta = getCategoryMeta(sub.category)
  const CategoryIcon = meta.icon
  const statusCfg = STATUS_CONFIG[sub.status] ?? STATUS_CONFIG.active
  const status = {
    color: isDark ? statusCfg.darkColor : statusCfg.color,
    bg:    isDark ? statusCfg.darkBg    : statusCfg.bg,
  }
  const billingLabel = (locale === 'es' ? BILLING_PERIOD_LABELS_ES : BILLING_PERIOD_LABELS)[sub.billing_period] ?? sub.billing_period

  const daysLabel =
    daysLeft === 0 ? t('dashboard.dueToday')
    : daysLeft === 1 ? t('dashboard.tomorrow')
    : t('dashboard.inDays').replace('{days}', String(daysLeft))

  /*
   * Layout follows the reference pattern:
   *   overlay  → position:fixed, full screen, display:flex, align-items:flex-end
   *   sheet    → child of overlay, NOT itself fixed — inherits the fixed context
   *
   * This is the layout iOS uses correctly:
   * - The overlay captures all touches → body never scrolls
   * - The sheet is a normal block child positioned at the bottom via flexbox
   * - The scroll container inside the sheet scrolls freely with no interference
   */
  const content = (
    <motion.div
      // Overlay — full screen fixed container, sheet sits at the bottom.
      // `bottom` is overridden to bleed into the iOS PWA bottom safe
      // area (see the canonical comment in components/ui/BottomSheet.tsx).
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 'calc(max(env(safe-area-inset-bottom), 34px) * -1)',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0)',
      }}
      initial={{ backgroundColor: 'rgba(0,0,0,0)' }}
      animate={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      exit={{ backgroundColor: 'rgba(0,0,0,0)' }}
      transition={{ duration: 0.25 }}
      onClick={onClose}
    >
      {/* Sheet — NOT position:fixed, just a flex child at the bottom */}
      <motion.div
        style={{
          width: '100%',
          borderRadius: '24px 24px 0 0',
          overflow: 'hidden',
          position: 'relative',
        }}
        className="bg-white dark:bg-[#1C1C1E]"
        initial={{ transform: 'translateY(100%)' }}
        animate={{ transform: 'translateY(0%)' }}
        exit={{ transform: 'translateY(100%)' }}
        transition={{ type: 'spring', stiffness: 340, damping: 32, mass: 0.85 }}
        onClick={(e) => e.stopPropagation()}   // don't close when tapping sheet
      >
        {/* Atmospheric brand tint — light mode */}
        <div aria-hidden className="dark:hidden" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 360, background: brandTint.gradientLight, opacity: 0.80, pointerEvents: 'none', zIndex: 0 }} />
        {/* Atmospheric brand tint — dark mode */}
        <div aria-hidden className="hidden dark:block" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 360, background: brandTint.gradientDark, opacity: 0.45, filter: 'blur(18px)', pointerEvents: 'none', zIndex: 0 }} />

        {/* Handle + fixed close button row */}
        <div style={{ position: 'relative', zIndex: 1, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 16px 12px' }}>
          <div className="w-10 h-1 bg-[#D4D4D4] dark:bg-[#3A3A3C] rounded-full" />
          <button
            onClick={onClose}
            style={{ position: 'absolute', top: 16, right: 16, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
            className="w-11 h-11 rounded-full bg-white/50 dark:bg-[#2C2C2E]/50 flex items-center justify-center text-black dark:text-white active:opacity-60 transition-opacity"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/*
         * Scroll container.
         * Uses explicit max-height (reference pattern) instead of flex-1/min-h-0
         * so iOS Safari always has an unambiguous, fixed scroll boundary.
         * -webkit-overflow-scrolling:touch re-enables momentum scroll on iOS.
         *
         * paddingBottom: env(safe-area-inset-bottom) compensates the bleed
         * applied to the outer overlay above, so the bottom of the scroll
         * content (the edit CTA) still lands above the home indicator.
         */}
        <div
          ref={scrollRef}
          style={{
            maxHeight: 'calc(92dvh - 44px)',   // 44px = handle + close button row
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
            paddingBottom: 'max(env(safe-area-inset-bottom), 34px)',
          }}
        >

          {/* Hero */}
          <div className="flex flex-col items-center text-center px-6 pb-5">
            <SubscriptionAvatar
              name={sub.name}
              logoUrl={resolveSubscriptionLogoUrl(sub.name, sub.logo_url)}
              size="xl"
              corner="rounded-[8px]"
            />
            <h1 className="text-[22px] font-bold text-[#121212] dark:text-[#F2F2F7] mt-4 mb-3 leading-tight">
              {sub.name}
            </h1>
            <div className="flex items-center flex-wrap justify-center gap-2">
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
            </div>
          </div>

          {/* Cards */}
          <div className="px-4 space-y-3 pb-10">
            {/* Cost */}
            <div className="bg-[#F7F8FA] dark:bg-[#232325] rounded-2xl border border-[#F0F0F0] dark:border-[#2C2C2E] p-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-[#121212] dark:text-[#F2F2F7] tabular-nums leading-none">
                    {formatCurrency(sub.my_monthly_cost, sub.currency)}
                  </p>
                  <p className="text-sm text-[#737373] dark:text-[#AEAEB2] mt-1">{t('detail.perMonth')}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-[#121212] dark:text-[#F2F2F7] tabular-nums">
                    {formatCurrency(sub.my_annual_cost, sub.currency)}
                  </p>
                  <p className="text-sm text-[#737373] dark:text-[#AEAEB2] mt-1">{t('detail.annually')}</p>
                </div>
              </div>
            </div>

            {/* Billing rows */}
            <PlainCard>
              {sub.next_billing_date && (
                <DetailRow
                  icon={<Calendar size={15} />}
                  label={t('detail.nextBilling')}
                  value={nextDateFormatted}
                />
              )}
              <DetailRow icon={<CreditCard size={15} />} label={t('detail.amount')} value={formatCurrency(sub.price_amount, sub.currency)} />
              <DetailRow icon={<RefreshCw size={15} />} label={t('detail.billingCycle')} value={billingLabel} last={!sub.is_shared} />
              {sub.is_shared && (
                <DetailRow icon={<Users size={15} />} label={t('detail.sharedWith')} value={`${sub.shared_with_count} ${t('detail.people')}`} />
              )}
              {sub.is_shared && (
                <DetailRow
                  icon={<PieChart size={15} />}
                  label={t('detail.nextBillingSection')}
                  value={`${formatCurrency(sub.my_monthly_cost, sub.currency)} / ${locale === 'es' ? 'mes' : 'mo'}`}
                  last
                />
              )}
            </PlainCard>

            {/* Progress block — only shown when next billing date is known */}
            {sub.next_billing_date && (
              <div className="bg-[#F7F8FA] dark:bg-[#232325] rounded-2xl border border-[#F0F0F0] dark:border-[#2C2C2E] px-4 py-4">
                <p className="text-[11px] font-semibold text-[#A0A0A0] dark:text-[#8E8E93] uppercase tracking-wider mb-3">
                  {t('detail.timeUntilNext')}
                </p>
                {/* Endpoints */}
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs text-[#A0A0A0] dark:text-[#8E8E93]">{t('detail.today')}</span>
                  <span className="text-xs text-[#A0A0A0] dark:text-[#8E8E93]">{nextDateFormatted}</span>
                </div>
                {/* Bar */}
                <div className="w-full rounded-full overflow-hidden" style={{ height: 5, background: 'rgba(0,0,0,0.07)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.round(billingProg * 100)}%`, background: '#22C55E' }}
                  />
                </div>
                {/* Countdown */}
                <p className="text-xs font-semibold text-[#121212] dark:text-[#F2F2F7] mt-2">{daysLabel}</p>
              </div>
            )}

            {/* Reminder — read only */}
            <PlainCard>
              <DetailRow
                icon={<BellOff size={15} />}
                label={t('detail.reminderLabel')}
                value={<span className="text-[#A0A0A0] dark:text-[#636366]">{t('detail.noReminder')}</span>}
                last
              />
            </PlainCard>

            {/* Organisation */}
            <PlainCard>
              <DetailRow
                icon={<Tag size={15} />}
                label={t('detail.category')}
                value={
                  <span className="flex items-center gap-1.5">
                    <CategoryIcon size={13} />
                    {t(`categories.${sub.category}` as Parameters<typeof t>[0])}
                  </span>
                }
                last={!sub.trial_end_date}
              />
              {sub.trial_end_date && (
                <DetailRow icon={<Zap size={15} />} label={t('detail.trialEnds')} value={formatRelativeDate(sub.trial_end_date)} last />
              )}
            </PlainCard>

            {/* Notes */}
            {sub.notes && (
              <div className="bg-[#F7F8FA] dark:bg-[#232325] rounded-2xl border border-[#F0F0F0] dark:border-[#2C2C2E] overflow-hidden">
                <div className="px-4 pt-3.5 pb-2.5">
                  <p className="text-[11px] font-semibold text-[#A0A0A0] dark:text-[#8E8E93] uppercase tracking-wider">{t('detail.notes')}</p>
                </div>
                <div className="border-t border-[#EBEBEB] dark:border-[#2C2C2E] px-4 py-4">
                  <p className="text-sm text-[#424242] dark:text-[#AEAEB2] whitespace-pre-wrap leading-relaxed">{sub.notes}</p>
                </div>
              </div>
            )}

            {/* CTA */}
            <div className="pb-4">
              <button
                onClick={() => setEditOpen(true)}
                className="w-full h-12 rounded-full bg-[#3D3BF3] text-white text-sm font-semibold active:opacity-80 transition-opacity"
              >
                {t('detail.edit')}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )

  const editPanel = (
    <BottomSheet isOpen={editOpen} onClose={() => setEditOpen(false)} height="full" zIndex={420}>
      <SubscriptionForm mode="edit" subscription={sub} onCancel={() => setEditOpen(false)} />
    </BottomSheet>
  )

  return typeof document !== 'undefined' ? createPortal(
    <>
      {content}
      {editPanel}
    </>,
    document.body
  ) : null
}
