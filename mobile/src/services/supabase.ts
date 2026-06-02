// Supabase client for React Native.
//
// Session persistence: we use AsyncStorage (matches the web's cookie-based
// persistence — sessions survive cold starts). `autoRefreshToken` keeps
// the access token fresh in the background.
//
// `detectSessionInUrl: false` because RN has no window.location — deep
// link → session is handled manually in the auth store after the OAuth
// browser roundtrip.

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Hardcoded intentionally: these are public client credentials (anon key
// + project URL). Security is enforced via RLS on the DB, not by hiding
// the anon key. Hardcoding avoids EAS Update env-var bundling issues —
// `EXPO_PUBLIC_*` vars are inlined at `eas update` time and silently
// resolve to empty strings if the `.env` isn't present on the machine
// that ran the update, which surfaces as "Invalid API key" at runtime.
const SUPABASE_URL = 'https://uectdurdngkjkwilfphh.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlY3RkdXJkbmdramt3aWxmcGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzOTM1MjIsImV4cCI6MjA4OTk2OTUyMn0.FIC8KALJbQ615AydHVMUhogAwLTaspVpp45BW-HCvLk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
