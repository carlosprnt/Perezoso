'use client'

import { useState, useTransition, useRef, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSubscription, updateSubscription, deleteSubscription } from '@/app/(dashboard)/subscriptions/actions'
import { AnalyticsEvents } from '@/lib/analytics'
import { createClient } from '@/lib/supabase/client'
import haptics from '@/lib/haptics'
import { CATEGORIES } from '@/lib/constants/categories'
import { CURRENCIES, BILLING_PERIOD_LABELS } from '@/lib/constants/currencies'
import { AlertCircle, Bell, ChevronsUpDown, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useT, useLocale } from '@/lib/i18n/LocaleProvider'
import { useTheme } from '@/components/ui/ThemeProvider'
import { subscriptionToastBus } from '@/lib/subscriptionToastBus'
import type { Subscription, BillingPeriod, SubscriptionStatus, UserShareMode, Category } from '@/types'
import type { PlatformPreset } from '@/lib/constants/platforms'
import { getPrefilledPlatformValues } from '@/lib/constants/platforms'

interface SubscriptionFormProps {
  subscription?: Subscription
  mode: 'create' | 'edit'
  platformPreset?: PlatformPreset
  onCancel?: () => void
  successRedirect?: string
}

// ─── Helper sub-components ───────────────────────────────────────────────────

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-5 mb-3 bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden border border-[#F0F0F0] dark:border-[#2C2C2E]">
      {children}
    </div>
  )
}

function autoSize(el: HTMLTextAreaElement, min = 0) {
  el.style.height = 'auto'
  el.style.height = `${Math.max(el.scrollHeight, min)}px`
}

/** Same day-of-month as today, next month (clamped to last day if needed). */
function defaultNextBillingDate(): string {
  const today = new Date()
  const y = today.getFullYear()
  const m = today.getMonth() + 1
  const day = today.getDate()
  const lastDayNextMonth = new Date(y, m + 1, 0).getDate()
  const d = new Date(y, m, Math.min(day, lastDayNextMonth))
  return d.toISOString().split('T')[0]
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
        last ? '' : 'border-b border-[#F0F0F0] dark:border-[#2C2C2E]'
      }`}
    >
      <span className="text-[16px] text-[#121212] dark:text-[#F2F2F7]">{label}</span>
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
        last ? '' : 'border-b border-[#F0F0F0] dark:border-[#2C2C2E]'
      }`}
    >
      <span className="text-[16px] text-[#121212] dark:text-[#F2F2F7] pointer-events-none">{label}</span>
      <div className="flex items-center gap-1 flex-shrink-0 ml-4 pointer-events-none">
        <span className="text-[15px] text-[#616161] dark:text-[#AEAEB2]">{value}</span>
        <ChevronsUpDown size={13} className="text-[#737373] dark:text-[#8E8E93]" />
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
        last ? '' : 'border-b border-[#F0F0F0] dark:border-[#2C2C2E]'
      }`}
    >
      <span className="text-[16px] text-[#121212] dark:text-[#F2F2F7] pointer-events-none">{label}</span>
      <div className="flex-shrink-0 ml-4 pointer-events-none">
        <span className="bg-[#F0F0F0] dark:bg-[#3A3A3C] rounded-full px-3 py-1.5 text-[13px] font-medium text-[#121212] dark:text-[#F2F2F7]">
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
  successRedirect,
}: SubscriptionFormProps) {
  const t = useT()
  const locale = useLocale()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const errorRef = useRef<HTMLDivElement>(null)

  // Scroll into view so the user can read it when submission fails.
  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [error])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [reminderOn, setReminderOn] = useState(false)
  const [reminderDays, setReminderDays] = useState<1 | 3 | 10>(3)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const prefill = platformPreset ? getPrefilledPlatformValues(platformPreset) : null

  // ── State ─────────────────────────────────────────────────────────────────
  const [name, setName] = useState(subscription?.name ?? prefill?.name ?? '')
  const [priceAmount, setPriceAmount] = useState(
    subscription?.price_amount?.toString() ?? prefill?.priceAmount ?? '',
  )
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>(
    subscription?.billing_period ?? (prefill?.billingPeriod as BillingPeriod) ?? 'monthly',
  )
  // Category is widened to string so custom user categories from Settings
  // can live in the select. They are mapped back to 'other' on save
  // because the subscriptions table still has a CHECK constraint on this
  // column — a future migration will lift that.
  const [category, setCategory] = useState<string>(
    subscription?.category ?? (prefill?.category as Category) ?? 'other',
  )
  const [customCategories, setCustomCategories] = useState<string[]>([])
  const [startDate, setStartDate] = useState(
    subscription?.start_date ?? new Date().toISOString().split('T')[0],
  )
  const [nextBillingDate, setNextBillingDate] = useState(
    subscription?.next_billing_date ?? defaultNextBillingDate(),
  )

  // Auto-compute next billing date from start date when creating a new subscription
  useEffect(() => {
    if (subscription) return  // editing — don't overwrite
    const d = new Date(startDate + 'T00:00:00')
    if (billingPeriod === 'monthly') {
      d.setMonth(d.getMonth() + 1)
    } else if (billingPeriod === 'yearly') {
      d.setFullYear(d.getFullYear() + 1)
    } else {
      return
    }
    setNextBillingDate(d.toISOString().split('T')[0])
  }, [startDate, billingPeriod]) // eslint-disable-line react-hooks/exhaustive-deps
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
  const [currency, setCurrency] = useState(subscription?.currency ?? 'EUR')

  // Pick up user preferences from auth metadata: preferred currency
  // (create only) and the list of custom categories (always).
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      const prefs = (data.user?.user_metadata as {
        preferences?: { preferred_currency?: string; custom_categories?: string[] }
      } | undefined)?.preferences
      if (prefs?.custom_categories) setCustomCategories(prefs.custom_categories)
      if (mode === 'create' && !subscription?.currency && prefs?.preferred_currency) {
        setCurrency(prefs.preferred_currency)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Dirty state detection ────────────────────────────────────────────────
  const initialSnapshot = useRef({
    name: subscription?.name ?? prefill?.name ?? '',
    priceAmount: subscription?.price_amount?.toString() ?? prefill?.priceAmount ?? '',
    billingPeriod: subscription?.billing_period ?? (prefill?.billingPeriod as BillingPeriod) ?? 'monthly',
    category: subscription?.category ?? (prefill?.category as Category) ?? 'other',
    nextBillingDate: subscription?.next_billing_date ?? '',
    logoUrl: subscription?.logo_url ?? prefill?.logoUrl ?? '',
    status: subscription?.status ?? 'active',
    billingIntervalCount: subscription?.billing_interval_count?.toString() ?? '1',
    isShared: subscription?.is_shared ?? false,
    sharedWithCount: subscription?.shared_with_count?.toString() ?? '2',
    userShareMode: subscription?.user_share_mode ?? 'split_evenly',
    userShareAmount: subscription?.user_share_amount?.toString() ?? '',
    trialEndDate: subscription?.trial_end_date ?? '',
    notes: subscription?.notes ?? '',
    currency: subscription?.currency ?? 'EUR',
  })

  const isDirty = useMemo(() => {
    const s = initialSnapshot.current
    return (
      name !== s.name ||
      priceAmount !== s.priceAmount ||
      billingPeriod !== s.billingPeriod ||
      category !== s.category ||
      nextBillingDate !== s.nextBillingDate ||
      logoUrl !== s.logoUrl ||
      status !== s.status ||
      billingIntervalCount !== s.billingIntervalCount ||
      isShared !== s.isShared ||
      sharedWithCount !== s.sharedWithCount ||
      userShareMode !== s.userShareMode ||
      userShareAmount !== s.userShareAmount ||
      trialEndDate !== s.trialEndDate ||
      notes !== s.notes ||
      currency !== s.currency
    )
  }, [name, priceAmount, billingPeriod, category, nextBillingDate, logoUrl, status,
      billingIntervalCount, isShared, sharedWithCount, userShareMode, userShareAmount,
      trialEndDate, notes, currency])

  function requestClose() {
    if (mode === 'edit' && isDirty) {
      setShowCancelConfirm(true)
    } else {
      if (onCancel) onCancel(); else router.back()
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const isTrial = status === 'trial'
  const billingLabel =
    BILLING_PERIOD_LABELS[billingPeriod] ?? billingPeriod
  const categoryMeta = CATEGORIES.find(c => c.value === category)
  const isCustomCategory = !categoryMeta && customCategories.includes(category)
  const categoryLabel = categoryMeta
    ? t(`categories.${categoryMeta.value}` as Parameters<typeof t>[0])
    : category

  // ── Submit ────────────────────────────────────────────────────────────────
  function buildPayload() {
    return {
      name: name.trim(),
      logo_url: logoUrl.trim() || null,
      card_color: null,
      // Send the real (possibly custom) category. The server action
      // retries with 'other' automatically if the DB still has the
      // valid_category CHECK constraint, so the flow works whether or
      // not the 003 migration has been applied.
      category: category as Category,
      price_amount: parseFloat(priceAmount) || 0,
      currency,
      billing_period: billingPeriod,
      billing_interval_count: Math.max(1, parseInt(billingIntervalCount) || 1),
      start_date: startDate || null,
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
      const payload = buildPayload()
      const result =
        mode === 'create'
          ? await createSubscription(payload, successRedirect)
          : await updateSubscription(subscription!.id, payload)
      if (result?.error) {
        setError(result.error)
        haptics.error()
        AnalyticsEvents.errorShown('subscription_form', result.error)
        return
      }
      const analyticsProps = {
        subscription_name: payload.name,
        billing_period: payload.billing_period,
        is_shared: payload.is_shared,
        category: payload.category,
        amount: payload.price_amount,
        currency: payload.currency,
        source: platformPreset ? 'detected' as const : 'manual' as const,
      }
      haptics.success()
      if (mode === 'create') {
        // isFirst is derived in PostHog via a first-time-event cohort.
        AnalyticsEvents.subscriptionCreated(analyticsProps, false)
        subscriptionToastBus.emit('created')
        onCancel?.()
        const newId = (result as { id?: string })?.id
        router.push(successRedirect ?? `/subscriptions?new=${newId ?? ''}`)
      } else {
        AnalyticsEvents.subscriptionUpdated({ subscription_id: subscription!.id, ...analyticsProps })
        subscriptionToastBus.emit('updated')
        onCancel?.()
        router.push('/subscriptions')
      }
    })
  }

  async function handleDelete() {
    startTransition(async () => {
      haptics.warning()
      const result = await deleteSubscription(subscription!.id)
      if (result?.error) {
        setError(result.error)
        haptics.error()
        AnalyticsEvents.errorShown('subscription_form', result.error)
        return
      }
      AnalyticsEvents.subscriptionDeleted({
        subscription_id: subscription!.id,
        subscription_name: subscription!.name,
        category: subscription!.category,
      })
      subscriptionToastBus.emit('deleted')
      // Navigate after the toast has had a moment to show.
      // The host component in the layout survives the navigation.
      setTimeout(() => router.push('/subscriptions'), 1600)
    })
  }

  // font-size:16px prevents iOS Safari from zooming on focus
  const selectCls =
    'absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none text-[16px]'

  const currencySymbol = CURRENCIES.find(c => c.code === currency)?.symbol ?? currency

  return (
    <form onSubmit={handleSubmit} className="flex flex-col" style={{ minHeight: '100%', position: 'relative' }}>

      {/* ── Header: title + close ────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 pt-3 pb-3">
        <h2 className="text-[17px] font-semibold text-[#121212] dark:text-[#F2F2F7]">
          {mode === 'create' ? t('sheets.createNew') : t('sheets.editSubscription')}
        </h2>
        <button
          type="button"
          onClick={requestClose}
          className="w-11 h-11 rounded-full bg-[#F5F5F5] dark:bg-[#2C2C2E] flex items-center justify-center text-[#616161] dark:text-[#AEAEB2] transition-colors active:bg-[#EBEBEB] dark:active:bg-[#3A3A3C]"
        >
          <X size={16} strokeWidth={2.5} />
        </button>
      </div>

      {/* ── Scrollable body ──────────────────────────────────────────────── */}
      <div className="flex-1 pb-4">

        {/* Error */}
        {error && (
          <div
            ref={errorRef}
            className="mx-5 mb-3 flex items-start gap-2 bg-red-900/20 border border-red-800/40 text-red-400 text-sm rounded-2xl px-4 py-3"
          >
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* ── Hero card: name + price (no avatar) ─────────────────────── */}
        <div className="mx-5 mb-3 bg-[#F5F5F5] dark:bg-[#1C1C1E] rounded-2xl px-4 py-4 border border-[#F0F0F0] dark:border-[#2C2C2E]">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('form.subscriptionName')}
            autoFocus={false}
            className="w-full bg-transparent text-[17px] font-semibold text-[#121212] dark:text-[#F2F2F7] placeholder:text-[#BBBBBB] dark:placeholder:text-[#636366] outline-none leading-snug"
            style={{ fontSize: 17 }}
          />
          <div className="flex items-center gap-2 mt-2">
            {/* Currency — tappable pill with transparent select overlay */}
            <div className="relative flex-shrink-0">
              <span className="bg-[#E8E8E8] dark:bg-[#2C2C2E] text-[#555555] dark:text-[#AEAEB2] text-[15px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-0.5">
                {currencySymbol}
                <ChevronsUpDown size={11} className="text-[#737373] dark:text-[#8E8E93]" />
              </span>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none"
                style={{ fontSize: 16 }}
              >
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.symbol} {c.name}</option>
                ))}
              </select>
            </div>
            <input
              type="number"
              min="0"
              step="0.01"
              value={priceAmount}
              onChange={e => setPriceAmount(e.target.value)}
              placeholder="0.00"
              className="bg-transparent text-[17px] font-semibold text-[#121212] dark:text-[#F2F2F7] placeholder:text-[#BBBBBB] dark:placeholder:text-[#636366] outline-none flex-1 tabular-nums"
              style={{ fontSize: 17 }}
            />
          </div>
        </div>

        {/* ── Section 1: Billing ──────────────────────────────────────── */}
        <Section>
          {/* Inicio de suscripción */}
          <DateRow
            label={t('form.startDate')}
            value={startDate}
            onChange={setStartDate}
          />

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
                className="bg-[#F0F0F0] dark:bg-[#2C2C2E] rounded-xl px-3 py-1.5 text-[16px] text-[#121212] dark:text-[#F2F2F7] outline-none w-20 text-right tabular-nums" style={{ fontSize: 16 }}
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
              onChange={e => setCategory(e.target.value)}
              className={selectCls}
            >
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {t(`categories.${cat.value}` as Parameters<typeof t>[0])}
                </option>
              ))}
              {(() => {
                const extras = Array.from(new Set([
                  ...customCategories,
                  ...(!CATEGORIES.some(c => c.value === category) && category ? [category] : []),
                ]))
                return extras.length > 0 && (
                  <optgroup label="Personalizadas">
                    {extras.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </optgroup>
                )
              })()}
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
                  className="bg-[#F0F0F0] dark:bg-[#2C2C2E] rounded-xl px-3 py-1.5 text-[16px] text-[#121212] dark:text-[#F2F2F7] outline-none w-20 text-right tabular-nums" style={{ fontSize: 16 }}
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
                    className="bg-[#F0F0F0] dark:bg-[#2C2C2E] rounded-xl px-3 py-1.5 text-[16px] text-[#121212] dark:text-[#F2F2F7] placeholder:text-[#BBBBBB] dark:placeholder:text-[#636366] outline-none w-24 text-right tabular-nums" style={{ fontSize: 16 }}
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
              className="bg-transparent text-[16px] text-[#555555] dark:text-[#AEAEB2] placeholder:text-[#BBBBBB] dark:placeholder:text-[#636366] outline-none text-right w-40 truncate" style={{ fontSize: 16 }}
            />
            {logoUrl && (
              <button
                type="button"
                onClick={() => setLogoUrl('')}
                className="ml-1 flex-shrink-0 text-[#BBBBBB] dark:text-[#8E8E93] active:text-[#737373] transition-colors"
              >
                <X size={15} strokeWidth={2.5} />
              </button>
            )}
          </Row>
          <div className="px-4 py-3">
            <span className="text-[16px] text-[#121212] dark:text-[#F2F2F7]">{t('form.notes')}</span>
            <textarea
              value={notes}
              onChange={e => { setNotes(e.target.value); autoSize(e.currentTarget) }}
              onFocus={e => autoSize(e.currentTarget, 96)}
              onBlur={e => autoSize(e.currentTarget)}
              placeholder={t('form.notesPlaceholder')}
              rows={1}
              className="mt-2 block w-full resize-none bg-transparent text-[16px] text-[#555555] dark:text-[#AEAEB2] placeholder:text-[#BBBBBB] dark:placeholder:text-[#636366] outline-none leading-snug transition-[height] duration-150"
              style={{ fontSize: 16 }}
            />
          </div>
        </Section>

        {/* ── Status change (active mode — paused/cancelled) ──────────── */}
        {status === 'active' && (
          <div className="mx-5 mb-3 bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden border border-[#F0F0F0] dark:border-[#2C2C2E]">
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

        {/* ── Reminder ────────────────────────────────────────────────── */}
        <div className="mx-5 mb-3 bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden border border-[#F0F0F0] dark:border-[#2C2C2E]">
          <div className="flex items-center px-4 min-h-[52px] py-3">
            <Bell size={16} className="text-[#C0C0C0] dark:text-[#8E8E93] flex-shrink-0 mr-3" />
            <span className="text-[16px] text-[#121212] dark:text-[#F2F2F7] flex-1">{t('form.reminderToggle')}</span>
            <button
              type="button"
              role="switch"
              aria-checked={reminderOn}
              onClick={() => setReminderOn(v => !v)}
              className="relative flex-shrink-0 transition-colors duration-200"
              style={{ width: 44, height: 26, borderRadius: 13, background: reminderOn ? '#3D3BF3' : '#D1D1D6' }}
            >
              <motion.div
                layout
                transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                className="absolute top-[3px] w-5 h-5 rounded-full bg-white"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
                animate={{ left: reminderOn ? 21 : 3 }}
              />
            </button>
          </div>

          <AnimatePresence initial={false}>
            {reminderOn && (
              <motion.div
                key="days"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                style={{ overflow: 'hidden' }}
              >
                <div className="border-t border-[#F0F0F0] dark:border-[#2C2C2E] px-4 py-3.5">
                  <p className="text-[11px] font-semibold text-[#A0A0A0] dark:text-[#8E8E93] uppercase tracking-wider mb-3">
                    {t('form.reminderAdvance')}
                  </p>
                  <div className="flex gap-2">
                    {([1, 3, 10] as const).map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setReminderDays(d)}
                        className="flex-1 h-10 rounded-full text-[13px] font-semibold transition-colors"
                        style={{
                          background: reminderDays === d ? '#3D3BF3' : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                          color: reminderDays === d ? 'white' : isDark ? '#AEAEB2' : '#424242',
                        }}
                      >
                        {d} {d === 1 ? t('form.reminderDay') : t('form.reminderDays')}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Delete (edit mode) ──────────────────────────────────────── */}
        {mode === 'edit' && (
          <div className="mx-5 mb-3">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full h-12 rounded-2xl bg-[#F5F5F5] dark:bg-[#1C1C1E] text-red-500 dark:text-red-500 text-sm font-medium active:bg-[#EBEBEB] dark:active:bg-[#2C2C2E] transition-colors"
            >
              {t('form.delete')}
            </button>
          </div>
        )}

      </div>

      {/* ── Save + Cancel buttons — sticky at the bottom ────────────── */}
      <div
        className="flex-shrink-0 sticky bottom-0 px-5 pt-3 pb-4 bg-white dark:bg-[#1C1C1E] border-t border-[#F0F0F0] dark:border-[#2C2C2E]"
      >
        <div className="flex gap-3">
          <button
            type="button"
            onClick={requestClose}
            className="h-12 px-5 rounded-full border border-[#E8E8E8] dark:border-[#3A3A3C] text-[15px] font-medium text-[#444444] dark:text-[#AEAEB2] active:bg-[#F5F5F5] dark:active:bg-[#2C2C2E] transition-colors flex-shrink-0"
          >
            {t('form.cancel')}
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 h-12 rounded-full bg-[#3D3BF3] text-white text-[15px] font-semibold disabled:opacity-40 active:bg-[#3230D0] transition-colors"
          >
            {isPending ? (
              <span className="inline-flex items-center justify-center gap-1" aria-label="Loading">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" />
              </span>
            ) : t(mode === 'create' ? 'form.createSubscription' : 'form.saveChanges')}
          </button>
        </div>
      </div>

      {/* ── Delete confirmation — half-modal ─────────────────────────── */}
      {showDeleteConfirm && (
        <div
          className="absolute inset-0 z-10 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="w-full bg-white dark:bg-[#1C1C1E] rounded-t-[32px] px-5 pt-5 pb-4"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-[17px] font-semibold text-[#121212] dark:text-[#F2F2F7] mb-1">
              {t('form.deleteTitle')}
            </h3>
            <p className="text-[14px] text-[#737373] dark:text-[#AEAEB2] mb-5">
              {t('form.deleteMessage')}
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="w-full h-12 rounded-full bg-red-500 text-white text-[15px] font-semibold active:opacity-80 transition-opacity disabled:opacity-40"
              >
                {t('form.confirmDelete')}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="w-full h-12 rounded-full bg-[#F5F5F5] dark:bg-[#2C2C2E] text-[#121212] dark:text-[#F2F2F7] text-[15px] font-medium active:opacity-80 transition-opacity"
              >
                {t('form.keepIt')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Discard changes confirmation ─────────────────────────────── */}
      {showCancelConfirm && (
        <div
          className="absolute inset-0 z-10 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setShowCancelConfirm(false)}
        >
          <div
            className="w-full bg-white dark:bg-[#1C1C1E] rounded-t-[32px] px-5 pt-5 pb-4"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-[17px] font-semibold text-[#121212] dark:text-[#F2F2F7] mb-1">
              {t('form.discardTitle')}
            </h3>
            <p className="text-[14px] text-[#737373] dark:text-[#AEAEB2] mb-5">
              {t('form.discardMessage')}
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => { if (onCancel) onCancel(); else router.back() }}
                className="w-full h-12 rounded-full bg-red-500 text-white text-[15px] font-semibold active:opacity-80 transition-opacity"
              >
                {t('form.discardConfirm')}
              </button>
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                className="w-full h-12 rounded-full bg-[#F5F5F5] dark:bg-[#2C2C2E] text-[#121212] dark:text-[#F2F2F7] text-[15px] font-medium active:opacity-80 transition-opacity"
              >
                {t('form.keepEditing')}
              </button>
            </div>
          </div>
        </div>
      )}

    </form>
  )
}
