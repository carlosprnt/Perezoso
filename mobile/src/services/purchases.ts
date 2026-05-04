// RevenueCat wrapper — single entry point for all in-app purchases.
//
// The native module (`react-native-purchases`) is loaded lazily via
// `require()` inside each call. This means the JS bundle doesn't
// explode on Expo Go or on an old dev build that hasn't been rebuilt
// yet — the service just degrades to a no-op and callers see a clear
// `ok: false` result.
//
// Why hardcoded keys?
//   RevenueCat "public app-specific API keys" are safe to ship in the
//   client — same contract as the Supabase anon key. Keeping them in
//   JS (and not .env) also avoids the EAS Update env-var bundling
//   footgun we hit with Supabase before.

import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';

// Expo Go bundles the JS shim of `react-native-purchases` but not the
// native module — so `require()` succeeds and the crash only happens
// on the first native call. Detect it up-front and no-op entirely.
const isExpoGo = Constants.appOwnership === 'expo';

// ── Keys ─────────────────────────────────────────────────────────────
// Replace with real `appl_...` / `goog_...` keys once the Apple
// Developer Program is active and the RC iOS app is registered.
// The `test_...` key works with the RevenueCat Test Store sandbox —
// no real App Store / Play Store plumbing needed.
const KEYS = {
  ios: 'appl_pNZCewIqWuHLumEciqHVrTJhcBC',
  android: 'test_KuExfCyARynQtsDJQpcIkWnfgWk',
};

// Identifier of the entitlement configured in the RC dashboard that
// grants Pro access. Keep this in sync with dashboard → Entitlements.
export const PRO_ENTITLEMENT_ID = 'pro';

// ── Lazy loader ──────────────────────────────────────────────────────
// Wrapped so that a missing native module (Expo Go, pre-update builds)
// returns null instead of throwing at import time.
let cachedModule: any | undefined;
function loadPurchases(): any | null {
  if (cachedModule !== undefined) return cachedModule;
  if (isExpoGo) {
    cachedModule = null;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-purchases');
    cachedModule = mod?.default ?? mod;
  } catch {
    cachedModule = null;
  }
  return cachedModule;
}

/** True when the native RevenueCat module is available in this build. */
export function isPurchasesAvailable(): boolean {
  return loadPurchases() !== null;
}

// ── Types (re-exported in a minimal shape) ───────────────────────────
// We avoid depending on the SDK's types directly so callers don't have
// to install the package to type-check.
export interface RCPackage {
  identifier: string;
  product: {
    identifier: string;
    priceString: string;
    price: number;
    currencyCode: string;
    title: string;
  };
  packageType: string;
}

export interface RCOffering {
  identifier: string;
  availablePackages: RCPackage[];
  annual?: RCPackage;
  monthly?: RCPackage;
  lifetime?: RCPackage;
}

// ── API ──────────────────────────────────────────────────────────────

let configured = false;

/**
 * Initialise the RC SDK for the given user. Safe to call multiple
 * times — subsequent calls just re-identify if the user changed.
 */
export async function configure(userId?: string): Promise<void> {
  const P = loadPurchases();
  if (!P) return;

  const apiKey = Platform.OS === 'ios' ? KEYS.ios : KEYS.android;

  if (!configured) {
    try {
      P.configure({ apiKey, appUserID: userId ?? null });
      configured = true;
    } catch {
      // Native module not wired up — behave like it wasn't there.
      cachedModule = null;
    }
    return;
  }
  if (userId) {
    try {
      await P.logIn(userId);
    } catch {
      // logIn fails silently — the user just stays on the previous ID.
    }
  }
}

/** Unlink the current user — call on sign-out. */
export async function logOut(): Promise<void> {
  const P = loadPurchases();
  if (!P || !configured) return;
  try {
    await P.logOut();
  } catch {
    // Anonymous user → logOut is a no-op that throws; ignore.
  }
}

/** Fetch the current offering. Returns null if RC isn't available. */
export async function getCurrentOffering(): Promise<RCOffering | null> {
  const P = loadPurchases();
  if (!P) return null;
  try {
    const offerings = await P.getOfferings();
    return offerings?.current ?? null;
  } catch {
    return null;
  }
}

export interface PurchaseResult {
  ok: boolean;
  isPro: boolean;
  cancelled?: boolean;
  error?: string;
}

/** Purchase a package. Returns a normalised result. */
export async function purchasePackage(pkg: RCPackage): Promise<PurchaseResult> {
  const P = loadPurchases();
  if (!P) return { ok: false, isPro: false, error: 'SDK no disponible' };
  try {
    const { customerInfo } = await P.purchasePackage(pkg);
    return {
      ok: true,
      isPro: hasProEntitlement(customerInfo),
    };
  } catch (e: any) {
    if (e?.userCancelled) {
      return { ok: false, isPro: false, cancelled: true };
    }
    return { ok: false, isPro: false, error: e?.message ?? 'Error en la compra' };
  }
}

/** Restore previous purchases — used from "Restaurar compras". */
export async function restorePurchases(): Promise<PurchaseResult> {
  const P = loadPurchases();
  if (!P) return { ok: false, isPro: false, error: 'SDK no disponible' };
  try {
    const customerInfo = await P.restorePurchases();
    return { ok: true, isPro: hasProEntitlement(customerInfo) };
  } catch (e: any) {
    return { ok: false, isPro: false, error: e?.message ?? 'Error restaurando' };
  }
}

/** One-shot read of the current entitlement state. */
export async function fetchIsPro(): Promise<boolean> {
  const P = loadPurchases();
  if (!P) return false;
  try {
    const info = await P.getCustomerInfo();
    return hasProEntitlement(info);
  } catch {
    return false;
  }
}

/**
 * Subscribe to customer info changes. Returns an unsubscribe fn.
 * Keeps `isPlusActive` in the store live across renewals / cancels.
 */
export function addCustomerInfoListener(
  cb: (isPro: boolean) => void,
): () => void {
  const P = loadPurchases();
  if (!P) return () => {};
  const listener = (info: any) => cb(hasProEntitlement(info));
  try {
    P.addCustomerInfoUpdateListener(listener);
  } catch {
    return () => {};
  }
  return () => {
    try {
      P.removeCustomerInfoUpdateListener(listener);
    } catch {
      // removeCustomerInfoUpdateListener isn't exposed on all versions.
    }
  };
}

export async function openManageSubscriptions(): Promise<void> {
  const url = Platform.OS === 'ios'
    ? 'https://apps.apple.com/account/subscriptions'
    : 'https://play.google.com/store/account/subscriptions';
  try {
    await Linking.openURL(url);
  } catch {
    // Fallback: noop if URL can't be opened.
  }
}

function hasProEntitlement(customerInfo: any): boolean {
  return Boolean(customerInfo?.entitlements?.active?.[PRO_ENTITLEMENT_ID]);
}
