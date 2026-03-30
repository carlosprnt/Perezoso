'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, Tag, Zap, Users } from 'lucide-react'
import SubscriptionAvatar from './SubscriptionAvatar'
import BottomSheet from '@/components/ui/BottomSheet'
import { resolveSubscriptionLogoUrl } from '@/lib/constants/platforms'
import SubscriptionForm from './SubscriptionForm'
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

interface SubscriptionDetailProps {
  subscription: SubscriptionWithCosts
}

export default function SubscriptionDetail({ subscription: sub }: SubscriptionDetailProps) {
  const t = useT()
  const locale = useLocale()
  const [editOpen, setEditOpen] = useState(false)

  const billingProg = billingProgress(sub.next_billing_date, sub.billing_period, sub.billing_interval_count)
  const daysLeft = daysUntilBilling(sub.next_billing_date)
  const nextDateFormatted = formatShortDate(sub.next_billing_date, locale)
  const router = useRouter()
  const meta = getCategoryMeta(sub.category)
  const CategoryIcon = meta.icon
  const status = STATUS_CONFIG[sub.status] ?? STATUS_CONFIG.active

  return (
    <>
      <div className="min-h-screen bg-[#F7F8FA] -mx-4 sm:-mx-6 px-4 sm:px-6 pb-28">

        {/* Back button */}
        <div
          className="flex items-center pb-4 bg-[#F7F8FA]"
          style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}
        >
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-white border border-[#E5E5E5] active:border-[#D4D4D4] transition-colors"
          >
            <ArrowLeft size={17} className="text-[#121212]" />
          </button>
        </div>

        {/* Hero — logo + title + status directly on background, no card */}
        <div className="flex flex-col items-center text-center pb-6">
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
        </div>

        {/* Content cards */}
        <div className="space-y-[8px]">
          {/* Cost breakdown */}
          <div className="bg-white rounded-2xl border border-[#E8E8E8] p-4">
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
          <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden">
            <DetailRow
              icon={<Tag size={15} />}
              label={t('detail.category')}
              value={
                <span className="flex items-center gap-1.5">
                  <CategoryIcon size={13} />{t(`categories.${sub.category}` as Parameters<typeof t>[0])}
                </span>
              }
            />
            {sub.next_billing_date && (
              <DetailRow
                icon={<Calendar size={15} />}
                label={t('detail.nextBilling')}
                value={formatRelativeDate(sub.next_billing_date)}
              />
            )}
            {sub.trial_end_date && (
              <DetailRow
                icon={<Zap size={15} />}
                label={t('detail.trialEnds')}
                value={formatRelativeDate(sub.trial_end_date)}
              />
            )}
          </div>

          {/* Notes */}
          {sub.notes && (
            <div className="bg-white rounded-2xl border border-[#E8E8E8] p-4">
              <p className="text-xs font-medium text-[#737373] mb-2">{t('detail.notes')}</p>
              <p className="text-sm text-[#424242] whitespace-pre-wrap leading-relaxed">{sub.notes}</p>
            </div>
          )}

          {/* Próximo cobro — billing timeline */}
          {sub.next_billing_date && (
            <div className="bg-white rounded-2xl border border-[#E8E8E8] p-4" style={{ marginTop: 20 }}>
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
        </div>
      </div>

      {/* Fixed CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#F0F0F0] px-4 pt-3 z-10"
        style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={() => setEditOpen(true)}
          className="w-full h-12 rounded-[10px] bg-[#3D3BF3] text-white text-sm font-semibold hover:bg-[#3230D0] active:bg-[#2B29B8] transition-colors"
        >
          {t('detail.edit')}
        </button>
      </div>

      {/* Edit bottom sheet */}
      <BottomSheet
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title={t('sheets.editSubscription')}
        height="full"
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

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#F0F0F0] last:border-b-0">
      <span className="text-[#B0B0B0] flex-shrink-0">{icon}</span>
      <span className="text-sm text-[#737373] flex-1">{label}</span>
      <span className="text-sm font-medium text-[#121212]">{value}</span>
    </div>
  )
}
