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

interface PreferencesStore {
  currency: string;              // e.g. "€ EUR"
  notificationsEnabled: boolean;
  appearance: AppearanceMode;
  setCurrency: (c: string) => void;
  setNotificationsEnabled: (v: boolean) => void;
  setAppearance: (a: AppearanceMode) => void;
}

export const usePreferencesStore = create<PreferencesStore>((set) => ({
  currency: '€ EUR',
  notificationsEnabled: false,
  appearance: 'Claro',
  setCurrency: (currency) => set({ currency }),
  setNotificationsEnabled: (notificationsEnabled) =>
    set({ notificationsEnabled }),
  setAppearance: (appearance) => set({ appearance }),
}));

// ─── Tags (labels) ───────────────────────────────────────────────────

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

const MOCK_TAGS: Tag[] = [
  { id: 't-delivery', name: 'Delivery' },
  { id: 't-hogar',    name: 'Hogar' },
];

export const useTagsStore = create<TagsStore>((set) => ({
  isOpen: false,
  openSheet: () => set({ isOpen: true }),
  closeSheet: () => set({ isOpen: false }),

  tags: MOCK_TAGS,
  addTag: (name) =>
    set((s) => {
      const trimmed = name.trim();
      if (!trimmed) return s;
      // No duplicates (case-insensitive)
      if (s.tags.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())) {
        return s;
      }
      return {
        tags: [...s.tags, { id: `t-${Date.now()}`, name: trimmed }],
      };
    }),
  removeTag: (id) =>
    set((s) => ({ tags: s.tags.filter((t) => t.id !== id) })),
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
