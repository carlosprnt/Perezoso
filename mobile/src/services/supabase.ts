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

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Set them in mobile/.env and restart Metro.',
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
