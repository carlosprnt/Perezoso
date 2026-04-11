import type { Metadata } from 'next'
import { getPreferencesAndEmail } from './actions'
import SettingsView from './SettingsView'

export const metadata: Metadata = { title: 'Ajustes' }

export default async function SettingsPage() {
  const { preferences, email } = await getPreferencesAndEmail()
  return <SettingsView preferences={preferences} userEmail={email} />
}
