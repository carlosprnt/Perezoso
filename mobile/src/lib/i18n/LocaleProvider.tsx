// Phase 5 — Locale context provider
import { View } from 'react-native';
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
export function useT() { return (key: string) => key; }
export function useLocale() { return 'es'; }
