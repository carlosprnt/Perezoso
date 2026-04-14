// Phase 1 — Design tokens: typography
// iOS: San Francisco (system) — 'System' fontFamily + fontWeight
//      ensures iOS actually renders the requested weight.
// Android: Nunito (loaded via expo-google-fonts) — rounded fallback;
//          on Android, each weight is a separate fontFamily name
//          because Android ignores fontWeight when fontFamily is custom.
//
// IMPORTANT: fontFamily tokens are STYLE OBJECTS, not strings.
// Call sites must spread them: `...fontFamily.bold` (not `fontFamily: fontFamily.bold`).
// This is required so iOS can honor `fontWeight` alongside the family.

import { Platform, type TextStyle } from 'react-native';

type FontToken = {
  fontFamily: string;
  fontWeight?: TextStyle['fontWeight'];
};

const iosFont = (weight: TextStyle['fontWeight']): FontToken => ({
  fontFamily: 'System',
  fontWeight: weight,
});

const androidFont = (family: string): FontToken => ({
  fontFamily: family,
});

/**
 * Font family + weight tokens. Spread into StyleSheet rules.
 * On iOS, resolves to San Francisco with explicit weight (guaranteed correct).
 * On Android, resolves to the specific Nunito TTF variant.
 */
export const fontFamily = {
  regular:   Platform.OS === 'ios' ? iosFont('400') : androidFont('Nunito_400Regular'),
  medium:    Platform.OS === 'ios' ? iosFont('500') : androidFont('Nunito_500Medium'),
  semibold:  Platform.OS === 'ios' ? iosFont('600') : androidFont('Nunito_600SemiBold'),
  bold:      Platform.OS === 'ios' ? iosFont('700') : androidFont('Nunito_700Bold'),
  extrabold: Platform.OS === 'ios' ? iosFont('800') : androidFont('Nunito_800ExtraBold'),
  black:     Platform.OS === 'ios' ? iosFont('900') : androidFont('Nunito_900Black'),
};

/**
 * Font sizes — every value used in the app.
 * Named after their px value for zero ambiguity.
 */
export const fontSize = {
  10: 10,
  11: 11,
  13: 13,
  14: 14,
  15: 15,
  16: 16,
  18: 18,
  20: 20,
  24: 24,
  32: 32,
  45: 45,
  50: 50,
} as const;

/** Line height multipliers — matching web's Tailwind leading-* values */
export const lineHeight = {
  none:    1,
  compact: 1.15,
  tight:   1.25,
  snug:    1.375,
  normal:  1.5,
} as const;

/** Letter spacing — matching web's tracking-* values */
export const letterSpacing = {
  tight:  -0.5,
  normal:  0,
  wide:    0.4,
  widest:  1.6, // ~0.1em at 16px base
} as const;

/**
 * Semantic text presets — ready-to-spread style objects.
 * Each preset encodes the font family, size, weight, and line height
 * as used in the web app's components.
 */
export const textPreset = {
  // Hero / display
  heroAmount: {
    ...fontFamily.extrabold,
    fontSize: fontSize[50],
    lineHeight: fontSize[50] * lineHeight.none,
    letterSpacing: letterSpacing.tight,
  },
  heroText: {
    ...fontFamily.extrabold,
    fontSize: fontSize[45],
    lineHeight: fontSize[45] * lineHeight.compact,
    letterSpacing: letterSpacing.tight,
  },

  // Headings
  h1: {
    ...fontFamily.bold,
    fontSize: fontSize[32],
    lineHeight: fontSize[32] * lineHeight.tight,
    letterSpacing: letterSpacing.tight,
  },
  h2: {
    ...fontFamily.bold,
    fontSize: fontSize[24],
    lineHeight: fontSize[24] * lineHeight.tight,
  },
  h3: {
    ...fontFamily.bold,
    fontSize: fontSize[20],
    lineHeight: fontSize[20] * lineHeight.snug,
  },

  // Titles (card titles, section headers)
  titleLg: {
    ...fontFamily.bold,
    fontSize: fontSize[18],
    lineHeight: fontSize[18] * lineHeight.snug,
  },
  titleMd: {
    ...fontFamily.semibold,
    fontSize: fontSize[15],
    lineHeight: fontSize[15] * lineHeight.snug,
  },
  titleSm: {
    ...fontFamily.semibold,
    fontSize: fontSize[14],
    lineHeight: fontSize[14] * lineHeight.snug,
  },

  // Body
  bodyLg: {
    ...fontFamily.regular,
    fontSize: fontSize[16],
    lineHeight: fontSize[16] * lineHeight.normal,
  },
  bodyMd: {
    ...fontFamily.regular,
    fontSize: fontSize[14],
    lineHeight: fontSize[14] * lineHeight.normal,
  },
  bodySm: {
    ...fontFamily.regular,
    fontSize: fontSize[13],
    lineHeight: fontSize[13] * lineHeight.normal,
  },

  // Captions / labels
  caption: {
    ...fontFamily.medium,
    fontSize: fontSize[14],
    lineHeight: fontSize[14] * lineHeight.snug,
  },
  captionSm: {
    ...fontFamily.medium,
    fontSize: fontSize[11],
    lineHeight: fontSize[11] * lineHeight.snug,
  },
  label: {
    ...fontFamily.semibold,
    fontSize: fontSize[14],
    lineHeight: fontSize[14] * lineHeight.snug,
    letterSpacing: letterSpacing.widest,
  },
  labelSm: {
    ...fontFamily.semibold,
    fontSize: fontSize[10],
    lineHeight: fontSize[10] * lineHeight.snug,
    letterSpacing: letterSpacing.wide,
  },

  // Input (16px min to prevent iOS zoom)
  input: {
    ...fontFamily.regular,
    fontSize: fontSize[16],
    lineHeight: fontSize[16] * lineHeight.normal,
  },

  // Button text
  buttonSm: {
    ...fontFamily.semibold,
    fontSize: fontSize[14],
    lineHeight: fontSize[14] * lineHeight.none,
  },
  buttonMd: {
    ...fontFamily.semibold,
    fontSize: fontSize[14],
    lineHeight: fontSize[14] * lineHeight.none,
  },
  buttonLg: {
    ...fontFamily.semibold,
    fontSize: fontSize[14],
    lineHeight: fontSize[14] * lineHeight.none,
  },
} as const;

export type FontFamily = keyof typeof fontFamily;
export type TextPreset = keyof typeof textPreset;
