// Settings & Tags global stores.
//
// `useSettingsStore` drives the native iOS pageSheet "Ajustes" modal
// that's mounted once at `app/_layout.tsx`. Opening the sheet from
// anywhere in the app is just:
//
//   useSettingsStore.getState().open();
//
// `useTagsStore` hosts the small list of user-defined tags together
// with the open/close state of its secondary bottom sheet. Split from
// the settings store so the tags list can also be consumed elsewhere
// in the app (e.g. filters) without importing any sheet-specific flags.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSubscriptionsStore } from '../../stores/subscriptionsStore';

// ─── Settings sheet ──────────────────────────────────────────────────

interface SettingsStore {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));

// ─── App preferences (mock persistence) ──────────────────────────────

export type AppearanceMode = 'Claro' | 'Oscuro' | 'Automático';

// Days before next_billing_date to fire the renewal reminder. Picked to
// give the user enough time to cancel/downgrade if they want.
export type ReminderDaysBefore = 1 | 3 | 7 | 14;

interface PreferencesStore {
  currency: string;              // e.g. "€ EUR"
  notificationsEnabled: boolean;
  /** How many days before each renewal the reminder fires. */
  reminderDaysBefore: ReminderDaysBefore;
  appearance: AppearanceMode;
  setCurrency: (c: string) => void;
  setNotificationsEnabled: (v: boolean) => void;
  setReminderDaysBefore: (d: ReminderDaysBefore) => void;
  setAppearance: (a: AppearanceMode) => void;
}

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      currency: '€ EUR',
      notificationsEnabled: false,
      reminderDaysBefore: 7,
      appearance: 'Claro',
      setCurrency: (currency) => set({ currency }),
      setNotificationsEnabled: (notificationsEnabled) =>
        set({ notificationsEnabled }),
      setReminderDaysBefore: (reminderDaysBefore) =>
        set({ reminderDaysBefore }),
      setAppearance: (appearance) => set({ appearance }),
    }),
    {
      name: 'perezoso-preferences',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

// ─── Custom categories ──────────────────────────────────────────────

export interface Tag {
  id: string;
  name: string;
}

interface TagsStore {
  /** Whether the secondary TagsBottomSheet is presented. */
  isOpen: boolean;
  openSheet: () => void;
  closeSheet: () => void;

  tags: Tag[];
  addTag: (name: string) => void;
  removeTag: (id: string) => void;
}

export const useTagsStore = create<TagsStore>()(
  persist(
    (set) => ({
      isOpen: false,
      openSheet: () => set({ isOpen: true }),
      closeSheet: () => set({ isOpen: false }),

      tags: [],
      addTag: (name) =>
        set((s) => {
          const trimmed = name.trim();
          if (!trimmed) return s;
          if (s.tags.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())) {
            return s;
          }
          return {
            tags: [...s.tags, { id: `t-${Date.now()}`, name: trimmed }],
          };
        }),
      removeTag: (id) =>
        set((s) => {
          const tag = s.tags.find((t) => t.id === id);
          if (tag) {
            const subStore = useSubscriptionsStore.getState();
            subStore.subscriptions
              .filter((sub) => sub.category === tag.name)
              .forEach((sub) => {
                subStore.updateSubscription({ ...sub, category: 'other' });
              });
          }
          return { tags: s.tags.filter((t) => t.id !== id) };
        }),
    }),
    {
      name: 'perezoso-categories',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ tags: state.tags }),
    },
  ),
);

// ─── Admin stats sheet (open/close) ──────────────────────────────────

interface AdminStatsStore {
  isOpen: boolean;
  openSheet: () => void;
  closeSheet: () => void;
}

export const useAdminStatsStore = create<AdminStatsStore>((set) => ({
  isOpen: false,
  openSheet: () => set({ isOpen: true }),
  closeSheet: () => set({ isOpen: false }),
}));

// ─── Demo preset sheet (open/close) ──────────────────────────────────
// State lives in subscriptionsStore — this only tracks the sheet's
// presentation so other sheets don't need to know about demo presets.

interface DemoSheetStore {
  isOpen: boolean;
  openSheet: () => void;
  closeSheet: () => void;
}

export const useDemoSheetStore = create<DemoSheetStore>((set) => ({
  isOpen: false,
  openSheet: () => set({ isOpen: true }),
  closeSheet: () => set({ isOpen: false }),
}));
