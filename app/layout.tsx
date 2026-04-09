import type { Metadata, Viewport } from 'next'
import { cookies } from 'next/headers'
import './globals.css'
import { ThemeProvider } from '@/components/ui/ThemeProvider'
import AnalyticsProvider from '@/lib/analytics/AnalyticsProvider'

export const metadata: Metadata = {
  title: {
    default: 'Perezoso — Subscription Manager',
    template: '%s · Perezoso',
  },
  description: 'Track and manage all your subscriptions in one clean place.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
    shortcut: '/logo.png',
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'Perezoso — Subscription Manager',
    description: 'Track and manage all your subscriptions in one clean place.',
    images: [{ url: '/logo.png', width: 1024, height: 1024 }],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,      // Prevent pinch-zoom in native app context
  themeColor: '#4318D1',
  viewportFit: 'cover', // Draw under notch / Dynamic Island / home indicator
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const locale = cookieStore.get('perezoso_locale')?.value ?? 'en'

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var p=localStorage.getItem('perezoso_theme');var d=p==='dark'||(p==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}`
          }}
        />
        {/*
          iOS PWA standalone safe-area bleed bootstrap.

          Problem: fixed bottom-aligned UI (sheets, CTA bars, overlays)
          stops above the physical bottom edge in the iOS Home Screen
          standalone webview, leaving a strip of page background exposed
          above the home indicator. This happens because the CSS layout
          viewport does not reach the physical screen bottom in that
          webview, and `position: fixed; bottom: 0` anchors to the
          layout viewport, not the physical edge.

          Fix: measure env(safe-area-inset-bottom) at runtime, take
          max(env, 34px) as a robust floor (handles PWA installs cached
          with an old apple-mobile-web-app-* config where env() returns
          0), and expose it as --safe-bleed-bottom on :root. Every
          bottom-aligned surface then uses:

            bottom: calc(var(--safe-bleed-bottom) * -1)
            padding-bottom: calc(<design clearance> + var(--safe-bleed-bottom))

          Runs inline before hydration so the first paint has the right
          positioning, and re-runs on resize / orientationchange.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){function setBleed(){try{var probe=document.createElement('div');probe.style.cssText='position:fixed;left:0;top:0;width:0;height:0;padding-bottom:env(safe-area-inset-bottom);visibility:hidden;pointer-events:none';(document.body||document.documentElement).appendChild(probe);var env=parseFloat(getComputedStyle(probe).paddingBottom)||0;probe.remove();var bleed=Math.max(env,34);document.documentElement.style.setProperty('--safe-bleed-bottom',bleed+'px');document.documentElement.style.setProperty('--safe-area-bottom',env+'px');}catch(e){document.documentElement.style.setProperty('--safe-bleed-bottom','34px');document.documentElement.style.setProperty('--safe-area-bottom','0px');}}function schedule(){setBleed();requestAnimationFrame(setBleed);setTimeout(setBleed,50);setTimeout(setBleed,250);}if(document.body){schedule();}else{document.addEventListener('DOMContentLoaded',schedule);}window.addEventListener('load',schedule);window.addEventListener('resize',setBleed);window.addEventListener('orientationchange',schedule);})();`
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        {/* iOS PWA splash screens */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        {/*
          black-translucent: removes the iOS system UIVisualEffectView that
          renders a white/blur bar above the WKWebView. With "default", that
          system bar sits above every CSS z-index — no web overlay can cover it.
          black-translucent makes the status bar purely transparent so web
          content (including dark backdrops) renders all the way to the top.
          Companion changes: dashboard outer wrapper gets pt-[env(safe-area-inset-top)]
          and the sticky hero uses top-[env(safe-area-inset-top)] so content
          doesn't collide with the transparent status bar icons.
        */}
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        {/*
          iOS requires the `media` attribute on apple-touch-startup-image so
          it can pick the splash for the exact device resolution. A single
          <link> without media is ignored on most iPhones. The /splash/WxH
          route generates the image on-demand with the Perezoso logo centered
          on white at the correct dimensions.
        */}
        {/* iPhone SE (2nd/3rd) 750×1334 */}
        <link rel="apple-touch-startup-image" href="/splash/750x1334" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        {/* iPhone 8 Plus / 7 Plus 1242×2208 */}
        <link rel="apple-touch-startup-image" href="/splash/1242x2208" media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        {/* iPhone X / XS / 11 Pro / 12 mini / 13 mini 1125×2436 */}
        <link rel="apple-touch-startup-image" href="/splash/1125x2436" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        {/* iPhone XR / 11 828×1792 */}
        <link rel="apple-touch-startup-image" href="/splash/828x1792" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        {/* iPhone XS Max / 11 Pro Max 1242×2688 */}
        <link rel="apple-touch-startup-image" href="/splash/1242x2688" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        {/* iPhone 12 / 12 Pro / 13 / 13 Pro / 14 1170×2532 */}
        <link rel="apple-touch-startup-image" href="/splash/1170x2532" media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        {/* iPhone 12 Pro Max / 13 Pro Max / 14 Plus 1284×2778 */}
        <link rel="apple-touch-startup-image" href="/splash/1284x2778" media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        {/* iPhone 14 Pro / 15 / 15 Pro 1179×2556 */}
        <link rel="apple-touch-startup-image" href="/splash/1179x2556" media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        {/* iPhone 14 Pro Max / 15 Plus / 15 Pro Max 1290×2796 */}
        <link rel="apple-touch-startup-image" href="/splash/1290x2796" media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        {/* iPhone 16 / 16 Pro 1206×2622 */}
        <link rel="apple-touch-startup-image" href="/splash/1206x2622" media="(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        {/* iPhone 16 Plus / 16 Pro Max 1320×2868 */}
        <link rel="apple-touch-startup-image" href="/splash/1320x2868" media="(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        {/* Fallback for any iPhone not matched above */}
        <link rel="apple-touch-startup-image" href="/Splash.png" />
      </head>
      <body><ThemeProvider><AnalyticsProvider>{children}</AnalyticsProvider></ThemeProvider></body>
    </html>
  )
}
