'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createSubscription, updateSubscription, deleteSubscription } from '@/app/(dashboard)/subscriptions/actions'
import { Button } from '@/components/ui/Button'
import { CATEGORIES } from '@/lib/constants/categories'
import { CURRENCIES, BILLING_PERIOD_LABELS } from '@/lib/constants/currencies'
import { AlertCircle, Calendar, ChevronDown, ChevronUp, ChevronRight, Check } from 'lucide-react'
import type { Subscription, BillingPeriod, SubscriptionStatus, UserShareMode, Category } from '@/types'
import type { PlatformPreset } from '@/lib/constants/platforms'
import { getPlatformLogoUrl } from '@/lib/constants/platforms'
import { CARD_COLOR_PRESETS } from '@/components/subscriptions/SubscriptionCard'

interface SubscriptionFormProps {
  subscription?: Subscription
  mode: 'create' | 'edit'
  /** Pre-filled data from platform picker (create mode only) */
  platformPreset?: PlatformPreset
  /** Called when user cancels — closes bottom sheet or navigates back */
  onCancel?: () => void
}

export default function SubscriptionForm({
  subscription,
  mode,
  platformPreset,
  onCancel,
}: SubscriptionFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showMore, setShowMore] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showAllCategories, setShowAllCategories] = useState(false)

  // Derive initial logo URL: explicit > platform preset > empty
  const initialLogoUrl =
    subscription?.logo_url ??
    (platformPreset ? getPlatformLogoUrl(platformPreset.domain) : '')

  // ── Primary state ─────────────────────────────────────────
  const [name, setName] = useState(
    subscription?.name ?? platformPreset?.name ?? ''
  )
  const [priceAmount, setPriceAmount] = useState(
    subscription?.price_amount?.toString() ??
    platformPreset?.defaultPrice?.toString() ?? ''
  )
  const [currency, setCurrency] = useState(subscription?.currency ?? 'EUR')
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>(
    subscription?.billing_period ?? platformPreset?.defaultBillingPeriod ?? 'monthly'
  )
  const [category, setCategory] = useState<Category>(
    subscription?.category ?? platformPreset?.category ?? 'other'
  )
  const [nextBillingDate, setNextBillingDate] = useState(
    subscription?.next_billing_date ?? ''
  )

  // ── Secondary state (More options) ────────────────────────
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl)
  const [status, setStatus] = useState<SubscriptionStatus>(
    subscription?.status ?? 'active'
  )
  const [billingIntervalCount, setBillingIntervalCount] = useState(
    subscription?.billing_interval_count?.toString() ?? '1'
  )
  const [isShared, setIsShared] = useState(subscription?.is_shared ?? false)
  const [sharedWithCount, setSharedWithCount] = useState(
    subscription?.shared_with_count?.toString() ?? '2'
  )
  const [userShareMode, setUserShareMode] = useState<UserShareMode>(
    subscription?.user_share_mode ?? 'split_evenly'
  )
  const [userShareAmount, setUserShareAmount] = useState(
    subscription?.user_share_amount?.toString() ?? ''
  )
  const [trialEndDate, setTrialEndDate] = useState(
    subscription?.trial_end_date ?? ''
  )
  const [notes, setNotes] = useState(subscription?.notes ?? '')
  const [cardColor, setCardColor] = useState<string | null>(subscription?.card_color ?? null)

  // ── Helpers ───────────────────────────────────────────────
  function buildPayload() {
    return {
      name: name.trim(),
      logo_url: logoUrl.trim() || null,
      card_color: cardColor,
      category,
      price_amount: parseFloat(priceAmount) || 0,
      currency,
      billing_period: billingPeriod,
      billing_interval_count: parseInt(billingIntervalCount) || 1,
      next_billing_date: nextBillingDate || null,
      trial_end_date: trialEndDate || null,
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
    if (!name.trim()) { setError('Name is required.'); return }
    if (!priceAmount || parseFloat(priceAmount) < 0) { setError('Enter a valid price.'); return }

    startTransition(async () => {
      const result =
        mode === 'create'
          ? await createSubscription(buildPayload())
          : await updateSubscription(subscription!.id, buildPayload())
      if (result?.error) setError(result.error)
    })
  }

  async function handleDelete() {
    startTransition(async () => {
      const result = await deleteSubscription(subscription!.id)
      if (result?.error) setError(result.error)
    })
  }

  const moreOptionsCount = [
    logoUrl,
    status !== 'active' ? status : '',
    isShared ? 'shared' : '',
    notes,
    trialEndDate,
  ].filter(Boolean).length

  // ── Shared input style ────────────────────────────────────
  const inputCls =
    'w-full px-3.5 py-2.5 border border-[#D4D4D4] rounded-xl text-sm text-[#121212] placeholder:text-[#A3A3A3] focus:outline-none focus:ring-2 focus:ring-[#121212]/10 focus:border-[#121212] transition-all bg-white'

  const labelCls = 'text-xs font-medium text-[#424242] block mb-1.5'

  return (
    <form onSubmit={handleSubmit} className="px-5 py-4 space-y-5 pb-10">
      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-[#991B1B] text-sm rounded-xl px-4 py-3">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* ── Name ─────────────────────────────────────────── */}
      <div>
        <label className={labelCls}>Name *</label>
        <input
          type="text"
          placeholder="Netflix, Spotify, Notion…"
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus={mode === 'create' && !platformPreset?.name}
          className={inputCls}
          required
        />
      </div>

      {/* ── Card colour ───────────────────────────────────── */}
      <div>
        <label className={labelCls}>Card color</label>
        <div className="flex gap-2.5 flex-wrap">
          {CARD_COLOR_PRESETS.map(preset => {
            const isSelected = cardColor === preset.hex
            return (
              <button
                key={preset.hex ?? 'white'}
                type="button"
                title={preset.label}
                onClick={() => setCardColor(preset.hex)}
                className="relative w-9 h-9 rounded-full transition-all duration-150 focus:outline-none"
                style={{
                  background: preset.theme.bg,
                  border: isSelected
                    ? '2.5px solid #111111'
                    : `1.5px solid ${preset.hex ? '#D4D4D4' : '#D4D4D4'}`,
                  boxShadow: isSelected ? '0 0 0 3px rgba(0,0,0,0.12)' : 'none',
                }}
              >
                {isSelected && (
                  <Check
                    size={14}
                    strokeWidth={2.5}
                    style={{ position: 'absolute', inset: 0, margin: 'auto', color: preset.theme.title }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Amount + Currency + Period (inline row) ───────── */}
      <div>
        <label className={labelCls}>Amount *</label>
        <div className="flex rounded-xl border border-[#D4D4D4] focus-within:ring-2 focus-within:ring-[#121212]/10 focus-within:border-[#121212] transition-all overflow-hidden bg-white">
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="9.99"
            value={priceAmount}
            onChange={e => setPriceAmount(e.target.value)}
            className="flex-1 px-3.5 py-2.5 text-sm text-[#121212] placeholder:text-[#A3A3A3] outline-none bg-transparent min-w-0"
            required
          />
          <select
            value={currency}
            onChange={e => setCurrency(e.target.value)}
            className="px-2 py-2.5 text-sm text-[#424242] bg-[#F5F5F5] border-l border-[#D4D4D4] outline-none cursor-pointer"
          >
            {CURRENCIES.map(c => (
              <option key={c.code} value={c.code}>{c.code}</option>
            ))}
          </select>
          <select
            value={billingPeriod}
            onChange={e => setBillingPeriod(e.target.value as BillingPeriod)}
            className="px-2 py-2.5 text-sm text-[#424242] bg-[#F5F5F5] border-l border-[#D4D4D4] outline-none cursor-pointer"
          >
            {Object.entries(BILLING_PERIOD_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Custom interval */}
      {billingPeriod === 'custom' && (
        <div>
          <label className={labelCls}>Every N months</label>
          <input
            type="number"
            min="1"
            placeholder="6"
            value={billingIntervalCount}
            onChange={e => setBillingIntervalCount(e.target.value)}
            className={inputCls}
          />
          <p className="text-xs text-[#616161] mt-1">E.g. 6 = billed every 6 months</p>
        </div>
      )}

      {/* ── Category (horizontal scroll → "View all" grid) ── */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className={labelCls + ' mb-0'}>Category</p>
          <button
            type="button"
            onClick={() => setShowAllCategories(v => !v)}
            className="text-xs text-[#616161] hover:text-[#121212] transition-colors"
          >
            {showAllCategories ? 'Show less' : 'View all'}
          </button>
        </div>

        {!showAllCategories ? (
          /* Horizontal scroll strip */
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-hide">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon
              const active = category === cat.value
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`
                    flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium
                    border transition-colors duration-150
                    ${active
                      ? 'bg-[#121212] text-white border-[#121212]'
                      : 'bg-white text-[#424242] border-[#D4D4D4] hover:border-[#A3A3A3]'
                    }
                  `}
                >
                  <Icon size={12} strokeWidth={2} />
                  {cat.label}
                </button>
              )
            })}
          </div>
        ) : (
          /* Expanded 3-column grid */
          <div className="grid grid-cols-3 gap-1.5 animate-fade-in">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon
              const active = category === cat.value
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`
                    flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium
                    border transition-colors duration-150
                    ${active
                      ? 'bg-[#121212] text-white border-[#121212]'
                      : 'bg-white text-[#424242] border-[#D4D4D4] hover:border-[#A3A3A3]'
                    }
                  `}
                >
                  <Icon size={12} strokeWidth={2} />
                  {cat.label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Next billing date ─────────────────────────────── */}
      <div>
        <label className={labelCls}>Next billing date</label>
        <div className="relative">
          <Calendar
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A3A3A3] pointer-events-none"
          />
          <input
            type="date"
            value={nextBillingDate}
            onChange={e => setNextBillingDate(e.target.value)}
            className={inputCls + ' pl-10'}
          />
        </div>
      </div>

      {/* ── More options (clean expandable section) ───────── */}
      <div>
        <button
          type="button"
          onClick={() => setShowMore(v => !v)}
          className="w-full flex items-center justify-between py-2 text-sm font-medium text-[#616161] hover:text-[#121212] transition-colors"
        >
          <span className="flex items-center gap-2">
            More options
            {moreOptionsCount > 0 && !showMore && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#121212] text-white text-[10px] font-bold">
                {moreOptionsCount}
              </span>
            )}
          </span>
          {showMore ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        <div
          className="overflow-hidden transition-all duration-300 ease-in-out"
          style={{ maxHeight: showMore ? '1000px' : '0' }}
        >
          <div className="space-y-4 pt-3 border-t border-[#F0F0F0]">

            {/* Status */}
            <div>
              <label className={labelCls}>Status</label>
              <div className="relative">
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as SubscriptionStatus)}
                  className={inputCls + ' appearance-none pr-9'}
                >
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="paused">Paused</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <ChevronRight
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A3A3A3] pointer-events-none rotate-90"
                />
              </div>
            </div>

            {/* Trial end date */}
            {status === 'trial' && (
              <div>
                <label className={labelCls}>Trial end date</label>
                <div className="relative">
                  <Calendar
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A3A3A3] pointer-events-none"
                  />
                  <input
                    type="date"
                    value={trialEndDate}
                    onChange={e => setTrialEndDate(e.target.value)}
                    className={inputCls + ' pl-10'}
                  />
                </div>
              </div>
            )}

            {/* Sharing toggle */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative flex-shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={isShared}
                    onChange={e => setIsShared(e.target.checked)}
                  />
                  <div className="
                    w-9 h-5 bg-[#D4D4D4] rounded-full
                    peer-checked:bg-[#121212]
                    after:content-[''] after:absolute after:top-0.5 after:left-0.5
                    after:bg-white after:rounded-full after:h-4 after:w-4
                    after:transition-all peer-checked:after:translate-x-4
                    transition-colors duration-200
                  " />
                </div>
                <span className="text-sm font-medium text-[#121212]">Shared subscription</span>
              </label>

              {isShared && (
                <div className="pl-4 border-l-2 border-[#E5E5E5] space-y-3 animate-fade-in">
                  <div>
                    <label className={labelCls}>People sharing (including you)</label>
                    <input
                      type="number"
                      min="2"
                      value={sharedWithCount}
                      onChange={e => setSharedWithCount(e.target.value)}
                      className={inputCls}
                    />
                    <p className="text-xs text-[#616161] mt-1">Minimum 2</p>
                  </div>
                  <div>
                    <label className={labelCls}>Split mode</label>
                    <div className="relative">
                      <select
                        value={userShareMode}
                        onChange={e => setUserShareMode(e.target.value as UserShareMode)}
                        className={inputCls + ' appearance-none pr-9'}
                      >
                        <option value="split_evenly">Split evenly</option>
                        <option value="custom">Custom amount</option>
                      </select>
                      <ChevronRight
                        size={14}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A3A3A3] pointer-events-none rotate-90"
                      />
                    </div>
                  </div>
                  {userShareMode === 'custom' && (
                    <div>
                      <label className={labelCls}>My share ({currency})</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="4.99"
                        value={userShareAmount}
                        onChange={e => setUserShareAmount(e.target.value)}
                        className={inputCls}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Logo URL */}
            <div>
              <label className={labelCls}>Logo URL</label>
              <input
                type="url"
                placeholder="https://…"
                value={logoUrl}
                onChange={e => setLogoUrl(e.target.value)}
                className={inputCls}
              />
              <p className="text-xs text-[#A3A3A3] mt-1">
                Auto-filled for known platforms. Initials shown if blank.
              </p>
            </div>

            {/* Notes */}
            <div>
              <label className={labelCls}>Notes</label>
              <textarea
                rows={3}
                placeholder="Anything worth remembering…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className={inputCls + ' resize-none'}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Actions ───────────────────────────────────────── */}
      <div className="space-y-3 pt-1">
        <div className="flex gap-2">
          <Button type="submit" loading={isPending} className="flex-1">
            {mode === 'create' ? 'Add subscription' : 'Save changes'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel ?? (() => router.back())}
            disabled={isPending}
          >
            Cancel
          </Button>
        </div>

        {/* Delete — separated visually, below main CTAs */}
        {mode === 'edit' && (
          <div className="border-t border-[#F0F0F0] pt-3">
            {showDeleteConfirm ? (
              <div className="flex gap-2 animate-fade-in">
                <Button
                  type="button"
                  variant="danger"
                  onClick={handleDelete}
                  loading={isPending}
                  className="flex-1"
                >
                  Confirm delete
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Keep it
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-2 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
              >
                Delete subscription
              </button>
            )}
          </div>
        )}
      </div>
    </form>
  )
}
