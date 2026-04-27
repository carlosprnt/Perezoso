// Global store for the subscription-detail modal.
//
// The detail sheet is mounted ONCE in app/_layout.tsx alongside the
// other global overlays (CreateSubscriptionSheet, Toast, …). Any screen
// in the app that renders a subscription row just imports this store
// and calls `openDetail(sub)` on tap. No prop-drilling, no context, no
// route navigation — the sheet appears on top of whatever is rendered,
// matching how iOS system sheets behave app-wide (Share, Mail compose…).
//
// Lifecycle:
//   openDetail(sub)       → show sheet, mode='view'
//   enterEdit()           → inline transition to edit mode
//   exitEdit()            → back to view mode (discards edit draft)
//   updateSubscription(s) → commit edits into the displayed record
//   deleteSubscription()  → remove from local store and close
//   close()               → dismiss the sheet entirely
//
// For this MVP the persistence layer is a simple in-memory map seeded
// by whoever opens the sheet. The real app will swap that for a
// Supabase mutation + optimistic update against the subscriptions
// collection without touching the view layer.

import { create } from 'zustand';
import type { Subscription } from '../subscriptions/types';

export type DetailMode = 'view' | 'edit';

interface SubscriptionDetailStore {
  /** Whether the sheet is currently presented. */
  isOpen: boolean;
  /** Which step of the sheet is showing. */
  mode: DetailMode;
  /** The subscription being displayed / edited. Null when closed. */
  subscription: Subscription | null;

  openDetail: (sub: Subscription) => void;
  enterEdit: () => void;
  exitEdit: () => void;
  updateSubscription: (updated: Subscription) => void;
  deleteSubscription: () => void;
  close: () => void;
}

export const useSubscriptionDetailStore = create<SubscriptionDetailStore>(
  (set) => ({
    isOpen: false,
    mode: 'view',
    subscription: null,

    openDetail: (sub) =>
      set({ isOpen: true, mode: 'view', subscription: sub }),

    enterEdit: () => set({ mode: 'edit' }),
    exitEdit: () => set({ mode: 'view' }),

    updateSubscription: (updated) =>
      set({ subscription: updated, mode: 'view' }),

    deleteSubscription: () =>
      set({ isOpen: false, mode: 'view', subscription: null }),

    close: () => set({ isOpen: false, mode: 'view' }),
  }),
);
