import type { Metadata } from 'next'
import { getPreferencesAndProfile } from './actions'
import SettingsView from './SettingsView'

export const metadata: Metadata = { title: 'Ajustes' }

export default async function SettingsPage() {
  const { preferences, profile } = await getPreferencesAndProfile()
  return <SettingsView preferences={preferences} profile={profile} />
}
