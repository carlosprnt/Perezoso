/**
 * Cross-platform analytics client interface.
 *
 * The web app uses PostHogWebClient below. iOS / Android wrappers
 * can implement the same `AnalyticsClient` interface with their
 * native PostHog SDK so the rest of the app (events.ts, helpers.ts,
 * hooks) stays identical across platforms.
 */

import type { EventName, EventPropsMap, Platform } from './events'

export interface AnalyticsClient {
  init(): void
  identify(userId: string, traits?: Record<string, unknown>): void
  reset(): void
  capture<E extends EventName>(event: E, props?: EventPropsMap[E]): void
  screen(name: string, props?: Record<string, unknown>): void
  readonly platform: Platform
}

// ── No-op (SSR / missing env) ──────────────────────────────────────────────
class NoopClient implements AnalyticsClient {
  readonly platform: Platform = 'web'
  init() { /* no-op */ }
  identify() { /* no-op */ }
  reset() { /* no-op */ }
  capture() { /* no-op */ }
  screen() { /* no-op */ }
}

// ── PostHog web implementation ─────────────────────────────────────────────
class PostHogWebClient implements AnalyticsClient {
  readonly platform: Platform = 'web'
  private started = false

  init() {
    if (this.started || typeof window === 'undefined') return
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!key) return
    // Lazy-load so SSR bundles stay small and we don't crash without a key.
    import('posthog-js').then(({ default: posthog }) => {
      posthog.init(key, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
        capture_pageview: false,     // we send screen() manually
        capture_pageleave: true,
        autocapture: false,          // we want intentional events only
        persistence: 'localStorage+cookie',
        disable_session_recording: true,
        sanitize_properties: (props) => {
          // Belt-and-braces: never forward raw email, subject, body
          const clean = { ...props }
          delete clean.email
          delete clean.gmail_subject
          delete clean.gmail_body
          return clean
        },
      })
      this.started = true
    }).catch(() => { /* silent — analytics must never break the app */ })
  }

  private withPosthog(fn: (posthog: typeof import('posthog-js').default) => void) {
    if (typeof window === 'undefined') return
    import('posthog-js').then(({ default: posthog }) => fn(posthog)).catch(() => {})
  }

  identify(userId: string, traits?: Record<string, unknown>) {
    this.withPosthog(ph => ph.identify(userId, traits))
  }

  reset() {
    this.withPosthog(ph => ph.reset())
  }

  capture<E extends EventName>(event: E, props?: EventPropsMap[E]) {
    this.withPosthog(ph => ph.capture(event, {
      platform: this.platform,
      ...(props ?? {}),
    }))
  }

  screen(name: string, props?: Record<string, unknown>) {
    this.withPosthog(ph => ph.capture('$screen', {
      $screen_name: name,
      platform: this.platform,
      ...(props ?? {}),
    }))
  }
}

// ── Singleton ──────────────────────────────────────────────────────────────
const hasKey = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY)
export const analytics: AnalyticsClient = hasKey
  ? new PostHogWebClient()
  : new NoopClient()
