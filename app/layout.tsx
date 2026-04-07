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
        {/* iOS PWA splash screens */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        {/* iPhone SE (2nd/3rd) 750×1334 */}
        <link rel="apple-touch-startup-image" href="/splash?w=750&h=1334" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        {/* iPhone 8 Plus / 7 Plus 1242×2208 */}
        <link rel="apple-touch-startup-image" href="/splash?w=1242&h=2208" media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        {/* iPhone X / XS / 11 Pro / 12 mini / 13 mini 1125×2436 */}
        <link rel="apple-touch-startup-image" href="/splash?w=1125&h=2436" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        {/* iPhone XR / 11 828×1792 */}
        <link rel="apple-touch-startup-image" href="/splash?w=828&h=1792" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        {/* iPhone XS Max / 11 Pro Max 1242×2688 */}
        <link rel="apple-touch-startup-image" href="/splash?w=1242&h=2688" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        {/* iPhone 12 / 12 Pro / 13 / 13 Pro / 14 1170×2532 */}
        <link rel="apple-touch-startup-image" href="/splash?w=1170&h=2532" media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        {/* iPhone 12 Pro Max / 13 Pro Max / 14 Plus 1284×2778 */}
        <link rel="apple-touch-startup-image" href="/splash?w=1284&h=2778" media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        {/* iPhone 14 Pro / 15 / 15 Pro 1179×2556 */}
        <link rel="apple-touch-startup-image" href="/splash?w=1179&h=2556" media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        {/* iPhone 14 Pro Max / 15 Plus / 15 Pro Max 1290×2796 */}
        <link rel="apple-touch-startup-image" href="/splash?w=1290&h=2796" media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        {/* iPhone 16 / 16 Pro 1206×2622 */}
        <link rel="apple-touch-startup-image" href="/splash?w=1206&h=2622" media="(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        {/* iPhone 16 Plus / 16 Pro Max 1320×2868 */}
        <link rel="apple-touch-startup-image" href="/splash?w=1320&h=2868" media="(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
      </head>
      <body><ThemeProvider><AnalyticsProvider>{children}</AnalyticsProvider></ThemeProvider></body>
    </html>
  )
}
