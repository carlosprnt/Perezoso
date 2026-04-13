// Phase 1 — Design tokens: useTheme hook
// Provides theme-aware colors via Zustand + system appearance

import { useColorScheme } from 'react-native';
import { light, dark, type ThemeColors } from './colors';

export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Returns the resolved color palette for the current theme.
 *
 * For now this follows the system appearance directly.
 * When the settings store is built (Phase 5), it will read the
 * user's preference from `useSettingsStore().themeMode` and
 * resolve 'system' → actual scheme here.
 */
export function useTheme(): {
  mode: 'light' | 'dark';
  colors: ThemeColors;
  isDark: boolean;
} {
  const systemScheme = useColorScheme();
  const resolved = systemScheme === 'dark' ? 'dark' : 'light';

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
