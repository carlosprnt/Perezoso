// Global trigger for the "subscription created" celebration — a card
// that appears in the middle of the screen with the key details and
// then falls away. Fire via:
//   useSubscriptionCelebrationStore.getState().show({ ... });

import { create } from 'zustand';

export interface CelebrationData {
  name: string;
  price: string;
  currency: string;
  billingPeriod: string;
  category?: string;
  logoUrl?: string;
}

interface CelebrationStore {
  visible: boolean;
  data: CelebrationData | null;
  show: (data: CelebrationData) => void;
  hide: () => void;
}

export const useSubscriptionCelebrationStore = create<CelebrationStore>((set) => ({
  visible: false,
  data: null,
  show: (data) => set({ visible: true, data }),
  hide: () => set({ visible: false }),
}));
