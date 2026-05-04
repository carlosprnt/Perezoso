import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PaymentMethod {
  id: string;
  label: string;
}

interface PaymentMethodsStore {
  isOpen: boolean;
  openSheet: () => void;
  closeSheet: () => void;
  methods: PaymentMethod[];
  addMethod: (label: string) => void;
  removeMethod: (id: string) => void;
}

export const usePaymentMethodsStore = create<PaymentMethodsStore>()(
  persist(
    (set) => ({
      isOpen: false,
      openSheet: () => set({ isOpen: true }),
      closeSheet: () => set({ isOpen: false }),
      methods: [],
      addMethod: (label) =>
        set((s) => {
          const trimmed = label.trim();
          if (!trimmed) return s;
          if (s.methods.some((m) => m.label.toLowerCase() === trimmed.toLowerCase())) {
            return s;
          }
          return {
            methods: [...s.methods, { id: `pm-${Date.now()}`, label: trimmed }],
          };
        }),
      removeMethod: (id) =>
        set((s) => ({ methods: s.methods.filter((m) => m.id !== id) })),
    }),
    {
      name: 'perezoso-payment-methods',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ methods: state.methods }),
    },
  ),
);
