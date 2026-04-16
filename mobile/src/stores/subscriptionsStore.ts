// Global subscriptions + user-status store.
//
// Source of truth for:
//   · `subscriptions` — the user's current list. Every screen that
//     used to import MOCK_SUBSCRIPTIONS directly now reads this.
//   · `isPlusActive` — whether Perezoso Plus is active. The Ajustes
//     "Suscripción" card switches between "Suscripción activa" and
//     "Plan gratuito" based on this flag.
//   · `preset` — which demo state is currently selected (used by the
//     Demo sheet in Ajustes to show the selected option).
//
// All three values are driven by `setPreset(...)` which swaps them
// atomically from the registry in `features/subscriptions/presets.ts`.
//
// NOTE: There is no persistence — switching preset resets state every
// session, which is exactly what the demo flow wants.

import { create } from 'zustand';

import type { Subscription } from '../features/subscriptions/types';
import {
  PRESET_CONFIG,
  type AppPreset,
} from '../features/subscriptions/presets';
import { useReminderDismissalsStore } from '../features/dashboard/useReminderDismissalsStore';

interface SubscriptionsStore {
  preset: AppPreset;
  subscriptions: Subscription[];
  isPlusActive: boolean;
  setPreset: (preset: AppPreset) => void;
  /** Prepend a newly created subscription to the list. The preset tag
   *  is left untouched — a future preset change still overwrites the
   *  list wholesale, which matches the Demo flow. */
  addSubscription: (sub: Subscription) => void;
  /** Enable reminders on every yearly-billing subscription at 7-days-
   *  before. Used by the dashboard "Avísame" reminder card — one tap
   *  wires all annual renewals to the default heads-up. Returns the
   *  number of subscriptions that were updated (already-enabled ones
   *  are re-set to 7 days, which keeps the UX predictable). */
  enableRemindersOnAnnuals: () => number;
}

// Default to "basic" — the 10-item dataset the app shipped with. Keeps
// dev + screenshots identical to what the team is used to seeing.
const DEFAULT_PRESET: AppPreset = 'basic';

export const useSubscriptionsStore = create<SubscriptionsStore>((set) => ({
  preset: DEFAULT_PRESET,
  subscriptions: PRESET_CONFIG[DEFAULT_PRESET].subscriptions,
  isPlusActive: PRESET_CONFIG[DEFAULT_PRESET].isPlusActive,

  setPreset: (preset) =>
    set({
      preset,
      subscriptions: PRESET_CONFIG[preset].subscriptions,
      isPlusActive: PRESET_CONFIG[preset].isPlusActive,
    }),

  addSubscription: (sub) => {
    set((state) => ({
      subscriptions: [sub, ...state.subscriptions],
    }));
    // Bringing a new annual renewal into the list re-surfaces the
    // "Av\u00EDsame" heads-up reminder, even if the user dismissed it
    // earlier. Dismissals for other cards (e.g. the savings tip) are
    // left alone on purpose.
    if (sub.billing_period === 'yearly') {
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
