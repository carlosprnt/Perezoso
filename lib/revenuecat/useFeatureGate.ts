'use client'
// ─── useFeatureGate ───────────────────────────────────────────────────────────
// Hook for gating specific features behind Pro.
//
// Usage:
//   const gate = useFeatureGate()
//
//   // Boolean check
//   gate.canAddSubscription(currentCount)  // false when count >= 15 and not Pro
//
//   // Gate + open paywall if needed (returns true if allowed)
//   const ok = gate.requirePro('renewal_reminders')
//   if (!ok) return  // paywall already opened

import { useCallback } from 'react'
import { useSubscription } from './SubscriptionProvider'
import { GATES } from './config'
import type { PaywallTrigger } from './paywallTriggers'

export function useFeatureGate() {
  const { isPro, openPaywall } = useSubscription()

  /** Returns true if the user can add another subscription */
  const canAddSubscription = useCallback(
    (currentCount: number) => isPro || currentCount < GATES.MAX_FREE_SUBSCRIPTIONS,
    [isPro]
  )

  /** Returns true if user can see this savings recommendation index (0-based) */
  const canSeeSavingsRec = useCallback(
    (index: number) => isPro || index < GATES.MAX_FREE_SAVINGS_RECS,
    [isPro]
  )

  /** Returns true if user can navigate to a future calendar month */
  const canViewFutureMonth = useCallback(
    (monthOffset: number) => isPro || monthOffset <= 0,
    [isPro]
  )

  /**
   * Generic Pro gate. Opens paywall if not Pro.
   * Returns true if the action should proceed.
   */
  const requirePro = useCallback(
    (trigger: PaywallTrigger): boolean => {
      if (isPro) return true
      openPaywall(trigger)
      return false
    },
    [isPro, openPaywall]
  )

  /**
   * Gate for subscription limit. Opens paywall if limit reached.
   * Returns true if the action should proceed.
   */
  const requireSubscriptionSlot = useCallback(
    (currentCount: number): boolean => {
      if (isPro || currentCount < GATES.MAX_FREE_SUBSCRIPTIONS) return true
      openPaywall('subscription_limit')
      return false
    },
    [isPro, openPaywall]
  )

  return {
    isPro,
    canAddSubscription,
    canSeeSavingsRec,
    canViewFutureMonth,
    requirePro,
    requireSubscriptionSlot,
  }
}
