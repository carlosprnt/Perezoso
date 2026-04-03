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

// ─── Bold numbers helper ──────────────────────────────────────────────────────

function BoldNumbers({ text }: { text: string }) {
  // Split on **markdown bold** markers OR currency/percentage numbers
  const parts = text.split(/(\*\*[^*]+\*\*|\d[\d.,]*\s*[€$£]|\d+\s*%)/)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**'))
          return <strong key={i}>{part.slice(2, -2)}</strong>
        if (/^\d[\d.,]*\s*[€$£]$|^\d+\s*%$/.test(part.trim()))
          return <strong key={i}>{part}</strong>
        return part
      })}
    </>
  )
}



function useReminderContent(annualCount: number) {
  const t = useT()
  const body = annualCount === 1
    ? t('reminder.cardBody')
    : t('reminder.cardBodyMany').replace('{count}', String(annualCount))
  return { body, cta: t('reminder.cardCta') }
}

function useSavingsContent(opp: SavingsOpportunity) {
  const t      = useT()
  const locale = useLocale()
  const amount = formatCurrency(opp.estimatedMonthlySaving * 12, opp.currency, locale)

  switch (opp.type) {
    case 'switch_to_yearly': {
      const name = opp.subscriptionName ?? ''
      const pct  = opp.savingPct ?? 17
      return {
        body:    t('savings.switchToYearlyBody').replace('{pct}', String(pct)).replace('{name}', name),
        cta:     t('savings.cta'),
        logoUrl: resolveSubscriptionLogoUrl(name, opp.subscriptionLogoUrl ?? null),
        showLogo: true,
      }
    }
    case 'duplicate_category': {
      const catKey   = `categories.${opp.category}` as Parameters<typeof t>[0]
      const catLabel = opp.category ? t(catKey) : ''
      return {
        body:    t('savings.duplicateCategoryBody')
                   .replace('{amount}', amount)
                   .replace('{category}', catLabel.toLowerCase()),
        cta:     t('savings.cta'),
        logoUrl: null,
        showLogo: false,
      }
    }
    case 'shared_plan': {
      const name = opp.subscriptionName ?? ''
      return {
        body:    t('savings.sharedPlanBody').replace('{amount}', amount).replace('{name}', name),
        cta:     t('savings.cta'),
        logoUrl: resolveSubscriptionLogoUrl(name, opp.subscriptionLogoUrl ?? null),
        showLogo: true,
      }
    }
    case 'bundle':
      return {
        body:    t('savings.bundleBody').replace('{amount}', amount),
        cta:     t('savings.cta'),
        logoUrl: null,
        showLogo: false,
      }
  }
}

// ─── Card shell ───────────────────────────────────────────────────────────────

function InsightCardShell({
  icon, body, ctaLabel, onCta, onDismiss, inModal = false,
}: {
  icon: React.ReactNode
  body: string
  ctaLabel: string
  onCta: () => void
  onDismiss?: () => void
  inModal?: boolean
}) {
  return (
    <div
      className={`relative w-full rounded-[24px] px-4 pt-4 pb-3 select-none ${
        inModal ? 'bg-[#F2F2F7] dark:bg-[#2C2C2E]' : 'bg-white dark:bg-[#1C1C1E]'
      }`}
      style={inModal ? undefined : { boxShadow: '0 1px 5px rgba(0,0,0,0.06)' }}
    >
      {/* Body */}
      <div className="flex items-start gap-3 mb-3">
        {icon}
        <div className="flex-1 min-w-0 pt-0.5">
          <p
            className={`text-[14px] text-[#121212] dark:text-[#F2F2F7] ${inModal ? '' : 'line-clamp-3'}`}
            style={{ lineHeight: '1.45', ...(inModal ? {} : { minHeight: 'calc(3 * 1.45 * 14px)' }) }}
          ><BoldNumbers text={body} /></p>
        </div>
      </div>

      {/* CTAs */}
      <div className={`flex gap-2 ${onDismiss ? '' : ''}`}>
        <button
          onClick={onCta}
          className={`flex-1 h-9 rounded-full text-[13px] font-semibold active:opacity-70 transition-opacity text-[#3C3C43] dark:text-[#EBEBF5] ${
            inModal ? 'bg-[#E5E5EA] dark:bg-[#3A3A3C]' : 'bg-[#F2F2F7] dark:bg-[#2C2C2E]'
          }`}
        >
          {ctaLabel}
        </button>
        {onDismiss && (
          <button
            onClick={e => { e.stopPropagation(); onDismiss() }}
            className="h-9 px-4 rounded-full text-[13px] font-semibold active:opacity-70 transition-opacity text-[#8E8E93] dark:text-[#636366]"
            style={{ background: 'rgba(142,142,147,0.12)' }}
          >
            Quitar
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Public types & components ────────────────────────────────────────────────

export type InsightCardProps =
  | { kind: 'reminder';  annualCount: number; onActivate: () => void; onDismiss?: () => void; inModal?: boolean }
  | { kind: 'savings';   opportunity: SavingsOpportunity; onTap: () => void; onDismiss?: () => void; inModal?: boolean }

export default function InsightCard(props: InsightCardProps) {
  if (props.kind === 'reminder') {
    const { annualCount, onActivate, onDismiss, inModal } = props
    const { body, cta } = useReminderContent(annualCount)
    return (
      <InsightCardShell
        icon={<RingingBell />}
        body={body} ctaLabel={cta}
        onCta={onActivate} onDismiss={onDismiss} inModal={inModal}
      />
    )
  }

  const { opportunity, onTap, onDismiss, inModal } = props
  const { body, cta, logoUrl, showLogo } = useSavingsContent(opportunity)
  return (
    <InsightCardShell
      icon={
        showLogo && logoUrl
          ? <SubscriptionAvatar name={opportunity.subscriptionName ?? ''} logoUrl={logoUrl} size="md" corner="rounded-[10px]" />
          : <SavingsIcon type={opportunity.type} />
      }
      body={body} ctaLabel={cta}
      onCta={onTap} onDismiss={onDismiss} inModal={inModal}
    />
  )
}
