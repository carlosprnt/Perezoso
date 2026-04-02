'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, TrendingDown, Copy, Users, Package } from 'lucide-react'
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

// ─── Copy helpers ─────────────────────────────────────────────────────────────

function useReminderContent(annualCount: number) {
  const t = useT()
  const title = annualCount === 1
    ? t('reminder.cardTitleOne')
    : t('reminder.cardTitle')
        .replace('{count}', String(annualCount))
        .replace('{plural}', 'es')
  return { title, desc: t('reminder.cardDesc'), cta: t('savings.cta') }
}

function useSavingsContent(opp: SavingsOpportunity) {
  const t      = useT()
  const locale = useLocale()
  const amount = formatCurrency(opp.estimatedMonthlySaving, opp.currency, locale)

  switch (opp.type) {
    case 'switch_to_yearly': {
      const name = opp.subscriptionName ?? ''
      const pct  = opp.savingPct ?? 17
      return {
        title:   t('savings.switchToYearlyTitle').replace('{name}', name),
        desc:    t('savings.switchToYearlyDesc').replace('{pct}', String(pct)).replace('{amount}', amount),
        cta:     t('savings.cta'),
        logoUrl: resolveSubscriptionLogoUrl(name, opp.subscriptionLogoUrl ?? null),
        showLogo: true,
      }
    }
    case 'duplicate_category': {
      const catKey   = `categories.${opp.category}` as Parameters<typeof t>[0]
      const catLabel = opp.category ? t(catKey) : ''
      const count    = opp.subscriptionCount ?? 2
      return {
        title:   t('savings.duplicateCategoryTitle').replace('{category}', catLabel.toLowerCase()),
        desc:    t('savings.duplicateCategoryDesc')
                   .replace('{count}', String(count))
                   .replace(/{category}/g, catLabel.toLowerCase())
                   .replace('{amount}', amount),
        cta:     t('savings.cta'),
        logoUrl: null,
        showLogo: false,
      }
    }
    case 'shared_plan': {
      const name = opp.subscriptionName ?? ''
      return {
        title:   t('savings.sharedPlanTitle').replace('{name}', name),
        desc:    t('savings.sharedPlanDesc').replace('{amount}', amount).replace('{name}', name),
        cta:     t('savings.cta'),
        logoUrl: resolveSubscriptionLogoUrl(name, opp.subscriptionLogoUrl ?? null),
        showLogo: true,
      }
    }
    case 'bundle':
      return {
        title:   t('savings.bundleTitle'),
        desc:    t('savings.bundleDesc').replace('{amount}', amount),
        cta:     t('savings.cta'),
        logoUrl: null,
        showLogo: false,
      }
  }
}

// ─── Card shell ───────────────────────────────────────────────────────────────

const CTA_COLOR = '#3D3BF3'

function InsightCardShell({
  icon, title, desc, ctaLabel, onCta, onDismiss, onVerTodo, inModal = false,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  ctaLabel: string
  onCta: () => void
  onDismiss: () => void
  onVerTodo?: () => void
  inModal?: boolean
}) {
  const t = useT()

  return (
    <div
      className={`relative w-full rounded-[20px] px-4 pt-4 pb-3 select-none ${
        inModal ? 'bg-[#F2F2F7] dark:bg-[#2C2C2E]' : 'bg-white dark:bg-[#1C1C1E]'
      }`}
      style={inModal ? undefined : { boxShadow: '0 2px 12px rgba(0,0,0,0.09)' }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {icon}
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="text-[14px] font-bold text-[#121212] dark:text-[#F2F2F7] leading-snug">{title}</p>
          <p className="text-[13px] text-[#737373] dark:text-[#8E8E93] mt-1 leading-snug line-clamp-2">{desc}</p>
        </div>
        {/* Dismiss pill */}
        <button
          onClick={e => { e.stopPropagation(); onDismiss() }}
          className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(142,142,147,0.15)' }}
          aria-label="Descartar"
        >
          <span className="text-[10px] font-bold text-[#8E8E93] leading-none">✕</span>
        </button>
      </div>

      {/* Main CTA */}
      <button
        onClick={onCta}
        className="w-full h-9 rounded-full text-[13px] font-semibold text-white active:opacity-80 transition-opacity"
        style={{ background: CTA_COLOR }}
      >
        {ctaLabel}
      </button>

      {/* Ver todo — only on the last card in the deck */}
      {onVerTodo && (
        <button
          onClick={onVerTodo}
          className="w-full mt-2 py-1.5 text-[12px] font-medium text-[#3D3BF3] dark:text-[#8B89FF]"
        >
          {t('savings.viewAll')} →
        </button>
      )}
    </div>
  )
}

// ─── Public types & components ────────────────────────────────────────────────

export type InsightCardProps =
  | { kind: 'reminder';  annualCount: number; onActivate: () => void; onDismiss: () => void; onVerTodo?: () => void; inModal?: boolean }
  | { kind: 'savings';   opportunity: SavingsOpportunity; onTap: () => void; onDismiss: () => void; onVerTodo?: () => void; inModal?: boolean }

export default function InsightCard(props: InsightCardProps) {
  if (props.kind === 'reminder') {
    const { annualCount, onActivate, onDismiss, onVerTodo, inModal } = props
    const { title, desc, cta } = useReminderContent(annualCount)
    return (
      <InsightCardShell
        icon={<RingingBell />}
        title={title} desc={desc} ctaLabel={cta}
        onCta={onActivate} onDismiss={onDismiss} onVerTodo={onVerTodo} inModal={inModal}
      />
    )
  }

  const { opportunity, onTap, onDismiss, onVerTodo, inModal } = props
  const { title, desc, cta, logoUrl, showLogo } = useSavingsContent(opportunity)
  return (
    <InsightCardShell
      icon={
        showLogo && logoUrl
          ? <SubscriptionAvatar name={opportunity.subscriptionName ?? ''} logoUrl={logoUrl} size="md" corner="rounded-[10px]" />
          : <SavingsIcon type={opportunity.type} />
      }
      title={title} desc={desc} ctaLabel={cta}
      onCta={onTap} onDismiss={onDismiss} onVerTodo={onVerTodo} inModal={inModal}
    />
  )
}
