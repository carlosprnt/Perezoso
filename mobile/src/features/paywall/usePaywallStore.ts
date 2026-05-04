// Paywall store — controls visibility of the globally-mounted PaywallSheet
// and carries the contextual trigger that drives the headline / subhead.

import { create } from 'zustand';
import type { PaywallTrigger } from './paywallTriggers';

interface PaywallState {
  isOpen: boolean;
  trigger: PaywallTrigger;
  open: (trigger?: PaywallTrigger) => void;
  close: () => void;
}

export const usePaywallStore = create<PaywallState>((set) => ({
  isOpen: false,
  trigger: 'general',
  open: (trigger = 'general') => set({ isOpen: true, trigger }),
  close: () => set({ isOpen: false }),
}));
