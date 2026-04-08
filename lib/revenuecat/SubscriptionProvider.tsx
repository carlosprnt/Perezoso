'use client'
// ─── SubscriptionProvider ────────────────────────────────────────────────────
// Single source of truth for Pro status throughout the app.
//
// Native (Capacitor):  reads from RevenueCat SDK on mount + on app foreground
// Web:                 reads from Supabase profile.is_pro (set by RC webhook)
//
// Exposes:
//   isPro        — boolean
//   isLoading    — boolean (first check in progress)
//   openPaywall  — (trigger) => void
//   customerInfo — raw RC CustomerInfo | null

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import { isCapacitor } from '@/lib/platform'
import {
  initRevenueCat,
  isEntitlementActive,
} from './client'
import type { PaywallTrigger } from './paywallTriggers'

interface SubscriptionCtx {
  isPro:       boolean
  isLoading:   boolean
  refresh:     () => Promise<void>
  openPaywall: (trigger?: PaywallTrigger) => void
  // Internal — set by PaywallSheet once mounted
  _setPaywallOpen: (open: boolean, trigger: PaywallTrigger) => void
}

const Ctx = createContext<SubscriptionCtx>({
  isPro:           false,
  isLoading:       true,
  refresh:         async () => {},
  openPaywall:     () => {},
  _setPaywallOpen: () => {},
})

export function useSubscription() {
  return useContext(Ctx)
}

interface Props {
  children:     ReactNode
  /** Supabase user id — used to identify the user in RevenueCat */
  userId?:      string
  /** Server-side Pro status from Supabase profile (web fallback) */
  initialIsPro?: boolean
}

export function SubscriptionProvider({ children, userId, initialIsPro = false }: Props) {
  const [isPro, setIsPro]         = useState(initialIsPro)
  const [isLoading, setIsLoading] = useState(!initialIsPro)
  const [paywallOpen, setPaywallOpenState]   = useState(false)
  const [paywallTrigger, setPaywallTrigger]  = useState<PaywallTrigger>('general')
  const initialized = useRef(false)

  const refresh = useCallback(async () => {
    if (!isCapacitor()) return   // web: trust DB value, no RC SDK to query
    const active = await isEntitlementActive()
    setIsPro(active)
  }, [])

  // Init on mount
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    async function init() {
      setIsLoading(true)
      try {
        if (isCapacitor() && userId) {
          await initRevenueCat(userId)
          const active = await isEntitlementActive()
          setIsPro(active)
        } else {
          // Web: initialIsPro already set from server component
          setIsPro(initialIsPro)
        }
      } catch (e) {
        console.error('[RevenueCat] init error', e)
      } finally {
        setIsLoading(false)
      }
    }

    init()
  }, [userId, initialIsPro])

  const _setPaywallOpen = useCallback((open: boolean, trigger: PaywallTrigger) => {
    setPaywallTrigger(trigger)
    setPaywallOpenState(open)
  }, [])

  const openPaywall = useCallback((trigger: PaywallTrigger = 'general') => {
    _setPaywallOpen(true, trigger)
  }, [_setPaywallOpen])

  // Refresh on app foreground (native only)
  useEffect(() => {
    if (!isCapacitor()) return
    function onFocus() { refresh() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refresh])

  // Listen for cross-component paywall open requests
  useEffect(() => {
    function onPaywallEvent(e: Event) {
      const trigger = (e as CustomEvent<{ trigger?: PaywallTrigger }>).detail?.trigger ?? 'general'
      openPaywall(trigger)
    }
    window.addEventListener('perezoso:paywall', onPaywallEvent)
    return () => window.removeEventListener('perezoso:paywall', onPaywallEvent)
  }, [openPaywall])

  return (
    <Ctx.Provider value={{ isPro, isLoading, refresh, openPaywall, _setPaywallOpen }}>
      {children}
      {/* PaywallSheet is lazy-imported inside the paywall component itself */}
      {paywallOpen && (
        <PaywallSheetLazy
          trigger={paywallTrigger}
          onClose={() => setPaywallOpenState(false)}
          onPurchaseSuccess={() => { setIsPro(true); setPaywallOpenState(false) }}
        />
      )}
    </Ctx.Provider>
  )
}

// ─── Lazy paywall to avoid circular imports ───────────────────────────────────
import dynamic from 'next/dynamic'
const PaywallSheetLazy = dynamic(
  () => import('@/components/paywall/PaywallSheet'),
  { ssr: false }
)
