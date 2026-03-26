'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createSubscription, updateSubscription, deleteSubscription } from '@/app/(dashboard)/subscriptions/actions'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { CATEGORIES } from '@/lib/constants/categories'
import { CURRENCIES, BILLING_PERIOD_LABELS } from '@/lib/constants/currencies'
import LogoAvatar from '@/components/ui/LogoAvatar'
import { ChevronDown, ChevronUp, Trash2, AlertCircle } from 'lucide-react'
import type { Subscription, BillingPeriod, SubscriptionStatus, UserShareMode, Category } from '@/types'

interface SubscriptionFormProps {
  subscription?: Subscription
  mode: 'create' | 'edit'
}

export default function SubscriptionForm({ subscription, mode }: SubscriptionFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showMore, setShowMore] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Primary fields
  const [name, setName]               = useState(subscription?.name ?? '')
  const [priceAmount, setPriceAmount] = useState(subscription?.price_amount?.toString() ?? '')
  const [currency, setCurrency]       = useState(subscription?.currency ?? 'EUR')
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>(subscription?.billing_period ?? 'monthly')
  const [category, setCategory]       = useState<Category>(subscription?.category ?? 'other')
  const [nextBillingDate, setNextBillingDate] = useState(subscription?.next_billing_date ?? '')

  // Secondary fields (More options)
  const [logoUrl, setLogoUrl]         = useState(subscription?.logo_url ?? '')
  const [status, setStatus]           = useState<SubscriptionStatus>(subscription?.status ?? 'active')
  const [billingIntervalCount, setBillingIntervalCount] = useState(subscription?.billing_interval_count?.toString() ?? '1')
  const [isShared, setIsShared]       = useState(subscription?.is_shared ?? false)
  const [sharedWithCount, setSharedWithCount] = useState(subscription?.shared_with_count?.toString() ?? '2')
  const [userShareMode, setUserShareMode] = useState<UserShareMode>(subscription?.user_share_mode ?? 'split_evenly')
  const [userShareAmount, setUserShareAmount] = useState(subscription?.user_share_amount?.toString() ?? '')
  const [trialEndDate, setTrialEndDate] = useState(subscription?.trial_end_date ?? '')
  const [notes, setNotes]             = useState(subscription?.notes ?? '')

  function buildPayload() {
    return {
      name: name.trim(),
      logo_url: logoUrl.trim() || null,
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
      user_share_mode: isShared ? userShareMode : 'split_evenly' as UserShareMode,
      user_share_amount: isShared && userShareMode === 'custom' ? parseFloat(userShareAmount) || null : null,
      notes: notes.trim() || null,
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim())                         { setError('Name is required.'); return }
    if (!priceAmount || parseFloat(priceAmount) < 0) { setError('Enter a valid price.'); return }

    startTransition(async () => {
      const result = mode === 'create'
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

  // Count how many secondary fields have non-default values
  const moreOptionsCount = [
    logoUrl, status !== 'active' ? status : '',
    isShared ? 'shared' : '', notes, trialEndDate,
  ].filter(Boolean).length

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-[#991B1B] text-sm rounded-xl px-4 py-3">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Live preview */}
      {name && (
        <div className="flex items-center gap-3 p-3 bg-[#FAFAFA] border border-[#E5E5E5] rounded-2xl animate-fade-in">
          <LogoAvatar name={name} logoUrl={logoUrl || null} size="lg" />
          <div>
            <p className="text-sm font-semibold text-[#121212]">{name}</p>
            <p className="text-xs text-[#616161]">
              {priceAmount ? `${currency} ${priceAmount}` : '—'} / {BILLING_PERIOD_LABELS[billingPeriod]}
            </p>
          </div>
        </div>
      )}

      {/* ── PRIMARY FIELDS ─────────────────────── */}
      <Input
        label="Name *"
        placeholder="Netflix, Spotify, Notion…"
        value={name}
        onChange={e => setName(e.target.value)}
        autoFocus={mode === 'create'}
        required
      />

      {/* Price row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-1">
          <Input
            label="Amount *"
            type="number"
            min="0"
            step="0.01"
            placeholder="9.99"
            value={priceAmount}
            onChange={e => setPriceAmount(e.target.value)}
            required
          />
        </div>
        <div className="col-span-1">
          <Select label="Currency" value={currency} onChange={e => setCurrency(e.target.value)}>
            {CURRENCIES.map(c => (
              <option key={c.code} value={c.code}>{c.code}</option>
            ))}
          </Select>
        </div>
        <div className="col-span-1">
          <Select label="Period" value={billingPeriod} onChange={e => setBillingPeriod(e.target.value as BillingPeriod)}>
            {Object.entries(BILLING_PERIOD_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        </div>
      </div>

      {billingPeriod === 'custom' && (
        <Input
          label="Every N months"
          type="number" min="1" placeholder="6"
          value={billingIntervalCount}
          onChange={e => setBillingIntervalCount(e.target.value)}
          hint="E.g. 6 = billed every 6 months"
        />
      )}

      {/* Category picker */}
      <div>
        <p className="text-xs font-medium text-[#424242] mb-1.5">Category</p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
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
                <Icon size={13} strokeWidth={2} />
                {cat.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Next billing date */}
      <Input
        label="Next billing date"
        type="date"
        value={nextBillingDate}
        onChange={e => setNextBillingDate(e.target.value)}
      />

      {/* ── MORE OPTIONS ──────────────────────── */}
      <div className="border border-[#E5E5E5] rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowMore(v => !v)}
          className="
            w-full flex items-center justify-between px-4 py-3
            text-sm font-medium text-[#424242]
            hover:bg-[#FAFAFA] transition-colors duration-150
          "
        >
          <span className="flex items-center gap-2">
            {showMore ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            More options
            {moreOptionsCount > 0 && !showMore && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#121212] text-white text-[10px] font-bold">
                {moreOptionsCount}
              </span>
            )}
          </span>
        </button>

        {/* Expandable section */}
        <div
          className="overflow-hidden transition-all duration-300"
          style={{ maxHeight: showMore ? '800px' : '0' }}
        >
          <div className="px-4 pb-4 pt-1 space-y-4 border-t border-[#E5E5E5]">
            {/* Status */}
            <Select label="Status" value={status} onChange={e => setStatus(e.target.value as SubscriptionStatus)}>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="paused">Paused</option>
              <option value="cancelled">Cancelled</option>
            </Select>

            {status === 'trial' && (
              <Input
                label="Trial end date"
                type="date"
                value={trialEndDate}
                onChange={e => setTrialEndDate(e.target.value)}
              />
            )}

            {/* Sharing */}
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
                  <Input
                    label="Number of people (including you)"
                    type="number" min="2"
                    value={sharedWithCount}
                    onChange={e => setSharedWithCount(e.target.value)}
                    hint="Minimum 2"
                  />
                  <Select label="Split mode" value={userShareMode} onChange={e => setUserShareMode(e.target.value as UserShareMode)}>
                    <option value="split_evenly">Split evenly</option>
                    <option value="custom">Custom amount</option>
                  </Select>
                  {userShareMode === 'custom' && (
                    <Input
                      label={`My share (${currency})`}
                      type="number" min="0" step="0.01" placeholder="4.99"
                      value={userShareAmount}
                      onChange={e => setUserShareAmount(e.target.value)}
                      hint="Amount you pay per billing period"
                    />
                  )}
                </div>
              )}
            </div>

            {/* Logo URL */}
            <Input
              label="Logo URL"
              placeholder="https://…"
              value={logoUrl}
              onChange={e => setLogoUrl(e.target.value)}
              hint="Optional. Auto-generated initials shown if blank."
            />

            {/* Notes */}
            <Textarea
              label="Notes"
              placeholder="Anything worth remembering…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── ACTIONS ────────────────────────────── */}
      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" loading={isPending} className="flex-1">
          {mode === 'create' ? 'Add subscription' : 'Save changes'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()} disabled={isPending}>
          Cancel
        </Button>

        {mode === 'edit' && (
          showDeleteConfirm ? (
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              loading={isPending}
              icon={<Trash2 size={14} />}
            >
              Confirm
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowDeleteConfirm(true)}
              icon={<Trash2 size={14} />}
              className="text-[#991B1B] hover:bg-red-50"
            >
              Delete
            </Button>
          )
        )}
      </div>
    </form>
  )
}
