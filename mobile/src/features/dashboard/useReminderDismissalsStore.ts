// In-memory dismissals for the dashboard reminder carousel cards.
//
// When the user taps "No me interesa" on a reminder card, we record the
// dismissal here and ReminderCards filters the matching item out of its
// render list. The record lives only in memory, which means:
//
//   · Dismissal survives as long as the process is alive.
//   · A full re-login / app relaunch resets everything (there's no
//     persistence layer yet for demo state — see subscriptionsStore).
//   · A 5-day TTL caps the dismissal in case the process stays alive
//     longer than that (unlikely on mobile, but spec'd by product).
//
// Timestamps are `Date.now()` in ms; checking freshness compares against
// now at read time, so we don't need a background timer to expire.

import { create } from 'zustand';

const TTL_MS = 5 * 24 * 60 * 60 * 1000; // 5 days

interface ReminderDismissalsStore {
  /** id → epoch ms when the dismissal was recorded */
  dismissals: Record<string, number>;
  isDismissed: (id: string) => boolean;
  dismiss: (id: string) => void;
}

export const useReminderDismissalsStore = create<ReminderDismissalsStore>(
  (set, get) => ({
    dismissals: {},
    isDismissed: (id) => {
      const ts = get().dismissals[id];
      if (!ts) return false;
      return Date.now() - ts < TTL_MS;
    },
    dismiss: (id) =>
      set((state) => ({
        dismissals: { ...state.dismissals, [id]: Date.now() },
      })),
  }),
);
