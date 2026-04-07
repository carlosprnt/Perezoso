import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import FloatingNav from '@/components/layout/FloatingNav'
import SubscriptionToastHost from '@/components/dashboard/SubscriptionToastHost'
import { LocaleProvider } from '@/lib/i18n/LocaleProvider'
import { detectLocale } from '@/lib/i18n/translations'
import type { Profile } from '@/types'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Detect locale: Google metadata → Accept-Language header → 'en'
  const headersList = await headers()
  const googleLocale =
    user!.user_metadata?.locale ??
    user!.user_metadata?.language ??
    headersList.get('accept-language') ??
    null
  const detectedLocale = detectLocale(googleLocale)

  return (
    <LocaleProvider locale={detectedLocale}>
      {/* pt-[env(safe-area-inset-top)]: with black-translucent status bar the
          system background is removed and web content fills the whole screen.
          This padding reserves the notch/Dynamic Island height so app content
          starts below the status bar icons. */}
      <div className="min-h-screen bg-[#F7F8FA] dark:bg-[#121212] pt-[env(safe-area-inset-top)]">
        <Sidebar profile={profile as Profile | null} />

        {/* Main content — offset by sidebar width on desktop */}
        <main className="lg:pl-56 pb-28 lg:pb-0 min-h-screen">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
            {children}
          </div>
        </main>

        {/* Floating pill nav — mobile only */}
        <FloatingNav />
        {/* Toast host — survives sheet/form unmount */}
        <SubscriptionToastHost />
      </div>
    </LocaleProvider>
  )
}
