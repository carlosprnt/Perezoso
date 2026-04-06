'use client'

import { useEffect } from 'react'
import { track, AnalyticsEvents, CALENDAR_VIEWED } from './index'

/**
 * Thin client component to emit a domain screen-view event
 * from a server-rendered page. Mount it once per screen with
 * the exact data the product team cares about — no generic bag.
 */
type Props =
  | { kind: 'dashboard'; subscriptionCount: number }
  | { kind: 'subscriptions'; subscriptionCount: number }
  | { kind: 'calendar' }
  | { kind: 'subscription_detail'; subscriptionId: string; category?: string }

export default function ScreenTracker(props: Props) {
  useEffect(() => {
    switch (props.kind) {
      case 'dashboard':
        AnalyticsEvents.dashboardViewed(props.subscriptionCount)
        if (props.subscriptionCount === 0) AnalyticsEvents.emptyStateSeen('dashboard')
        break
      case 'subscriptions':
        AnalyticsEvents.subscriptionsListViewed(props.subscriptionCount)
        if (props.subscriptionCount === 0) AnalyticsEvents.emptyStateSeen('subscriptions')
        break
      case 'calendar':
        track(CALENDAR_VIEWED, {})
        break
      case 'subscription_detail':
        AnalyticsEvents.subscriptionDetailViewed(props.subscriptionId, props.category)
        break
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}
