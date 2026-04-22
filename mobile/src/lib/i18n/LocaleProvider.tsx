// Phase 5 — Locale context provider
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
export function useT() { return (key: string) => key; }
export function useLocale() { return 'es'; }
