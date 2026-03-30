'use client'

import { useState } from 'react'
import { useT, useLocale } from '@/lib/i18n/LocaleProvider'
import SubscriptionAvatar from '@/components/subscriptions/SubscriptionAvatar'
import { formatCurrency } from '@/lib/utils/currency'
import { resolveSubscriptionLogoUrl } from '@/lib/constants/platforms'
import type { UpcomingRenewal } from '@/types'

const PAGE_SIZE = 3

interface Props {
  renewals: UpcomingRenewal[]
}

export default function UpcomingRenewals({ renewals }: Props) {
  const t = useT()
  const locale = useLocale()
  const [visible, setVisible] = useState(PAGE_SIZE)

  if (renewals.length === 0) {
    return <p className="text-sm text-[#737373] py-2">{t('dashboard.noUpcoming')}</p>
  }

  const shown = renewals.slice(0, visible)
  const remaining = Math.min(PAGE_SIZE, renewals.length - visible)

  function daysLabel(days: number): string {
    if (days === 0) return t('dashboard.dueToday')
    if (days === 1) return locale === 'es' ? '1 día' : '1 day'
    return t('dashboard.days').replace('{count}', String(days))
  }

  function daysColor(_days: number): string {
    return 'text-[#737373] dark:text-[#AEAEB2]'
  }

  return (
    <div>
      <div className="space-y-3.5">
        {shown.map((r) => (
          <div key={r.subscription.id} className="flex items-center gap-3">
            <SubscriptionAvatar
              name={r.subscription.name}
              logoUrl={resolveSubscriptionLogoUrl(r.subscription.name, r.subscription.logo_url)}
              size="sm"
              corner="rounded-[8px]"
            />
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-[#121212] dark:text-[#F2F2F7] truncate leading-snug">
                {r.subscription.name}
              </p>
              <p className="text-[12px] text-[#737373] dark:text-[#636366] mt-0.5">
                {formatCurrency(r.subscription.my_monthly_cost, r.subscription.currency)}
                {' '}{t('dashboard.perMonth')}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className={`text-[14px] font-medium tabular-nums ${daysColor(r.days_until)}`}>
                {daysLabel(r.days_until)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {remaining > 0 && (
        <button
          onClick={() => setVisible((v) => v + PAGE_SIZE)}
          className="w-full text-center text-[13px] font-medium text-[#3D3BF3] pt-3 mt-3 border-t border-[#F5F5F5] dark:border-[#2C2C2E] active:opacity-70 transition-opacity"
        >
          {t('dashboard.showMore').replace('{count}', String(remaining))}
        </button>
      )}
    </div>
  )
}
