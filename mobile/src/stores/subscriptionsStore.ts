// Subscriptions store — serves the whole app from a single source of truth.
//
// Two modes:
//   · 'real'  — subscriptions come from Supabase (filtered by user_id).
//                Adds/edits/deletes round-trip to the DB. Default after
//                login. Empty by default for a brand-new account.
//   · 'demo'  — subscriptions come from the local preset registry
//                (empty / basic / pro). No DB writes. Used from
//                Ajustes → Demo to showcase the UI with pre-seeded data
//                without touching the real account.
//
// The currently-selected demo preset lives in `preset`. In real mode it's
// ignored (and `preset` is conventionally left as 'empty').
//
// Bootstrapping flow:
//   1. Auth store flips to 'authenticated' → subscribers call `loadFromSupabase()`
//   2. On sign-out → `clear()` wipes the list so the next user doesn't
//      inherit the previous one's cache.

import { create } from 'zustand';

import type { Subscription } from '../features/subscriptions/types';
import {
  PRESET_CONFIG,
  type AppPreset,
} from '../features/subscriptions/presets';
import { useReminderDismissalsStore } from '../features/dashboard/useReminderDismissalsStore';
import { fetchSubscriptions, insertSubscription } from '../services/subscriptionsApi';
import { useAuthStore } from '../features/auth/useAuthStore';

export type Mode = 'real' | 'demo';

interface SubscriptionsStore {
  mode: Mode;
  /** Only meaningful when mode === 'demo'. Which preset is displayed. */
  preset: AppPreset;
  subscriptions: Subscription[];
  isPlusActive: boolean;
  loading: boolean;
  error: string | null;

  /** Switch to real mode and pull fresh data from Supabase. */
  useRealMode: () => Promise<void>;
  /** Switch to demo mode with the given preset. */
  useDemoPreset: (preset: AppPreset) => void;

  /** Re-pull from Supabase (real mode only — no-op in demo). */
  loadFromSupabase: () => Promise<void>;
  /** Wipe state (on sign-out). */
  clear: () => void;

  addSubscription: (
    sub: Omit<Subscription, 'id' | 'created_at' | 'updated_at' | 'monthly_equivalent_cost' | 'my_monthly_cost'>
      & Partial<Pick<Subscription, 'id' | 'created_at' | 'updated_at' | 'monthly_equivalent_cost' | 'my_monthly_cost'>>,
  ) => Promise<void>;

  enableRemindersOnAnnuals: () => number;
}

export const useSubscriptionsStore = create<SubscriptionsStore>((set, get) => ({
  // Default = real mode, empty. AuthGate triggers loadFromSupabase on sign-in.
  mode: 'real',
  preset: 'empty',
  subscriptions: [],
  isPlusActive: false,
  loading: false,
  error: null,

  useRealMode: async () => {
    set({ mode: 'real', preset: 'empty', subscriptions: [], isPlusActive: false });
    await get().loadFromSupabase();
  },

  useDemoPreset: (preset) =>
    set({
      mode: 'demo',
      preset,
      subscriptions: PRESET_CONFIG[preset].subscriptions,
      isPlusActive: PRESET_CONFIG[preset].isPlusActive,
      error: null,
    }),

  loadFromSupabase: async () => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ subscriptions: [], loading: false });
      return;
    }
    set({ loading: true, error: null });
    try {
      const subs = await fetchSubscriptions(user.id);
      set({ subscriptions: subs, loading: false });
    } catch (e: any) {
      set({ loading: false, error: e?.message ?? 'Error cargando suscripciones' });
    }
  },

  clear: () =>
    set({
      subscriptions: [],
      isPlusActive: false,
      loading: false,
      error: null,
    }),

  addSubscription: async (sub) => {
    // Demo mode: local-only insert (what the old store did).
    if (get().mode === 'demo') {
      const local: Subscription = {
        id: sub.id ?? `local-${Date.now()}`,
        created_at: sub.created_at ?? new Date().toISOString(),
        updated_at: sub.updated_at ?? new Date().toISOString(),
        monthly_equivalent_cost: sub.monthly_equivalent_cost ?? sub.price_amount,
        my_monthly_cost: sub.my_monthly_cost ?? sub.price_amount,
        ...sub,
      } as Subscription;
      set((state) => ({ subscriptions: [local, ...state.subscriptions] }));
      if (sub.billing_period === 'yearly') {
        useReminderDismissalsStore.getState().clear('reminder');
      }
      return;
    }

    // Real mode: insert into Supabase, then prepend the returned row.
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('No user session');

    const inserted = await insertSubscription(user.id, sub);
    set((state) => ({ subscriptions: [inserted, ...state.subscriptions] }));
    if (inserted.billing_period === 'yearly') {
      useReminderDismissalsStore.getState().clear('reminder');
    }
  },

  enableRemindersOnAnnuals: () => {
    let count = 0;
    set((state) => ({
      subscriptions: state.subscriptions.map((sub) => {
        if (sub.billing_period !== 'yearly') return sub;
        count += 1;
        return {
          ...sub,
          reminderEnabled: true,
          reminderDays: '7 d\u00EDas antes',
        };
      }),
    }));
    return count;
  },
}));

// ── Auth-driven data lifecycle ───────────────────────────────────────
// Subscribe to auth status so subs are fetched on sign-in and cleared
// on sign-out. Lives at module level so any app that imports this store
// inherits the behaviour — no component needs to wire it up.
useAuthStore.subscribe((state, prev) => {
  if (state.status === prev.status) return;

  if (state.status === 'authenticated') {
    useSubscriptionsStore.getState().useRealMode();
  } else if (state.status === 'unauthenticated') {
    useSubscriptionsStore.getState().clear();
  }
});
