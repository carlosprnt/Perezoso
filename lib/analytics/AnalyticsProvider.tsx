'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { analytics, AnalyticsEvents } from './index'
import { SESSION_STARTED } from './events'
import { createClient } from '@/lib/supabase/client'

/**
 * Mounts the analytics client once per session, identifies the
 * authenticated user, emits a session_started event and a
 * $screen event on every route change. Child components just
 * call track(...) from '@/lib/analytics'.
 */
export default function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // init + identify once per mount
  useEffect(() => {
    analytics.init()
    analytics.capture(SESSION_STARTED, {})

    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        analytics.identify(data.user.id, {
          // only non-sensitive traits — no raw email
          created_at: data.user.created_at,
          provider: data.user.app_metadata?.provider,
        })
      }
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        analytics.identify(session.user.id, {
          created_at: session.user.created_at,
          provider: session.user.app_metadata?.provider,
        })
        AnalyticsEvents.loginCompleted(
          (session.user.app_metadata?.provider as 'email' | 'google' | undefined) ?? 'email',
        )
      }
      if (event === 'SIGNED_OUT') {
        analytics.reset()
      }
    })

    return () => { sub.subscription.unsubscribe() }
  }, [])

  // screen / pageview on route change
  useEffect(() => {
    if (!pathname) return
    const name =
      pathname === '/' ? 'home'
      : pathname.startsWith('/dashboard') ? 'dashboard'
      : pathname.startsWith('/subscriptions') && pathname.length > '/subscriptions'.length ? 'subscription_detail'
      : pathname.startsWith('/subscriptions') ? 'subscriptions'
      : pathname.startsWith('/calendar') ? 'calendar'
      : pathname.startsWith('/login') ? 'login'
      : pathname.slice(1)
    analytics.screen(name, { path: pathname })
  }, [pathname])

  return <>{children}</>
}
