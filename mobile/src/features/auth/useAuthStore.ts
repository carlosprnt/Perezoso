// Auth store — thin wrapper around Supabase's session API, exposed to
// React via Zustand so components can read `session` / `user` / `status`
// without each one subscribing to supabase.auth.onAuthStateChange.
//
// status machine:
//   'loading'        — initial boot, checking persisted session from AsyncStorage
//   'authenticated'  — supabase has a valid session
//   'unauthenticated'— no session (logged out or never logged in)
//
// The store initialises itself on first import by:
//   1. Reading the persisted session via supabase.auth.getSession()
//   2. Subscribing to onAuthStateChange so external sign-in / token refresh /
//      sign-out events flow back into the UI.

import { create } from 'zustand';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import type { Session, User } from '@supabase/supabase-js';

import { supabase } from '../../services/supabase';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  error: string | null;

  signInWithGoogle: () => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  session: null,
  user: null,
  error: null,

  signInWithGoogle: async () => {
    set({ error: null });

    // Deep link the Supabase OAuth callback returns to. Must be registered
    // in Supabase Dashboard → Authentication → URL Configuration → Redirect URLs.
    const redirectTo = makeRedirectUri({
      scheme: 'perezoso',
      path: 'auth/callback',
    });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data?.url) {
      const msg = error?.message ?? 'No authorization URL returned';
      set({ error: msg });
      return { ok: false, error: msg };
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    if (result.type !== 'success' || !result.url) {
      // User cancelled — not an error state worth surfacing.
      return { ok: false, error: 'cancelled' };
    }

    // Parse tokens from the redirect URL fragment: perezoso://auth/callback#access_token=...&refresh_token=...
    const url = new URL(result.url);
    // Supabase returns tokens in the hash fragment; fall back to query.
    const params = new URLSearchParams(
      (url.hash?.startsWith('#') ? url.hash.slice(1) : url.hash) || url.search.slice(1),
    );
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');

    if (!access_token || !refresh_token) {
      const msg = 'Missing tokens in auth callback';
      set({ error: msg });
      return { ok: false, error: msg };
    }

    const { error: setErr } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (setErr) {
      set({ error: setErr.message });
      return { ok: false, error: setErr.message };
    }

    // onAuthStateChange will flip status → 'authenticated' via the
    // subscription below, so we don't set it here.
    return { ok: true };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    // onAuthStateChange flips status → 'unauthenticated'.
  },
}));

// ── Bootstrap: read persisted session, then subscribe to changes ─────────
// Runs once at module load. Safe to call before any React tree mounts
// because Zustand state is global.
(async () => {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  useAuthStore.setState({
    session,
    user: session?.user ?? null,
    status: session ? 'authenticated' : 'unauthenticated',
  });
})();

supabase.auth.onAuthStateChange((_event, session) => {
  useAuthStore.setState({
    session,
    user: session?.user ?? null,
    status: session ? 'authenticated' : 'unauthenticated',
  });
});

// Pre-warm the browser auth session on supported platforms (no-op elsewhere).
// Reduces the delay between tapping Google and the chrome opening.
WebBrowser.maybeCompleteAuthSession();
