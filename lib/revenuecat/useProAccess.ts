'use client'
// ─── useProAccess ─────────────────────────────────────────────────────────────
// Primary hook for checking Pro status anywhere in the app.
//
// Usage:
//   const { isPro, isLoading } = useProAccess()

import { useSubscription } from './SubscriptionProvider'

export function useProAccess() {
  const { isPro, isLoading, refresh, openPaywall } = useSubscription()
  return { isPro, isLoading, refresh, openPaywall }
}
