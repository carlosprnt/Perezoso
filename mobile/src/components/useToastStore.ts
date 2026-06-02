// Global toast state. Any component can fire a toast via
// `useToastStore.getState().show(kind, message)`; the single <Toast />
// instance mounted at the root layout subscribes and renders it.

import { create } from 'zustand';

export type ToastKind = 'success' | 'error';

interface ToastStore {
  visible: boolean;
  kind: ToastKind;
  message: string;
  show: (kind: ToastKind, message: string) => void;
  hide: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  visible: false,
  kind: 'success',
  message: '',
  show: (kind, message) => set({ visible: true, kind, message }),
  hide: () => set({ visible: false }),
}));
