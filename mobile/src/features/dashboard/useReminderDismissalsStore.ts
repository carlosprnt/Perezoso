// In-memory dismissals for the dashboard reminder carousel cards.
//
// When the user taps "No me interesa" or acts on a reminder card's
// primary CTA, we record the dismissal here and ReminderCards filters
// the matching item out of its render list. The record lives only in
// memory, so:
//
//   · Dismissal survives navigation + backgrounding.
//   · A full re-login / app relaunch resets everything.
//   · The "reminder" (annual heads-up) card is also reset whenever a
//     new yearly subscription is added — see `clear('reminder')`
//     called from subscriptionsStore.addSubscription.
//   · A 5-day TTL caps the dismissal as a safety net in case the
//     process stays alive longer than that.

import { create } from 'zustand';

const TTL_MS = 5 * 24 * 60 * 60 * 1000; // 5 days

interface ReminderDismissalsStore {
  /** id → epoch ms when the dismissal was recorded */
  dismissals: Record<string, number>;
  isDismissed: (id: string) => boolean;
  dismiss: (id: string) => void;
  /** Remove a specific dismissal, re-surfacing the card on next render. */
  clear: (id: string) => void;
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
    clear: (id) =>
      set((state) => {
        if (!(id in state.dismissals)) return state;
        const next = { ...state.dismissals };
        delete next[id];
        return { dismissals: next };
      }),
  }),
);
