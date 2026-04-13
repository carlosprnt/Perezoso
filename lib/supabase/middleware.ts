import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { detectLocale } from '@/lib/i18n/translations'

/**
 * Refreshes the Supabase session from the middleware.
 * This is necessary to keep the session alive across server-rendered pages.
 */
export async function updateSession(request: NextRequest) {
  // If env vars are missing (e.g. not yet configured in Vercel), let the
  // request pass through so the app can render a useful error page instead
  // of crashing the middleware with a 500.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh the session — do not add logic between createServerClient and getUser()
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    // Supabase unreachable — let the request through so the app can show an error
    return NextResponse.next({ request })
  }

  const { pathname } = request.nextUrl

  // Public routes that don't require auth
  const isPublicPath =
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth') ||
    pathname === '/'

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // If authenticated user visits login, send to dashboard
  if (user && pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Persist detected locale in a cookie so Server Components can read it
  if (user) {
    // Prefer Google account locale from OAuth metadata; fall back to browser
    // Accept-Language (which mirrors the device/OS language, matching Gmail's UI)
    const googleLocale =
      user.user_metadata?.locale ??
      user.user_metadata?.language ??
      request.headers.get('accept-language') ??
      null
    const detectedLocale = detectLocale(googleLocale)
    const currentLocale = request.cookies.get('perezoso_locale')?.value
    if (currentLocale !== detectedLocale) {
      supabaseResponse.cookies.set('perezoso_locale', detectedLocale, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
      })
    }
  }

  return supabaseResponse
}
