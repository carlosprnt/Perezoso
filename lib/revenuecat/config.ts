// ─── RevenueCat configuration ────────────────────────────────────────────────
// Single source of truth for all RevenueCat identifiers.
// API keys are public (safe to ship in client) — they identify your app,
// not your account. Actual purchases are validated server-side by RevenueCat.

export const RC_CONFIG = {
  // App Store Connect / Google Play product IDs
  // Must match exactly what is configured in RevenueCat dashboard
  APPLE_API_KEY:   process.env.NEXT_PUBLIC_RC_APPLE_KEY   ?? '',
  ANDROID_API_KEY: process.env.NEXT_PUBLIC_RC_ANDROID_KEY ?? '',

  // RevenueCat entitlement identifier
  ENTITLEMENT_PRO: 'pro',

  // RevenueCat offering identifier
  OFFERING_DEFAULT: 'default',

  // RevenueCat package identifiers (use RC magic values for simplicity)
  PACKAGE_MONTHLY: '$rc_monthly',
  PACKAGE_ANNUAL:  '$rc_annual',

  // Product identifiers (must match App Store Connect / Play Console)
  PRODUCT_MONTHLY: 'perezoso_pro_monthly',
  PRODUCT_ANNUAL:  'perezoso_pro_annual',
} as const

// ─── Feature gate constants ───────────────────────────────────────────────────
export const GATES = {
  MAX_FREE_SUBSCRIPTIONS:        15,
  MAX_FREE_SAVINGS_RECS:          3,
  CUSTOM_CATEGORIES:        'pro' as const,
  RENEWAL_REMINDERS:        'pro' as const,
  FUTURE_CALENDAR_MONTHS:   'pro' as const,
} as const

export type GateKey = keyof typeof GATES
