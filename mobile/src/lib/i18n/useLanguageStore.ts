import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LanguageStore {
  language: string;
  setLanguage: (lang: string) => void;
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set) => ({
      language: 'auto',
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'perezoso-language',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
