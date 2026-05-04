// Add-subscription sheet — global open/close state + trigger geometry.
//
// The sheet's morph animation needs to know where the `+` button
// lives in window coordinates at the moment of tap (so it can grow
// from that exact rect into the final sheet rect). The FloatingNav's
// `+` button measures itself via `measureInWindow` and calls `open()`
// with the result; the overlay reads `triggerRect` and interpolates
// every animated frame between that rect and the sheet target rect.

import { create } from 'zustand';

export type TriggerRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Visual border-radius of the trigger at tap time — interpolated to sheet radius. */
  borderRadius: number;
};

interface AddSubscriptionStore {
  isOpen: boolean;
  triggerRect: TriggerRect | null;
  open: (rect: TriggerRect) => void;
  close: () => void;
}

export const useAddSubscriptionStore = create<AddSubscriptionStore>((set) => ({
  isOpen: false,
  triggerRect: null,
  open: (rect) => set({ isOpen: true, triggerRect: rect }),
  close: () => set({ isOpen: false }),
}));
