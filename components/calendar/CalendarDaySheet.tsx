'use client'

import { useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import { useT, useLocale } from '@/lib/i18n/LocaleProvider'
import SubscriptionAvatar from '@/components/subscriptions/SubscriptionAvatar'
import { resolveSubscriptionLogoUrl } from '@/lib/constants/platforms'
import { formatCurrency } from '@/lib/utils/currency'
import type { SubscriptionWithCosts } from '@/types'

function daysUntilDate(year: number, month: number, day: number): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(year, month, day)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

interface Props {
  isOpen: boolean
  onClose: () => void
  day: number | null
  month: number
  year: number
  subscriptions: SubscriptionWithCosts[]
}

export default function CalendarDaySheet({
  isOpen,
  onClose,
  day,
  month,
  year,
  subscriptions,
}: Props) {
  const t = useT()
  const locale = useLocale()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      if (scrollRef.current) scrollRef.current.scrollTop = 0
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen || day === null) return null

  const dateLocale = locale === 'es' ? 'es-ES' : 'en-US'
  const dateLabel = new Date(year, month, day).toLocaleDateString(dateLocale, {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const dayTotal = subscriptions.reduce((sum, sub) => sum + sub.price_amount, 0)
  const currency = subscriptions[0]?.currency ?? 'EUR'

  const daysLeft = daysUntilDate(year, month, day)
  const daysLeftLabel =
    daysLeft === 0
      ? t('dashboard.dueToday')
      : daysLeft === 1
      ? t('dashboard.tomorrow')
      : daysLeft < 0
      ? locale === 'es' ? `Hace ${Math.abs(daysLeft)} días` : `${Math.abs(daysLeft)} days ago`
      : t('dashboard.inDays').replace('{days}', String(daysLeft))

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 animate-backdrop-in z-[58]"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1C1C1E] rounded-t-[28px] flex flex-col max-h-[80dvh] animate-slide-up z-[60]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex-shrink-0 flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-[#D4D4D4] dark:bg-[#3A3A3C] rounded-full" />
        </div>

        {/* Header */}
        <div className="flex-shrink-0 flex items-start justify-between px-5 pt-2 pb-4">
          <div>
            <p className="text-[17px] font-bold text-[#121212] dark:text-[#F2F2F7] capitalize">{dateLabel}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[13px] font-semibold text-[#3D3BF3] tabular-nums">
                {formatCurrency(dayTotal, currency)}
              </span>
              <span className="text-[13px] text-[#888888] dark:text-[#636366]">{t('calendar.total').toLowerCase()}</span>
              <span className="w-px h-3 bg-[#D4D4D4] dark:bg-[#3A3A3C]" />
              <span className="text-[13px] text-[#888888] dark:text-[#636366]">{daysLeftLabel}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-2xl bg-[#F5F5F5] dark:bg-[#2C2C2E] flex items-center justify-center text-[#666666] dark:text-[#AEAEB2] active:bg-[#EBEBEB] dark:active:bg-[#3A3A3C] transition-colors mt-0.5"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Subscription list */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 pb-8"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="space-y-2 pb-8">
            {subscriptions.map(sub => (
              <SubscriptionRow key={sub.id} sub={sub} year={year} month={month} day={day} locale={locale} t={t} />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

function SubscriptionRow({
  sub,
  year,
  month,
  day,
  locale,
  t,
}: {
  sub: SubscriptionWithCosts
  year: number
  month: number
  day: number
  locale: string
  t: (key: string) => string
}) {
  const dateLocale = locale === 'es' ? 'es-ES' : 'en-US'
  const dateLabel = new Date(year, month, day).toLocaleDateString(dateLocale, {
    day: 'numeric', month: 'short', year: 'numeric',
  })
  const daysLeft = daysUntilDate(year, month, day)
  const daysLeftLabel =
    daysLeft === 0
      ? t('dashboard.dueToday')
      : daysLeft === 1
      ? t('dashboard.tomorrow')
      : daysLeft < 0
      ? locale === 'es' ? `Hace ${Math.abs(daysLeft)} días` : `${Math.abs(daysLeft)} days ago`
      : t('dashboard.inDays').replace('{days}', String(daysLeft))

  return (
    <div className="flex items-center gap-3 bg-[#F7F8FA] dark:bg-[#232325] rounded-2xl px-3.5 py-3 border border-[#F0F0F0] dark:border-[#2C2C2E]">
      <SubscriptionAvatar
        name={sub.name}
        logoUrl={resolveSubscriptionLogoUrl(sub.name, sub.logo_url)}
        size="md"
        corner="rounded-[8px]"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#121212] dark:text-[#F2F2F7] truncate">{sub.name}</p>
        <p className="text-xs text-[#888888] dark:text-[#636366] mt-0.5">
          {daysLeftLabel}
          <span className="mx-1">·</span>
          {dateLabel}
        </p>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className="text-sm font-semibold text-[#121212] dark:text-[#F2F2F7] tabular-nums">
          {formatCurrency(sub.price_amount, sub.currency)}
        </p>
      </div>
    </div>
  )
}
