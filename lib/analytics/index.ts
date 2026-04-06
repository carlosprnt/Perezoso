/**
 * Public entry point for analytics.
 *
 * Components never import posthog-js directly — they import from here.
 * That keeps the PostHog dependency swappable and makes it easy to
 * mock analytics in tests.
 */

import { analytics } from './client'
import * as E from './events'
import type { EventName, EventPropsMap, ScreenName } from './events'

export { analytics }
export * from './events'

/** Typed capture — event name auto-completes, props are validated. */
export function track<N extends EventName>(event: N, props?: EventPropsMap[N]) {
  analytics.capture(event, props)
}

/** Screen / page view. */
export function trackScreen(name: ScreenName, props?: Record<string, unknown>) {
  analytics.screen(name, props)
}

// ── Domain helpers — keeps instrumentation sites tidy ──────────────────────
export const AnalyticsEvents = {
  signupCompleted: (method?: 'email' | 'google') =>
    track(E.SIGNUP_COMPLETED, { method }),

  loginCompleted: (method?: 'email' | 'google') =>
    track(E.LOGIN_COMPLETED, { method }),

  logout: () => {
    track(E.LOGOUT, {})
    analytics.reset()
  },

  subscriptionCreated: (
    sub: EventPropsMap[typeof E.SUBSCRIPTION_CREATED],
    isFirst: boolean,
  ) => {
    track(E.SUBSCRIPTION_CREATED, sub)
    if (isFirst) track(E.FIRST_SUBSCRIPTION_CREATED, sub)
  },

  subscriptionUpdated: (sub: EventPropsMap[typeof E.SUBSCRIPTION_UPDATED]) =>
    track(E.SUBSCRIPTION_UPDATED, sub),

  subscriptionDeleted: (sub: EventPropsMap[typeof E.SUBSCRIPTION_DELETED]) =>
    track(E.SUBSCRIPTION_DELETED, sub),

  subscriptionDetailViewed: (subscription_id: string, category?: string) =>
    track(E.SUBSCRIPTION_DETAIL_VIEWED, { subscription_id, category }),

  dashboardViewed: (subscription_count: number) =>
    track(E.DASHBOARD_VIEWED, {
      subscription_count,
      has_subscriptions: subscription_count > 0,
    }),

  subscriptionsListViewed: (subscription_count: number) =>
    track(E.SUBSCRIPTIONS_LIST_VIEWED, { subscription_count }),

  sortChanged: (sort_mode: string) =>
    track(E.SORT_CHANGED, { sort_mode }),

  filterApplied: (filter_type: 'status' | 'category', value: string) =>
    track(E.FILTER_APPLIED, { filter_type, value }),

  gmailDetectionStarted: () => track(E.GMAIL_DETECTION_STARTED, {}),
  gmailDetectionCompleted: (candidates_found: number) =>
    track(E.GMAIL_DETECTION_COMPLETED, { candidates_found }),
  gmailCandidateAdded: (platform_name?: string) =>
    track(E.GMAIL_CANDIDATE_ADDED, { platform_name }),
  gmailPermissionDenied: () => track(E.GMAIL_PERMISSION_DENIED, {}),

  emptyStateSeen: (screen: ScreenName) => track(E.EMPTY_STATE_SEEN, { screen }),
  errorShown: (screen: ScreenName, message?: string) =>
    track(E.ERROR_SHOWN, { screen, message }),
}
