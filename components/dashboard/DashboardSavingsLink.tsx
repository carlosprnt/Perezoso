'use client'

import { useState, useMemo } from 'react'
import { TrendingDown, ChevronRight } from 'lucide-react'
import { detectSavingsOpportunities, countAnnualRenewalsWithoutReminder } from '@/lib/calculations/savings'
import InsightAllSheet from './InsightAllSheet'
import SavingsDetailSheet from './SavingsDetailSheet'
import { useT } from '@/lib/i18n/LocaleProvider'
import type { CarouselItem } from './SavingsCarousel'
import type { SavingsOpportunity } from '@/lib/calculations/savings'
import type { SubscriptionWithCosts } from '@/types'

export default function DashboardSavingsLink({ subscriptions }: { subscriptions: SubscriptionWithCosts[] }) {
  const t = useT()
  const [showAll,   setShowAll]   = useState(false)
  const [detail,    setDetail]    = useState<SavingsOpportunity | null>(null)
  const [dismissed, setDismissed] = useState<Set<number>>(new Set())

  const opportunities = useMemo(() => detectSavingsOpportunities(subscriptions), [subscriptions])
  const annualCount   = useMemo(() => countAnnualRenewalsWithoutReminder(subscriptions), [subscriptions])

  const items = useMemo<CarouselItem[]>(() => {
    const list: CarouselItem[] = []
    if (annualCount > 0) list.push({ kind: 'reminder', annualCount })
    list.push(...opportunities.map(opp => ({ kind: 'savings' as const, opportunity: opp })))
    return list
  }, [opportunities, annualCount])

  const activeCount = items.filter((_, i) => !dismissed.has(i)).length
  if (activeCount === 0) return null

  return (
    <>
      <button
        onClick={() => setShowAll(true)}
        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-[20px] bg-white dark:bg-[#1C1C1E] active:opacity-75 transition-opacity text-left"
        style={{ boxShadow: '0 1px 5px rgba(0,0,0,0.06)' }}
      >
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#D1FAE5,#A7F3D0)' }}
        >
          <TrendingDown size={18} strokeWidth={2.5} style={{ color: '#059669' }} />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-[#121212] dark:text-[#F2F2F7]">
            {t('savings.allTitle')}
          </p>
          <p className="text-[12px] text-[#8E8E93] mt-0.5">
            {t('savings.viewAllDesc').replace('{count}', String(activeCount))}
          </p>
        </div>

        {/* Badge + arrow */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[12px] font-bold text-white bg-[#3D3BF3] rounded-full px-2 py-0.5 min-w-[22px] text-center">
            {activeCount}
          </span>
          <ChevronRight size={16} strokeWidth={2} className="text-[#C7C7CC] dark:text-[#48484A]" />
        </div>
      </button>

      <InsightAllSheet
        isOpen={showAll}
        onClose={() => setShowAll(false)}
        items={items}
        dismissed={dismissed}
        onDismiss={i => setDismissed(prev => new Set(prev).add(i))}
        onDetail={opp => { setDetail(opp); setShowAll(false) }}
        onActivate={() => setShowAll(false)}
      />

      <SavingsDetailSheet opportunity={detail} onClose={() => setDetail(null)} />
    </>
  )
}
