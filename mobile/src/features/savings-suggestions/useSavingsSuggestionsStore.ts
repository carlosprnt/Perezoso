// Savings-suggestions global stores.
//
// Two independent open states keep the list and detail sheets layered
// correctly: the list sheet stays mounted while the detail slides on
// top of it, then unmounts cleanly when the user dismisses both.
//
//   useSavingsSuggestionsStore.getState().openList();
//   useSavingsSuggestionsStore.getState().openDetail(suggestion);
//
// `selectedSuggestion` is the source of truth for what the detail sheet
// renders — a snapshot, so the detail keeps its content even if the
// underlying list changes mid-flight.

import { create } from 'zustand';
import type { SavingsSuggestion } from './mockData';

interface SavingsSuggestionsStore {
  isListOpen: boolean;
  openList: () => void;
  closeList: () => void;

  isDetailOpen: boolean;
  selectedSuggestion: SavingsSuggestion | null;
  openDetail: (suggestion: SavingsSuggestion) => void;
  closeDetail: () => void;
}

export const useSavingsSuggestionsStore = create<SavingsSuggestionsStore>(
  (set) => ({
    isListOpen: false,
    openList: () => set({ isListOpen: true }),
    closeList: () => set({ isListOpen: false }),

    isDetailOpen: false,
    selectedSuggestion: null,
    openDetail: (suggestion) =>
      set({ isDetailOpen: true, selectedSuggestion: suggestion }),
    closeDetail: () => set({ isDetailOpen: false }),
  }),
);
