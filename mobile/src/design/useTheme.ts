// Phase 1 — Design tokens: useTheme hook
// Provides theme-aware colors via user preference + system appearance.
//
// Resolution order:
//   · usePreferencesStore.appearance === 'Claro'       → light
//   · usePreferencesStore.appearance === 'Oscuro'      → dark
//   · usePreferencesStore.appearance === 'Automático'  → useColorScheme()

import { useColorScheme } from 'react-native';
import { light, dark, type ThemeColors } from './colors';
import { usePreferencesStore } from '../features/settings/useSettingsStore';

export type ThemeMode = 'light' | 'dark' | 'system';

export function useTheme(): {
  mode: 'light' | 'dark';
  colors: ThemeColors;
  isDark: boolean;
} {
  const systemScheme = useColorScheme();
  const appearance = usePreferencesStore((s) => s.appearance);

  const resolved: 'light' | 'dark' =
    appearance === 'Claro'
      ? 'light'
      : appearance === 'Oscuro'
        ? 'dark'
        : systemScheme === 'dark'
          ? 'dark'
          : 'light';

  return {
    mode: resolved,
    colors: resolved === 'dark' ? dark : light,
    isDark: resolved === 'dark',
  };
}

/** Static accessor for non-hook contexts (e.g., StyleSheet.create) */
export function resolveTheme(mode: 'light' | 'dark'): ThemeColors {
  return mode === 'dark' ? dark : light;
}
