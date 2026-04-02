'use client'

import { motion } from 'framer-motion'
import { X, TrendingDown, Copy, Users, Package } from 'lucide-react'
import { useT, useLocale } from '@/lib/i18n/LocaleProvider'
import { formatCurrency } from '@/lib/utils/currency'
import type { SavingsOpportunity } from '@/lib/calculations/savings'

// ─── Icon per opportunity type ────────────────────────────────────────────────

type IconConfig = { bg: string; icon: React.ReactNode }

function iconConfig(type: SavingsOpportunity['type']): IconConfig {
  switch (type) {
    case 'switch_to_yearly':
      return {
        bg: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)',
        icon: <TrendingDown size={26} strokeWidth={2} style={{ color: '#059669' }} />,
      }
    case 'duplicate_category':
      return {
        bg: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
        icon: <Copy size={26} strokeWidth={2} style={{ color: '#D97706' }} />,
      }
    case 'shared_plan':
      return {
        bg: 'linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%)',
        icon: <Users size={26} strokeWidth={2} style={{ color: '#2563EB' }} />,
      }
    case 'bundle':
      return {
        bg: 'linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%)',
        icon: <Package size={26} strokeWidth={2} style={{ color: '#7C3AED' }} />,
      }
  }
}

// ─── Build title + description strings ───────────────────────────────────────

function useOpportunityContent(
  opp: SavingsOpportunity,
  t: ReturnType<typeof useT>,
  locale: string
) {
  const monthlySaving = formatCurrency(opp.estimatedMonthlySaving, opp.currency, locale)
  const annualSaving  = formatCurrency(opp.estimatedMonthlySaving * 12, opp.currency, locale)

  switch (opp.type) {
    case 'switch_to_yearly': {
      const name = opp.subscriptionName ?? ''
      return {
        title: t('savings.switchToYearlyTitle').replace('{name}', name),
        desc:  t('savings.switchToYearlyDesc')
          .replace(/{name}/g, name)
          .replace('{amount}', monthlySaving)
          .replace('{annual}', annualSaving),
      }
    }
    case 'duplicate_category': {
      const catKey = `categories.${opp.category}` as Parameters<typeof t>[0]
      const catLabel = opp.category ? t(catKey) : ''
      const count = String(opp.subscriptionNames?.length ?? 2)
      return {
        title: t('savings.duplicateCategoryTitle').replace('{category}', catLabel),
        desc:  t('savings.duplicateCategoryDesc')
          .replace('{count}', count)
          .replace('{category}', catLabel.toLowerCase())
          .replace('{amount}', monthlySaving),
      }
    }
    case 'shared_plan': {
      const name = opp.subscriptionName ?? ''
      return {
        title: t('savings.sharedPlanTitle').replace('{name}', name),
        desc:  t('savings.sharedPlanDesc')
          .replace(/{name}/g, name)
          .replace('{amount}', monthlySaving),
      }
    }
    case 'bundle': {
      const names = (opp.subscriptionNames ?? []).join(' + ')
      return {
        title: t('savings.bundleTitle'),
        desc:  t('savings.bundleDesc')
          .replace('{names}', names)
          .replace('{amount}', monthlySaving),
      }
    }
  }
}

// ─── Card ─────────────────────────────────────────────────────────────────────

interface Props {
  opportunity: SavingsOpportunity
  onDismiss: () => void
}

export default function SavingsOpportunityCard({ opportunity, onDismiss }: Props) {
  const t      = useT()
  const locale = useLocale()
  const cfg    = iconConfig(opportunity.type)
  const { title, desc } = useOpportunityContent(opportunity, t, locale)

  return (
    <motion.div
      exit={{ height: 0 }}
      transition={{ duration: 0.42, ease: [0.4, 0, 0.2, 1] }}
      style={{ overflow: 'hidden' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        whileTap={{ scale: 0.98 }}
        className="relative flex items-center gap-4 bg-white dark:bg-[#1C1C1E] rounded-[20px] px-4 py-4 cursor-pointer"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}
        onClick={onDismiss}
      >
        {/* Icon */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: cfg.bg }}
        >
          {cfg.icon}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0 pr-6">
          <p className="text-[14px] font-bold text-[#121212] dark:text-[#F2F2F7] leading-snug">
            {title}
          </p>
          <p className="text-[13px] text-[#737373] dark:text-[#8E8E93] mt-0.5 leading-snug">
            {desc}
          </p>
        </div>

        {/* Close button */}
        <button
          onClick={e => { e.stopPropagation(); onDismiss() }}
          className="absolute top-2 right-2 w-11 h-11 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.06)' }}
          aria-label={t('common.close')}
        >
          <X size={13} strokeWidth={2.5} className="text-[#737373]" />
        </button>
      </motion.div>
    </motion.div>
  )
}
