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

interface SubscriptionsStore {
  preset: AppPreset;
  subscriptions: Subscription[];
  isPlusActive: boolean;
  setPreset: (preset: AppPreset) => void;
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
}));
