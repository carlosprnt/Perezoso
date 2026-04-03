'use client'

import BottomSheet from '@/components/ui/BottomSheet'
import SubscriptionAvatar from '@/components/subscriptions/SubscriptionAvatar'
import { resolveSubscriptionLogoUrl } from '@/lib/constants/platforms'
import { formatCurrency } from '@/lib/utils/currency'
import { useT, useLocale } from '@/lib/i18n/LocaleProvider'
import { Coins, Copy, Users, Package } from 'lucide-react'
import { useState, useEffect } from 'react'
import type { SavingsOpportunity } from '@/lib/calculations/savings'

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider mb-2">{label}</p>
      {children}
    </div>
  )
}

// ─── Row ─────────────────────────────────────────────────────────────────────
function Row({ label, value, accent, dim }: { label: string; value: string; accent?: boolean; dim?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#F5F5F5] dark:border-[#2C2C2E] last:border-0">
      <span className="text-[14px] text-[#737373] dark:text-[#8E8E93]">{label}</span>
      <span className={`text-[14px] font-semibold ${
        accent ? 'text-[#059669] dark:text-[#4ADE80]'
        : dim  ? 'text-[#8E8E93] dark:text-[#636366]'
               : 'text-[#121212] dark:text-[#F2F2F7]'
      }`}>
        {value}
      </span>
    </div>
  )
}

// ─── Saving callout ───────────────────────────────────────────────────────────
function SpinningCoin() {
  const [spinning, setSpinning] = useState(false)
  useEffect(() => {
    const trigger = () => {
      setSpinning(true)
      setTimeout(() => setSpinning(false), 2500)
    }
    trigger()
    const id = setInterval(trigger, 5000)
    return () => clearInterval(id)
  }, [])
  return (
    <Coins size={16} strokeWidth={2.5} style={{
      color: '#16A34A',
      animation: spinning ? 'coin-flip 2.5s ease-in-out forwards' : 'none',
    }} />
  )
}

function SavingCallout({ amount, currency, locale }: { amount: number; currency: string; locale: string }) {
  const t = useT()
  const monthly = formatCurrency(amount, currency, locale)
  const annual  = formatCurrency(amount * 12, currency, locale)
  return (
    <div className="rounded-2xl bg-[#F0FDF4] dark:bg-[#052E16] px-4 py-3 flex items-center gap-3 mb-5">
      <div className="w-9 h-9 rounded-full bg-[#DCFCE7] dark:bg-[#14532D] flex items-center justify-center flex-shrink-0"
        style={{ perspective: 200 }}>
        <SpinningCoin />
      </div>
      <div>
        <p className="text-[13px] font-bold text-[#15803D] dark:text-[#4ADE80]">
          {t('savings.detailSavePerMonth').replace('{amount}', monthly)}
        </p>
        <p className="text-[12px] text-[#16A34A] dark:text-[#86EFAC]">
          {t('savings.detailSavePerYear').replace('{annual}', annual)}
        </p>
      </div>
    </div>
  )
}

// ─── Note ─────────────────────────────────────────────────────────────────────
function Note({ text }: { text: string }) {
  return (
    <p className="text-[12px] text-[#8E8E93] dark:text-[#636366] leading-relaxed mt-4 px-1">
      {text}
    </p>
  )
}

// ─── Type-specific content ────────────────────────────────────────────────────

function SwitchToYearlyDetail({ opp, locale }: { opp: SavingsOpportunity; locale: string }) {
  const t = useT()
  const name    = opp.subscriptionName ?? ''
  const current = opp.currentMonthlyCost ?? 0
  const annual  = current * 10 / 12          // estimate: 10 months price billed yearly
  const logoUrl = resolveSubscriptionLogoUrl(name, opp.subscriptionLogoUrl ?? null)

  return (
    <>
      {/* Logo + name */}
      <div className="flex items-center gap-3 mb-5">
        <SubscriptionAvatar name={name} logoUrl={logoUrl} size="lg" corner="rounded-[12px]" />
        <div>
          <p className="text-[17px] font-bold text-[#121212] dark:text-[#F2F2F7]">{name}</p>
          <p className="text-[13px] text-[#737373] dark:text-[#8E8E93]">{t('savings.monthlyBilling')}</p>
        </div>
      </div>

      <SavingCallout amount={opp.estimatedMonthlySaving} currency={opp.currency} locale={locale} />

      <Section label={t('savings.currentPlan')}>
        <Row label={t('savings.billedMonthly')}    value={formatCurrency(current, opp.currency, locale)} dim />
        <Row label={t('savings.yearlyTotal')}      value={formatCurrency(current * 12, opp.currency, locale)} dim />
      </Section>

      <div className="flex items-center justify-between mb-2">
        <p className="text-[13px] font-semibold text-[#121212] dark:text-[#F2F2F7]">{t('savings.ifAnnual')}</p>
        <p className="text-[11px] font-medium text-[#059669] dark:text-[#4ADE80]">{t('savings.estimatedAnnual')}</p>
      </div>
      <div className="mb-5">
        <Row label={t('savings.billedAnnually')}   value={`~${formatCurrency(annual, opp.currency, locale)}/mo`} />
        <Row label={t('savings.yearlyTotal')}      value={`~${formatCurrency(annual * 12, opp.currency, locale)}`} />
      </div>

      <Note text={t('savings.switchToYearlyNote')} />
    </>
  )
}

function DuplicateCategoryDetail({ opp, locale }: { opp: SavingsOpportunity; locale: string }) {
  const t = useT()
  const catKey = `categories.${opp.category}` as Parameters<typeof t>[0]
  const catLabel = opp.category ? t(catKey) : ''
  const names = opp.subscriptionNames ?? []

  return (
    <>
      {/* Icon header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)' }}>
          <Copy size={24} strokeWidth={2} style={{ color: '#D97706' }} />
        </div>
        <div>
          <p className="text-[17px] font-bold text-[#121212] dark:text-[#F2F2F7]">
            {t('savings.duplicateCategoryTitle').replace('{category}', catLabel.toLowerCase())}
          </p>
          <p className="text-[13px] text-[#737373] dark:text-[#8E8E93]">
            {names.length} {catLabel.toLowerCase()}
          </p>
        </div>
      </div>

      <SavingCallout amount={opp.estimatedMonthlySaving} currency={opp.currency} locale={locale} />

      <Section label={t('savings.yourServices')}>
        {names.map((name, i) => (
          <div key={name} className="flex items-center gap-3 py-2 border-b border-[#F5F5F5] dark:border-[#2C2C2E] last:border-0">
            <SubscriptionAvatar
              name={name}
              logoUrl={resolveSubscriptionLogoUrl(name, null)}
              size="sm"
              corner="rounded-[6px]"
            />
            <span className="flex-1 text-[14px] text-[#121212] dark:text-[#F2F2F7]">{name}</span>
            {i === 0 && (
              <span className="text-[11px] font-semibold text-[#D97706] bg-[#FEF3C7] dark:bg-[#2D1F00] px-2 py-0.5 rounded-full">
                {t('savings.cheapest')}
              </span>
            )}
          </div>
        ))}
      </Section>

      <Note text={t('savings.duplicateCategoryNote').replace('{category}', catLabel.toLowerCase())} />
    </>
  )
}

function SharedPlanDetail({ opp, locale }: { opp: SavingsOpportunity; locale: string }) {
  const t = useT()
  const name    = opp.subscriptionName ?? ''
  const current = opp.currentMonthlyCost ?? 0
  const logoUrl = resolveSubscriptionLogoUrl(name, opp.subscriptionLogoUrl ?? null)

  return (
    <>
      <div className="flex items-center gap-3 mb-5">
        <SubscriptionAvatar name={name} logoUrl={logoUrl} size="lg" corner="rounded-[12px]" />
        <div>
          <p className="text-[17px] font-bold text-[#121212] dark:text-[#F2F2F7]">{name}</p>
          <p className="text-[13px] text-[#737373] dark:text-[#8E8E93]">{t('savings.soloplan')}</p>
        </div>
      </div>

      <SavingCallout amount={opp.estimatedMonthlySaving} currency={opp.currency} locale={locale} />

      <Section label={t('savings.comparison')}>
        <Row label={t('savings.soloPlanCost')}     value={formatCurrency(current, opp.currency, locale)} />
        <Row label={t('savings.familyPlanPerPerson')}
          value={`~${formatCurrency(current * 0.5, opp.currency, locale)}`}
          accent />
      </Section>

      <Note text={t('savings.sharedPlanNote').replace('{name}', name)} />
    </>
  )
}

function BundleDetail({ opp, locale }: { opp: SavingsOpportunity; locale: string }) {
  const t = useT()
  const names = opp.subscriptionNames ?? []

  return (
    <>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%)' }}>
          <Package size={24} strokeWidth={2} style={{ color: '#7C3AED' }} />
        </div>
        <div>
          <p className="text-[17px] font-bold text-[#121212] dark:text-[#F2F2F7]">{t('savings.bundleTitle')}</p>
          <p className="text-[13px] text-[#737373] dark:text-[#8E8E93]">{names.join(' + ')}</p>
        </div>
      </div>

      <SavingCallout amount={opp.estimatedMonthlySaving} currency={opp.currency} locale={locale} />

      <Section label={t('savings.yourServices')}>
        {names.map(name => (
          <div key={name} className="flex items-center gap-3 py-2 border-b border-[#F5F5F5] dark:border-[#2C2C2E] last:border-0">
            <SubscriptionAvatar
              name={name}
              logoUrl={resolveSubscriptionLogoUrl(name, null)}
              size="sm"
              corner="rounded-[6px]"
            />
            <span className="flex-1 text-[14px] text-[#121212] dark:text-[#F2F2F7]">{name}</span>
          </div>
        ))}
      </Section>

      <Note text={t('savings.bundleNote')} />
    </>
  )
}

// ─── Main sheet ───────────────────────────────────────────────────────────────

interface Props {
  opportunity: SavingsOpportunity | null
  onClose: () => void
}

export default function SavingsDetailSheet({ opportunity, onClose }: Props) {
  const t      = useT()
  const locale = useLocale()

  const title = 'Sugerencia de ahorro'

  return (
    <BottomSheet isOpen={!!opportunity} onClose={onClose} title={title} height="tall" zIndex={300}>
      <div className="px-5 pt-2 pb-8">
        {opportunity?.type === 'switch_to_yearly'   && <SwitchToYearlyDetail  opp={opportunity} locale={locale} />}
        {opportunity?.type === 'duplicate_category' && <DuplicateCategoryDetail opp={opportunity} locale={locale} />}
        {opportunity?.type === 'shared_plan'        && <SharedPlanDetail       opp={opportunity} locale={locale} />}
        {opportunity?.type === 'bundle'             && <BundleDetail           opp={opportunity} locale={locale} />}

        <button
          onClick={onClose}
          className="mt-2 w-full h-12 rounded-full bg-[#3D3BF3] text-white text-[15px] font-semibold active:bg-[#3230D0] transition-colors"
        >
          {t('savings.dismiss')}
        </button>
      </div>
    </BottomSheet>
  )
}
