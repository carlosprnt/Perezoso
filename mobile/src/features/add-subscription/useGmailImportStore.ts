import { create } from 'zustand';
import type { DetectedSubscription } from './gmailDetection';

type Phase = 'explain' | 'loading' | 'results' | 'empty';

interface GmailImportStore {
  isOpen: boolean;
  phase: Phase;
  results: DetectedSubscription[];
  selected: Set<string>;

  open: () => void;
  close: () => void;
  setPhase: (phase: Phase) => void;
  setResults: (results: DetectedSubscription[]) => void;
  toggleSelected: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
}

export const useGmailImportStore = create<GmailImportStore>((set, get) => ({
  isOpen: false,
  phase: 'explain',
  results: [],
  selected: new Set(),

  open: () => set({ isOpen: true, phase: 'explain', results: [], selected: new Set() }),
  close: () => set({ isOpen: false }),
  setPhase: (phase) => set({ phase }),
  setResults: (results) => {
    const selected = new Set(results.map((r) => r.id));
    set({ results, selected, phase: results.length > 0 ? 'results' : 'empty' });
  },
  toggleSelected: (id) => {
    const next = new Set(get().selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    set({ selected: next });
  },
  selectAll: () => {
    set({ selected: new Set(get().results.map((r) => r.id)) });
  },
  deselectAll: () => set({ selected: new Set() }),
}));
