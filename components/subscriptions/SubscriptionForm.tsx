'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createSubscription, updateSubscription, deleteSubscription } from '@/app/(dashboard)/subscriptions/actions'
import { CATEGORIES } from '@/lib/constants/categories'
import { BILLING_PERIOD_LABELS } from '@/lib/constants/currencies'
import { AlertCircle, ChevronsUpDown } from 'lucide-react'
import { useT, useLocale } from '@/lib/i18n/LocaleProvider'
import SubscriptionAvatar from '@/components/subscriptions/SubscriptionAvatar'
import { resolveSubscriptionLogoUrl } from '@/lib/constants/platforms'
import type { Subscription, BillingPeriod, SubscriptionStatus, UserShareMode, Category } from '@/types'
import type { PlatformPreset } from '@/lib/constants/platforms'
import { getPrefilledPlatformValues } from '@/lib/constants/platforms'

interface SubscriptionFormProps {
  subscription?: Subscription
  mode: 'create' | 'edit'
  platformPreset?: PlatformPreset
  onCancel?: () => void
}

// ─── Helper sub-components ───────────────────────────────────────────────────

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-5 mb-3 bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden border border-[#EFEFEF] dark:border-[#2C2C2E]">
      {children}
    </div>
  )
}

function Row({
  label,
  last = false,
  children,
}: {
  label: string
  last?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={`flex items-center justify-between px-4 min-h-[52px] py-3 ${
        last ? '' : 'border-b border-[#EFEFEF] dark:border-[#2C2C2E]'
      }`}
    >
      <span className="text-[16px] text-[#111111] dark:text-[#F2F2F7]">{label}</span>
      <div className="flex items-center gap-1 flex-shrink-0 ml-4">{children}</div>
    </div>
  )
}

// Muted value + chevrons — overlaid with a transparent native select
function SelectRow({
  label,
  value,
  last = false,
  children,
}: {
  label: string
  value: string
  last?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={`relative flex items-center justify-between px-4 min-h-[52px] py-3 ${
        last ? '' : 'border-b border-[#EFEFEF] dark:border-[#2C2C2E]'
      }`}
    >
      <span className="text-[16px] text-[#111111] dark:text-[#F2F2F7] pointer-events-none">{label}</span>
      <div className="flex items-center gap-1 flex-shrink-0 ml-4 pointer-events-none">
        <span className="text-[15px] text-[#666666] dark:text-[#AEAEB2]">{value}</span>
        <ChevronsUpDown size={13} className="text-[#999999] dark:text-[#636366]" />
      </div>
      {/* Transparent native select covers the entire row */}
      <div className="absolute inset-0">{children}</div>
    </div>
  )
}

// Date shown as a pill; hidden date input behind it
function DateRow({
  label,
  value,
  onChange,
  last = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  last?: boolean
}) {
  const locale = useLocale()
  const formatted = value
    ? new Date(value + 'T00:00:00').toLocaleDateString(
        locale === 'es' ? 'es-ES' : 'en-US',
        { day: 'numeric', month: 'short', year: 'numeric' },
      )
    : '—'

  return (
    <label
      className={`relative flex items-center justify-between px-4 min-h-[52px] py-3 cursor-pointer ${
        last ? '' : 'border-b border-[#EFEFEF] dark:border-[#2C2C2E]'
      }`}
    >
      <span className="text-[16px] text-[#111111] dark:text-[#F2F2F7] pointer-events-none">{label}</span>
      <div className="flex-shrink-0 ml-4 pointer-events-none">
        <span className="bg-[#EFEFEF] dark:bg-[#3A3A3C] rounded-full px-3 py-1.5 text-[13px] font-medium text-[#111111] dark:text-[#F2F2F7]">
          {formatted}
        </span>
      </div>
      <input
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
      />
    </label>
  )
}

// iOS-style toggle
function Toggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="relative inline-flex cursor-pointer flex-shrink-0">
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
      />
      <div
        className="
          w-11 h-6 rounded-full bg-[#DADADA] dark:bg-[#3A3A3C]
          peer-checked:bg-[#3D3BF3]
          after:content-[''] after:absolute after:top-[2px] after:left-[2px]
          after:bg-white after:rounded-full after:h-5 after:w-5
          after:transition-all peer-checked:after:translate-x-5
          transition-colors duration-200
        "
      />
    </label>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SubscriptionForm({
  subscription,
  mode,
  platformPreset,
  onCancel,
}: SubscriptionFormProps) {
  const t = useT()
  const locale = useLocale()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const prefill = platformPreset ? getPrefilledPlatformValues(platformPreset) : null

  // ── State ─────────────────────────────────────────────────────────────────
  const [name, setName] = useState(subscription?.name ?? prefill?.name ?? '')
  const [priceAmount, setPriceAmount] = useState(
    subscription?.price_amount?.toString() ?? prefill?.priceAmount ?? '',
  )
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>(
    subscription?.billing_period ?? (prefill?.billingPeriod as BillingPeriod) ?? 'monthly',
  )
  const [category, setCategory] = useState<Category>(
    subscription?.category ?? (prefill?.category as Category) ?? 'other',
  )
  const [nextBillingDate, setNextBillingDate] = useState(
    subscription?.next_billing_date ?? '',
  )
  const [logoUrl, setLogoUrl] = useState(
    subscription?.logo_url ?? prefill?.logoUrl ?? '',
  )
  const [status, setStatus] = useState<SubscriptionStatus>(
    subscription?.status ?? 'active',
  )
  const [billingIntervalCount, setBillingIntervalCount] = useState(
    subscription?.billing_interval_count?.toString() ?? '1',
  )
  const [isShared, setIsShared] = useState(subscription?.is_shared ?? false)
  const [sharedWithCount, setSharedWithCount] = useState(
    subscription?.shared_with_count?.toString() ?? '2',
  )
  const [userShareMode, setUserShareMode] = useState<UserShareMode>(
    subscription?.user_share_mode ?? 'split_evenly',
  )
  const [userShareAmount, setUserShareAmount] = useState(
    subscription?.user_share_amount?.toString() ?? '',
  )
  const [trialEndDate, setTrialEndDate] = useState(
    subscription?.trial_end_date ?? '',
  )
  const [notes, setNotes] = useState(subscription?.notes ?? '')

  // ── Derived ───────────────────────────────────────────────────────────────
  const isTrial = status === 'trial'
  const billingLabel =
    BILLING_PERIOD_LABELS[billingPeriod] ?? billingPeriod
  const categoryMeta = CATEGORIES.find(c => c.value === category)
  const categoryLabel = categoryMeta
    ? t(`categories.${categoryMeta.value}` as Parameters<typeof t>[0])
    : category

  // ── Submit ────────────────────────────────────────────────────────────────
  function buildPayload() {
    return {
      name: name.trim(),
      logo_url: logoUrl.trim() || null,
      card_color: null,
      category,
      price_amount: parseFloat(priceAmount) || 0,
      currency: 'EUR',
      billing_period: billingPeriod,
      billing_interval_count: parseInt(billingIntervalCount) || 1,
      next_billing_date: nextBillingDate || null,
      trial_end_date: isTrial ? trialEndDate || null : null,
      status,
      is_shared: isShared,
      shared_with_count: isShared ? Math.max(parseInt(sharedWithCount) || 2, 2) : 1,
      user_share_mode: isShared ? userShareMode : ('split_evenly' as UserShareMode),
      user_share_amount:
        isShared && userShareMode === 'custom'
          ? parseFloat(userShareAmount) || null
          : null,
      notes: notes.trim() || null,
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) { setError(t('form.nameRequired')); return }
    if (!priceAmount || parseFloat(priceAmount) < 0) { setError(t('form.invalidPrice')); return }
    startTransition(async () => {
      const result =
        mode === 'create'
          ? await createSubscription(buildPayload())
          : await updateSubscription(subscription!.id, buildPayload())
      if (result?.error) setError(result.error)
      else onCancel?.()
    })
  }

  async function handleDelete() {
    startTransition(async () => {
      const result = await deleteSubscription(subscription!.id)
      if (result?.error) setError(result.error)
    })
  }

  const selectCls =
    'absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col min-h-0">

      {/* ── Header: title + save button ──────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 pt-2 pb-4">
        <h1 className="text-[28px] font-bold text-[#111111] dark:text-[#F2F2F7] tracking-tight leading-tight">
          {mode === 'create' ? t('sheets.createNew') : t('sheets.editSubscription')}
        </h1>
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2 rounded-full bg-[#EFEFEF] dark:bg-[#2C2C2E] text-[#111111] dark:text-[#F2F2F7] text-[15px] font-medium disabled:opacity-40 active:bg-[#E0E0E0] dark:active:bg-[#3A3A3C] transition-colors"
        >
          {isPending ? '…' : t('form.saveChanges')}
        </button>
      </div>

      {/* ── Scrollable body ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto overscroll-contain pb-10">

        {/* Error */}
        {error && (
          <div className="mx-5 mb-3 flex items-start gap-2 bg-red-900/20 border border-red-800/40 text-red-400 text-sm rounded-2xl px-4 py-3">
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* ── Hero card: avatar + name + price ────────────────────────── */}
        <div className="mx-5 mb-3 bg-[#F5F5F5] dark:bg-[#1C1C1E] rounded-2xl p-4 flex items-center gap-3 border border-[#EFEFEF] dark:border-[#2C2C2E]">
          <SubscriptionAvatar
            name={name || 'New'}
            logoUrl={resolveSubscriptionLogoUrl(name, logoUrl || null)}
            size="lg"
            corner="rounded-[12px]"
          />
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('form.namePlaceholder')}
              autoFocus={false}
              className="w-full bg-transparent text-[17px] font-semibold text-[#111111] dark:text-[#F2F2F7] placeholder:text-[#BBBBBB] dark:placeholder:text-[#636366] outline-none leading-snug"
            />
            <div className="flex items-center gap-2 mt-1.5">
              <span className="bg-[#E8E8E8] dark:bg-[#2C2C2E] text-[#555555] dark:text-[#AEAEB2] text-[12px] font-semibold px-2 py-0.5 rounded-lg">
                €
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={priceAmount}
                onChange={e => setPriceAmount(e.target.value)}
                placeholder="0.00"
                className="bg-transparent text-[15px] text-[#555555] dark:text-[#AEAEB2] placeholder:text-[#BBBBBB] dark:placeholder:text-[#636366] outline-none w-28 tabular-nums"
              />
            </div>
          </div>
        </div>

        {/* ── Section 1: Billing ──────────────────────────────────────── */}
        <Section>
          {/* Fecha de pago */}
          <DateRow
            label={t('form.nextBillingDate')}
            value={nextBillingDate}
            onChange={setNextBillingDate}
          />

          {/* Ciclo de facturación */}
          <SelectRow label={t('form.amount')} value={billingLabel}>
            <select
              value={billingPeriod}
              onChange={e => setBillingPeriod(e.target.value as BillingPeriod)}
              className={selectCls}
            >
              {Object.entries(BILLING_PERIOD_LABELS).map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
          </SelectRow>

          {/* Custom interval */}
          {billingPeriod === 'custom' && (
            <Row label={t('form.trialEveryNMonths')}>
              <input
                type="number"
                min="1"
                value={billingIntervalCount}
                onChange={e => setBillingIntervalCount(e.target.value)}
                className="bg-[#EFEFEF] dark:bg-[#2C2C2E] rounded-xl px-3 py-1.5 text-[15px] text-[#111111] dark:text-[#F2F2F7] outline-none w-20 text-right tabular-nums"
              />
            </Row>
          )}

          {/* Periodo de prueba toggle */}
          <Row label={t('form.trialEndDate')} last={!isTrial}>
            <Toggle
              checked={isTrial}
              onChange={v => setStatus(v ? 'trial' : 'active')}
            />
          </Row>

          {/* Trial end date (shown when toggle is on) */}
          {isTrial && (
            <DateRow
              label={t('form.trialEndDate')}
              value={trialEndDate}
              onChange={setTrialEndDate}
              last
            />
          )}
        </Section>

        {/* ── Section 2: Status (paused/cancelled) ────────────────────── */}
        {(status === 'paused' || status === 'cancelled') && (
          <Section>
            <SelectRow label={t('form.status')} value={t(`status.${status}` as Parameters<typeof t>[0])} last>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as SubscriptionStatus)}
                className={selectCls}
              >
                <option value="active">{t('status.active')}</option>
                <option value="trial">{t('status.trial')}</option>
                <option value="paused">{t('status.paused')}</option>
                <option value="cancelled">{t('status.cancelled')}</option>
              </select>
            </SelectRow>
          </Section>
        )}

        {/* ── Section 3: Organisation ─────────────────────────────────── */}
        <Section>
          <SelectRow label={t('form.category')} value={categoryLabel} last>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as Category)}
              className={selectCls}
            >
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {t(`categories.${cat.value}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>
          </SelectRow>
        </Section>

        {/* ── Section 4: Sharing ─────────────────────────────────────── */}
        <Section>
          <Row label={t('form.shared')} last={!isShared}>
            <Toggle checked={isShared} onChange={setIsShared} />
          </Row>

          {isShared && (
            <>
              <Row label={t('form.sharedCount')}>
                <input
                  type="number"
                  min="2"
                  value={sharedWithCount}
                  onChange={e => setSharedWithCount(e.target.value)}
                  className="bg-[#EFEFEF] dark:bg-[#2C2C2E] rounded-xl px-3 py-1.5 text-[15px] text-[#111111] dark:text-[#F2F2F7] outline-none w-20 text-right tabular-nums"
                />
              </Row>
              <SelectRow
                label={t('form.splitMode')}
                value={userShareMode === 'split_evenly' ? t('form.splitEvenly') : t('form.splitCustom')}
                last={userShareMode !== 'custom'}
              >
                <select
                  value={userShareMode}
                  onChange={e => setUserShareMode(e.target.value as UserShareMode)}
                  className={selectCls}
                >
                  <option value="split_evenly">{t('form.splitEvenly')}</option>
                  <option value="custom">{t('form.splitCustom')}</option>
                </select>
              </SelectRow>
              {userShareMode === 'custom' && (
                <Row label={t('form.myShare', { currency: 'EUR' })} last>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={userShareAmount}
                    onChange={e => setUserShareAmount(e.target.value)}
                    placeholder="4.99"
                    className="bg-[#EFEFEF] dark:bg-[#2C2C2E] rounded-xl px-3 py-1.5 text-[15px] text-[#111111] dark:text-[#F2F2F7] placeholder:text-[#BBBBBB] dark:placeholder:text-[#636366] outline-none w-24 text-right tabular-nums"
                  />
                </Row>
              )}
            </>
          )}
        </Section>

        {/* ── Section 5: Notes & logo URL ─────────────────────────────── */}
        <Section>
          <Row label={t('form.logoUrl')}>
            <input
              type="url"
              value={logoUrl}
              onChange={e => setLogoUrl(e.target.value)}
              placeholder="https://…"
              className="bg-transparent text-[15px] text-[#555555] dark:text-[#AEAEB2] placeholder:text-[#BBBBBB] dark:placeholder:text-[#636366] outline-none text-right w-40 truncate"
            />
          </Row>
          <Row label={t('form.notes')} last>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={t('form.notesPlaceholder')}
              className="bg-transparent text-[15px] text-[#555555] dark:text-[#AEAEB2] placeholder:text-[#BBBBBB] dark:placeholder:text-[#636366] outline-none text-right w-40 truncate"
            />
          </Row>
        </Section>

        {/* ── Status change (active mode — paused/cancelled) ──────────── */}
        {status === 'active' && (
          <div className="mx-5 mb-3 bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden border border-[#EFEFEF] dark:border-[#2C2C2E]">
            <SelectRow
              label={t('form.status')}
              value={t(`status.${status}` as Parameters<typeof t>[0])}
              last
            >
              <select
                value={status}
                onChange={e => setStatus(e.target.value as SubscriptionStatus)}
                className={selectCls}
              >
                <option value="active">{t('status.active')}</option>
                <option value="paused">{t('status.paused')}</option>
                <option value="cancelled">{t('status.cancelled')}</option>
              </select>
            </SelectRow>
          </div>
        )}

        {/* ── Delete (edit mode) ──────────────────────────────────────── */}
        {mode === 'edit' && (
          <div className="mx-5 mb-3">
            {showDeleteConfirm ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isPending}
                  className="flex-1 h-12 rounded-2xl bg-red-600 text-white text-sm font-semibold active:bg-red-700 transition-colors disabled:opacity-40"
                >
                  {t('form.confirmDelete')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="h-12 px-5 rounded-2xl bg-[#EFEFEF] dark:bg-[#2C2C2E] text-[#444444] dark:text-[#AEAEB2] text-sm font-medium"
                >
                  {t('form.keepIt')}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full h-12 rounded-2xl bg-[#F5F5F5] dark:bg-[#1C1C1E] text-red-500 dark:text-red-500 text-sm font-medium active:bg-[#EBEBEB] dark:active:bg-[#2C2C2E] transition-colors"
              >
                {t('form.delete')}
              </button>
            )}
          </div>
        )}

        {/* ── Cancel ──────────────────────────────────────────────────── */}
        <div className="mx-5 mb-2">
          <button
            type="button"
            onClick={onCancel ?? (() => router.back())}
            className="w-full h-12 rounded-2xl bg-[#F5F5F5] dark:bg-[#1C1C1E] text-[#444444] dark:text-[#AEAEB2] text-sm font-medium active:bg-[#EBEBEB] dark:active:bg-[#2C2C2E] transition-colors"
          >
            {t('form.cancel')}
          </button>
        </div>

      </div>
    </form>
  )
}
