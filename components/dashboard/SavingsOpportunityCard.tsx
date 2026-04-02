'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Bell } from 'lucide-react'
import { TrendingDown, Copy, Users, Package } from 'lucide-react'
import SubscriptionAvatar from '@/components/subscriptions/SubscriptionAvatar'
import { resolveSubscriptionLogoUrl } from '@/lib/constants/platforms'
import { formatCurrency } from '@/lib/utils/currency'
import { useT, useLocale } from '@/lib/i18n/LocaleProvider'
import type { SavingsOpportunity } from '@/lib/calculations/savings'

// ─── Animated bell ────────────────────────────────────────────────────────────

function RingingBell() {
  const [ringing, setRinging] = useState(false)
  const stopRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const trigger = () => {
      setRinging(true)
      stopRef.current = setTimeout(() => setRinging(false), 900)
    }
    trigger()
    const interval = setInterval(trigger, 3000)
    return () => { clearInterval(interval); if (stopRef.current) clearTimeout(stopRef.current) }
  }, [])

  return (
    <div
      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: 'linear-gradient(135deg,#E8E6FF,#D4CFFF)' }}
    >
      <Bell
        size={20} strokeWidth={2} className="text-[#3D3BF3]"
        style={{ transformOrigin: 'top center', animation: ringing ? 'bell-ring 0.9s ease-in-out forwards' : 'none' }}
      />
    </div>
  )
}

// ─── Savings icon ─────────────────────────────────────────────────────────────

function SavingsIcon({ type }: { type: SavingsOpportunity['type'] }) {
  const cfg = {
    switch_to_yearly:   { bg: 'linear-gradient(135deg,#D1FAE5,#A7F3D0)', icon: <TrendingDown size={20} strokeWidth={2} style={{ color: '#059669' }} /> },
    duplicate_category: { bg: 'linear-gradient(135deg,#FEF3C7,#FDE68A)', icon: <Copy         size={20} strokeWidth={2} style={{ color: '#D97706' }} /> },
    shared_plan:        { bg: 'linear-gradient(135deg,#DBEAFE,#BFDBFE)', icon: <Users        size={20} strokeWidth={2} style={{ color: '#2563EB' }} /> },
    bundle:             { bg: 'linear-gradient(135deg,#EDE9FE,#DDD6FE)', icon: <Package      size={20} strokeWidth={2} style={{ color: '#7C3AED' }} /> },
  }[type]

  return (
    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: cfg.bg }}>
      {cfg.icon}
    </div>
  )
}

// ─── Content helpers ──────────────────────────────────────────────────────────

function useSavingsContent(opp: SavingsOpportunity) {
  const t      = useT()
  const locale = useLocale()
  const saving = formatCurrency(opp.estimatedMonthlySaving, opp.currency, locale)

  switch (opp.type) {
    case 'switch_to_yearly': {
      const name = opp.subscriptionName ?? ''
      return { title: t('savings.switchToYearlyTitle').replace('{name}', name), desc: t('savings.cardSave').replace('{amount}', saving), logoUrl: resolveSubscriptionLogoUrl(name, opp.subscriptionLogoUrl ?? null) }
    }
    case 'duplicate_category': {
      const catKey = `categories.${opp.category}` as Parameters<typeof t>[0]
      return { title: t('savings.duplicateCategoryTitle').replace('{category}', t(catKey)), desc: t('savings.cardSave').replace('{amount}', saving), logoUrl: null }
    }
    case 'shared_plan': {
      const name = opp.subscriptionName ?? ''
      return { title: t('savings.sharedPlanTitle').replace('{name}', name), desc: t('savings.cardSave').replace('{amount}', saving), logoUrl: resolveSubscriptionLogoUrl(name, opp.subscriptionLogoUrl ?? null) }
    }
    case 'bundle':
      return { title: t('savings.bundleTitle'), desc: t('savings.cardSave').replace('{amount}', saving), logoUrl: null }
  }
}

// ─── Shared card shell ────────────────────────────────────────────────────────

function CardShell({
  icon,
  title,
  desc,
  onMainTap,
  onDismiss,
  closeLabel,
  inModal = false,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  onMainTap: () => void
  onDismiss: () => void
  closeLabel: string
  inModal?: boolean
}) {
  return (
    <div
      className={`relative w-full flex items-center gap-3.5 rounded-[20px] px-4 py-4 cursor-pointer active:scale-[0.98] transition-transform select-none ${
        inModal
          ? 'bg-[#F2F2F7] dark:bg-[#2C2C2E]'
          : 'bg-white dark:bg-[#1C1C1E]'
      }`}
      style={inModal ? undefined : { boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}
      onClick={onMainTap}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onMainTap()}
    >
      {icon}

      <div className={`flex-1 min-w-0 ${inModal ? '' : 'pr-6'}`}>
        <p className="text-[14px] font-bold text-[#121212] dark:text-[#F2F2F7] leading-snug truncate">{title}</p>
        <p className="text-[13px] text-[#737373] dark:text-[#8E8E93] mt-0.5 leading-snug line-clamp-2">{desc}</p>
      </div>

      {/* Small X — only outside the modal */}
      {!inModal && (
        <button
          onClick={e => { e.stopPropagation(); onDismiss() }}
          className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.06)' }}
          aria-label={closeLabel}
        >
          <X size={11} strokeWidth={2.5} className="text-[#737373] dark:text-[#8E8E93]" />
        </button>
      )}
    </div>
  )
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export type InsightCardProps =
  | { kind: 'reminder';  onActivate: () => void; onDismiss: () => void; inModal?: boolean }
  | { kind: 'savings';   opportunity: SavingsOpportunity; onTap: () => void; onDismiss: () => void; inModal?: boolean }

export default function InsightCard(props: InsightCardProps) {
  const t = useT()

  if (props.kind === 'reminder') {
    return (
      <CardShell
        icon={<RingingBell />}
        title={t('reminder.cardTitle')}
        desc={t('reminder.cardDesc')}
        onMainTap={props.onActivate}
        onDismiss={props.onDismiss}
        closeLabel={t('common.close')}
        inModal={props.inModal}
      />
    )
  }

  return <SavingsInsightCard {...props} />
}

function SavingsInsightCard({ opportunity, onTap, onDismiss, inModal }: Extract<InsightCardProps, { kind: 'savings' }>) {
  const t                        = useT()
  const { title, desc, logoUrl } = useSavingsContent(opportunity)
  const showLogo = !!logoUrl && (opportunity.type === 'switch_to_yearly' || opportunity.type === 'shared_plan')

  return (
    <CardShell
      icon={
        showLogo
          ? <SubscriptionAvatar name={opportunity.subscriptionName ?? ''} logoUrl={logoUrl} size="md" corner="rounded-[10px]" />
          : <SavingsIcon type={opportunity.type} />
      }
      title={title}
      desc={desc}
      onMainTap={onTap}
      onDismiss={onDismiss}
      closeLabel={t('common.close')}
      inModal={inModal}
    />
  )
}
