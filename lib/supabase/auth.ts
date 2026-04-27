import { cache } from 'react'
import { createClient } from './server'

/**
 * Cached server-side auth user fetch.
 *
 * `React.cache` memoises the result across all server components + server
 * actions that share a single request, so `auth.getUser()` is only hit
 * once per page render — even though multiple layers need it (dashboard
 * layout + settings page + action helpers). Before this, the settings
 * page was doing 2-3 sequential `auth.getUser()` round-trips which
 * manifested as a visible few-second delay on navigation.
 *
 * Usage: call `getAuthUser()` from any server component / action.
 * Do NOT pass it through React props — let each caller request it
 * directly; `cache()` handles deduplication for free.
 */
export const getAuthUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})
