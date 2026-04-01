'use client'

/**
 * Cross-platform detection utilities.
 * Safe to call on server (returns false) and in Capacitor webviews.
 */

export function isCapacitor(): boolean {
  if (typeof window === 'undefined') return false
  return !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()
}

export function isIOS(): boolean {
  if (typeof window === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || isCapacitorIOS()
}

export function isAndroid(): boolean {
  if (typeof window === 'undefined') return false
  return /android/i.test(navigator.userAgent) || isCapacitorAndroid()
}

function isCapacitorIOS(): boolean {
  const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor
  return cap?.getPlatform?.() === 'ios'
}

function isCapacitorAndroid(): boolean {
  const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor
  return cap?.getPlatform?.() === 'android'
}

export function isNative(): boolean {
  return isCapacitor()
}

export function isMobileWeb(): boolean {
  if (typeof window === 'undefined') return false
  return !isCapacitor() && (isIOS() || isAndroid())
}

/**
 * Returns the correct OAuth redirect URL for the current platform.
 * - Native (Capacitor): uses the app scheme so the native app catches the callback
 * - Web: uses the current origin
 */
export function getOAuthRedirectUrl(path: string = '/auth/callback'): string {
  if (typeof window === 'undefined') return path
  if (isCapacitor()) {
    // Register this URI in your OAuth provider (Google, etc.)
    return `com.perezoso.app://auth${path}`
  }
  return `${window.location.origin}${path}`
}
