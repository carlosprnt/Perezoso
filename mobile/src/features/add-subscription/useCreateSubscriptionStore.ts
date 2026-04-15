// Create-subscription form sheet — global open/close state + prefill data.
//
// The white form sheet is opened AFTER the user has made an initial
// choice in the dark service picker (AddSubscriptionOverlay):
//   - Tap a suggested service → open with that platform pre-filled
//   - Tap "Añadir manualmente"  → open with no prefill (empty form)
//
// Keeping this as a separate store from useAddSubscriptionStore means
// each sheet owns its own lifecycle — the dark picker closes cleanly
// (its own shrink-back animation runs) while the white form starts its
// slide-up independently.

import { create } from 'zustand';

export interface CreateSubscriptionPrefill {
  /** Platform display name, e.g. "Netflix" */
  name?: string;
  /** Logo image URL (resolved from platform domain) */
  logoUrl?: string;
  /** Optional suggested category */
  category?: string;
}

interface CreateSubscriptionStore {
  isOpen: boolean;
  prefill: CreateSubscriptionPrefill | null;
  open: (prefill?: CreateSubscriptionPrefill) => void;
  close: () => void;
}

export const useCreateSubscriptionStore = create<CreateSubscriptionStore>((set) => ({
  isOpen: false,
  prefill: null,
  open: (prefill) => {
    console.log('[CreateSubscriptionStore] open()', prefill);
    set({ isOpen: true, prefill: prefill ?? null });
  },
  close: () => {
    console.log('[CreateSubscriptionStore] close()');
    set({ isOpen: false });
  },
}));
