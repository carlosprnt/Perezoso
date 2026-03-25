'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createSubscription, updateSubscription, deleteSubscription } from '@/app/(dashboard)/subscriptions/actions'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { CATEGORIES } from '@/lib/constants/categories'
import { CURRENCIES, BILLING_PERIOD_LABELS } from '@/lib/constants/currencies'
import LogoAvatar from '@/components/ui/LogoAvatar'
import { Trash2 } from 'lucide-react'
import type { Subscription, BillingPeriod, SubscriptionStatus, UserShareMode, Category } from '@/types'

interface SubscriptionFormProps {
  subscription?: Subscription
  mode: 'create' | 'edit'
}

export default function SubscriptionForm({ subscription, mode }: SubscriptionFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Form state
  const [name, setName]               = useState(subscription?.name ?? '')
  const [logoUrl, setLogoUrl]         = useState(subscription?.logo_url ?? '')
  const [category, setCategory]       = useState<Category>(subscription?.category ?? 'other')
  const [priceAmount, setPriceAmount] = useState(subscription?.price_amount?.toString() ?? '')
  const [currency, setCurrency]       = useState(subscription?.currency ?? 'EUR')
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>(subscription?.billing_period ?? 'monthly')
  const [billingIntervalCount, setBillingIntervalCount] = useState(subscription?.billing_interval_count?.toString() ?? '1')
  const [nextBillingDate, setNextBillingDate] = useState(subscription?.next_billing_date ?? '')
  const [trialEndDate, setTrialEndDate] = useState(subscription?.trial_end_date ?? '')
  const [status, setStatus]           = useState<SubscriptionStatus>(subscription?.status ?? 'active')
  const [isShared, setIsShared]       = useState(subscription?.is_shared ?? false)
  const [sharedWithCount, setSharedWithCount] = useState(subscription?.shared_with_count?.toString() ?? '2')
  const [userShareMode, setUserShareMode] = useState<UserShareMode>(subscription?.user_share_mode ?? 'split_evenly')
  const [userShareAmount, setUserShareAmount] = useState(subscription?.user_share_amount?.toString() ?? '')
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
      user_share_amount:
        isShared && userShareMode === 'custom' ? parseFloat(userShareAmount) || null : null,
      notes: notes.trim() || null,
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Name is required.')
      return
    }
    if (!priceAmount || parseFloat(priceAmount) < 0) {
      setError('Enter a valid price.')
      return
    }

    const payload = buildPayload()

    startTransition(async () => {
      const result =
        mode === 'create'
          ? await createSubscription(payload)
          : await updateSubscription(subscription!.id, payload)

      if (result?.error) {
        setError(result.error)
      }
      // On success, actions redirect automatically
    })
  }

  async function handleDelete() {
    startTransition(async () => {
      const result = await deleteSubscription(subscription!.id)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Preview */}
      {name && (
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
          <LogoAvatar name={name} logoUrl={logoUrl || null} size="lg" />
          <div>
            <p className="text-base font-semibold text-gray-900">{name}</p>
            <p className="text-sm text-gray-400">
              {priceAmount ? `${currency} ${priceAmount}` : '—'} / {BILLING_PERIOD_LABELS[billingPeriod]}
            </p>
          </div>
        </div>
      )}

      {/* Basic info */}
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Basic info</h3>
        <div className="space-y-3">
          <Input
            label="Name *"
            placeholder="Netflix, Spotify…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Logo URL"
            placeholder="https://…"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            hint="Optional. Leave blank to use auto-generated initials."
          />
          <div className="w-full">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Category</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
              {CATEGORIES.map(({ value, label, emoji, color, textColor }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCategory(value)}
                  className={`
                    flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium
                    border transition-all duration-150
                    ${category === value
                      ? `${color} ${textColor} border-current`
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }
                  `}
                >
                  <span>{emoji}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Pricing</h3>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Amount *"
            type="number"
            min="0"
            step="0.01"
            placeholder="9.99"
            value={priceAmount}
            onChange={(e) => setPriceAmount(e.target.value)}
            required
          />
          <Select
            label="Currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.symbol}
              </option>
            ))}
          </Select>
          <Select
            label="Billing period"
            value={billingPeriod}
            onChange={(e) => setBillingPeriod(e.target.value as BillingPeriod)}
          >
            {Object.entries(BILLING_PERIOD_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
          {billingPeriod === 'custom' && (
            <Input
              label="Every N months"
              type="number"
              min="1"
              placeholder="6"
              value={billingIntervalCount}
              onChange={(e) => setBillingIntervalCount(e.target.value)}
              hint="E.g. 6 = every 6 months"
            />
          )}
        </div>
      </section>

      {/* Dates & status */}
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Dates & status</h3>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Next billing date"
            type="date"
            value={nextBillingDate}
            onChange={(e) => setNextBillingDate(e.target.value)}
          />
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}
          >
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
              onChange={(e) => setTrialEndDate(e.target.value)}
            />
          )}
        </div>
      </section>

      {/* Sharing */}
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Sharing</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={isShared}
                onChange={(e) => setIsShared(e.target.checked)}
              />
              <div className="
                w-10 h-6 bg-gray-200 rounded-full
                peer-checked:bg-indigo-600
                after:content-[''] after:absolute after:top-0.5 after:left-0.5
                after:bg-white after:rounded-full after:h-5 after:w-5
                after:transition-all peer-checked:after:translate-x-4
                transition-colors duration-200
              " />
            </div>
            <span className="text-sm font-medium text-gray-700">Shared subscription</span>
          </label>

          {isShared && (
            <div className="pl-4 border-l-2 border-indigo-100 space-y-3">
              <Input
                label="Number of people (including you)"
                type="number"
                min="2"
                value={sharedWithCount}
                onChange={(e) => setSharedWithCount(e.target.value)}
                hint="Minimum 2"
              />
              <Select
                label="Split mode"
                value={userShareMode}
                onChange={(e) => setUserShareMode(e.target.value as UserShareMode)}
              >
                <option value="split_evenly">Split evenly</option>
                <option value="custom">Custom amount</option>
              </Select>
              {userShareMode === 'custom' && (
                <Input
                  label={`My share (${currency})`}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="4.99"
                  value={userShareAmount}
                  onChange={(e) => setUserShareAmount(e.target.value)}
                  hint="The amount you personally pay per billing period"
                />
              )}
            </div>
          )}
        </div>
      </section>

      {/* Notes */}
      <section>
        <Textarea
          label="Notes"
          placeholder="Anything worth remembering…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </section>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" loading={isPending} className="flex-1">
          {mode === 'create' ? 'Add subscription' : 'Save changes'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </Button>
        {mode === 'edit' && (
          <>
            {showDeleteConfirm ? (
              <Button
                type="button"
                variant="danger"
                onClick={handleDelete}
                loading={isPending}
                icon={<Trash2 size={14} />}
              >
                Confirm delete
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowDeleteConfirm(true)}
                icon={<Trash2 size={14} />}
                className="text-red-500 hover:bg-red-50 hover:text-red-600"
              >
                Delete
              </Button>
            )}
          </>
        )}
      </div>
    </form>
  )
}
