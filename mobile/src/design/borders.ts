// Phase 1 — Design tokens: borders
// Derived from Perezoso web app border widths + themed colors

import { StyleSheet } from 'react-native';

export const borderWidth = {
  none: 0,
  hairline: StyleSheet.hairlineWidth, // ~0.5 on iOS retina
  default: 1,                         // standard component borders
  thick: 1.5,                         // status dot indicator
  focus: 2,                           // focus ring width
} as const;

/**
 * Border color tokens are theme-dependent.
 * Use via useTheme().colors.border / colors.borderLight / colors.borderStrong.
 *
 * Non-themed border constants:
 */
export const borderColors = {
  /** Focus ring on inputs/buttons — semi-transparent accent */
  focusRing: 'rgba(0, 0, 0, 0.4)',
  /** Focus ring offset */
  focusRingOffset: 1,
} as const;

export type BorderWidthToken = keyof typeof borderWidth;
