'use client'

import { useEffect, useState } from 'react'
import BottomSheet from '@/components/ui/BottomSheet'
import SettingsView from '@/app/(dashboard)/settings/SettingsView'
import {
  getPreferencesAndProfile,
  type UserPreferences,
} from '@/app/(dashboard)/settings/actions'

/**
 * Settings rendered as a modal instead of a full-page route.
 *
 * Listens for the global `oso:open-settings` custom event — any
 * trigger in the app (e.g. the Ajustes tile inside the dashboard
 * black layer) can dispatch this event to open the modal without
 * navigating away from the current route.
 *
 * Data is loaded lazily on first open via the existing
 * `getPreferencesAndProfile` server action and cached for the
 * lifetime of the component so subsequent opens are instant.
 *
 * The standalone `/settings` route still works — it just uses the
 * same `SettingsView` component without this modal wrapper.
 */
export default function SettingsModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [data, setData] = useState<{
    preferences: UserPreferences
    profile: {
      name: string | null
      email: string | null
      avatarUrl: string | null
    }
  } | null>(null)

  // Lazy-load data on first open; cached afterwards.
  useEffect(() => {
    if (!isOpen || data) return
    let cancelled = false
    ;(async () => {
      const result = await getPreferencesAndProfile()
      if (!cancelled) setData(result)
    })()
    return () => { cancelled = true }
  }, [isOpen, data])

  // Global "open settings" trigger.
  useEffect(() => {
    function onOpen() { setIsOpen(true) }
    window.addEventListener('oso:open-settings', onOpen)
    return () => window.removeEventListener('oso:open-settings', onOpen)
  }, [])

  function handleClose() {
    setIsOpen(false)
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} height="full">
      <div className="px-5 pt-2">
        {data ? (
          <SettingsView
            preferences={data.preferences}
            profile={data.profile}
            onClose={handleClose}
          />
        ) : (
          <div className="h-[60vh] flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-[#E5E5EA] border-t-[#000000] animate-spin" />
          </div>
        )}
      </div>
    </BottomSheet>
  )
}
