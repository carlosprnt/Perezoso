// Global store for the payments calendar modal.
//
// Mounted once in app/_layout.tsx alongside the other global overlays.
// Opening is one call from anywhere in the app.

import { create } from 'zustand';

interface CalendarStore {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const useCalendarStore = create<CalendarStore>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
