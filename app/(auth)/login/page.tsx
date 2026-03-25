import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LoginForm from './LoginForm'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign in',
}

export default async function LoginPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Already authenticated — go to dashboard
  if (user) redirect('/dashboard')

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F7F8FA] px-4">
      {/* Subtle background gradient */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,102,241,0.12) 0%, transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo / brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 shadow-lg mb-5">
            <span className="text-white text-2xl font-bold tracking-tight">P</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Perezoso</h1>
          <p className="mt-1.5 text-sm text-gray-500">
            Your subscriptions, under control
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-[0_4px_24px_0_rgba(0,0,0,0.08)] p-8">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Sign in</h2>
          <p className="text-sm text-gray-500 mb-6">
            Continue with your Google account to get started.
          </p>

          <LoginForm />
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          By signing in you accept our{' '}
          <span className="underline cursor-pointer">Terms of Service</span>{' '}
          and{' '}
          <span className="underline cursor-pointer">Privacy Policy</span>.
        </p>
      </div>
    </main>
  )
}
