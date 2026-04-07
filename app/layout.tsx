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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        {/* iOS PWA splash screen */}
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
        <link rel="apple-touch-startup-image" href="/Splash.png" />
      </head>
      <body><ThemeProvider><AnalyticsProvider>{children}</AnalyticsProvider></ThemeProvider></body>
    </html>
  )
}
