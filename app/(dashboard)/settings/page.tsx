import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getPreferences } from './actions'
import SettingsView from './SettingsView'

export const metadata: Metadata = { title: 'Ajustes' }

export default async function SettingsPage() {
  const preferences = await getPreferences()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return <SettingsView preferences={preferences} userEmail={user?.email ?? null} />
}
