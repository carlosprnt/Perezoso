// Persisted dismissals for the dashboard reminder carousel cards.
//
// When the user taps "No me interesa" or acts on a reminder card's
// primary CTA, we record the dismissal here and ReminderCards filters
// the matching item out of its render list.
//
//   · Dismissals persist across app restarts via AsyncStorage.
//   · A 7-day TTL automatically re-surfaces cards after a week.
//   · The "reminder" (annual heads-up) card is also reset whenever a
//     new yearly subscription is added — see `clear('reminder')`
//     called from subscriptionsStore.addSubscription.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface ReminderDismissalsStore {
  /** id → epoch ms when the dismissal was recorded */
  dismissals: Record<string, number>;
  isDismissed: (id: string) => boolean;
  dismiss: (id: string) => void;
  /** Remove a specific dismissal, re-surfacing the card on next render. */
  clear: (id: string) => void;
  /** Remove ALL dismissals — used by the "reset cards" action in Settings. */
  clearAll: () => void;
}

export const useReminderDismissalsStore = create<ReminderDismissalsStore>()(
  persist(
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
      clearAll: () => set({ dismissals: {} }),
    }),
    {
      name: 'perezoso-reminder-dismissals',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ dismissals: state.dismissals }),
    },
  ),
);
