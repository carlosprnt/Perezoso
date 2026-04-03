'use client'

import BottomSheet from '@/components/ui/BottomSheet'
import InsightCard from './SavingsOpportunityCard'
import { useT } from '@/lib/i18n/LocaleProvider'
import type { CarouselItem } from './SavingsCarousel'
import type { SavingsOpportunity } from '@/lib/calculations/savings'

interface Props {
  isOpen: boolean
  onClose: () => void
  items: CarouselItem[]
  onDetail: (opp: SavingsOpportunity) => void
  onActivate: () => void
}

export default function InsightAllSheet({
  isOpen, onClose, items, onDetail, onActivate,
}: Props) {
  const t = useT()

  function handleActivate() {
    onActivate()
    onClose()
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={t('savings.allTitle')} height="tall" zIndex={300}>
      <div className="px-5 pt-2 pb-8 space-y-3">
        {items.length === 0 ? (
          <p className="text-center text-[14px] text-[#8E8E93] py-10">{t('savings.allEmpty')}</p>
        ) : (
          items.map((item, i) => {
            if (item.kind === 'reminder') {
              return (
                <InsightCard key={i} kind="reminder" inModal
                  annualCount={item.annualCount}
                  onActivate={handleActivate} />
              )
            }
            return (
              <InsightCard key={i} kind="savings" inModal
                opportunity={item.opportunity}
                onTap={() => { onDetail(item.opportunity); onClose() }} />
            )
          })
        )}
      </div>
    </BottomSheet>
  )
}
