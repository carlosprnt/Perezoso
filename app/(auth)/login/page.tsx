import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LoginScreen from './LoginScreen'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Sign in — Perezoso' }

export default async function LoginPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')
  return <LoginScreen />
}
