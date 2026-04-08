'use client'
// ─── RevenueCat client initialisation ────────────────────────────────────────
// Uses @revenuecat/purchases-capacitor on iOS/Android (native SDK via plugin).
// On web, Pro status is read from the user's Supabase profile (set by webhook).
// This file is the ONLY place that imports the Capacitor plugin — all other
// code goes through SubscriptionProvider / useProAccess.

import { RC_CONFIG } from './config'
import { isCapacitor, isIOS } from '@/lib/platform'

// Dynamic import keeps the Capacitor plugin out of the web bundle.
// The package is only installed in the native (Capacitor) build, so we
// use the webpackIgnore magic comment to prevent webpack from trying to
// resolve it at build time. The isCapacitor() guard ensures this path is
// never reached on web.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getPurchases(): Promise<any> {
  const { Purchases } = await import(
    // @ts-expect-error — @revenuecat/purchases-capacitor is a native-only dep
    /* webpackIgnore: true */ '@revenuecat/purchases-capacitor'
  )
  return Purchases
}

export async function initRevenueCat(userId: string) {
  if (!isCapacitor()) return   // web: no SDK init needed, use webhook-driven DB

  const Purchases = await getPurchases()
  const apiKey = isIOS() ? RC_CONFIG.APPLE_API_KEY : RC_CONFIG.ANDROID_API_KEY

  await Purchases.configure({ apiKey })
  await Purchases.logIn({ appUserID: userId })
}

export async function getCustomerInfo() {
  if (!isCapacitor()) return null
  const Purchases = await getPurchases()
  const { customerInfo } = await Purchases.getCustomerInfo()
  return customerInfo
}

export async function isEntitlementActive(): Promise<boolean> {
  const info = await getCustomerInfo()
  if (!info) return false
  return RC_CONFIG.ENTITLEMENT_PRO in (info.entitlements?.active ?? {})
}

export async function getCurrentOffering() {
  if (!isCapacitor()) return null
  const Purchases = await getPurchases()
  const { offerings } = await Purchases.getOfferings()
  return offerings.current ?? null
}

export async function purchasePackage(packageIdentifier: string) {
  if (!isCapacitor()) throw new Error('Purchase only available in native app')
  const Purchases = await getPurchases()
  const offering = await getCurrentOffering()
  const pkg = offering?.availablePackages.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (p: any) => p.identifier === packageIdentifier
  )
  if (!pkg) throw new Error(`Package ${packageIdentifier} not found`)
  return Purchases.purchasePackage({ aPackage: pkg })
}

export async function restorePurchases() {
  if (!isCapacitor()) return null
  const Purchases = await getPurchases()
  return Purchases.restorePurchases()
}

export async function logOutRevenueCat() {
  if (!isCapacitor()) return
  const Purchases = await getPurchases()
  await Purchases.logOut()
}
