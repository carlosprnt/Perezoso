import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SortMode } from './types';

interface SubscriptionsPrefsStore {
  sortMode: SortMode;
  setSortMode: (mode: SortMode) => void;
}

export const useSubscriptionsPrefsStore = create<SubscriptionsPrefsStore>()(
  persist(
    (set) => ({
      sortMode: 'alphabetical',
      setSortMode: (sortMode) => set({ sortMode }),
    }),
    {
      name: 'perezoso-subscriptions-prefs',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
