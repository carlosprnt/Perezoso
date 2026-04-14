// Phase 1 — Design tokens: typography
// iOS: SF Pro Rounded (system) — matches web's `ui-rounded` CSS generic
// Android: Nunito (loaded via expo-google-fonts) — rounded fallback

import { Platform } from 'react-native';

/**
 * Font family names.
 * iOS uses SF Pro Rounded PostScript names (system font, no loading needed).
 * Android uses Nunito loaded through expo-google-fonts.
 */
export const fontFamily = {
  regular: Platform.select({
    ios: 'SFProRounded-Regular',
    default: 'Nunito_400Regular',
  }),
  medium: Platform.select({
    ios: 'SFProRounded-Medium',
    default: 'Nunito_500Medium',
  }),
  semibold: Platform.select({
    ios: 'SFProRounded-Semibold',
    default: 'Nunito_600SemiBold',
  }),
  bold: Platform.select({
    ios: 'SFProRounded-Bold',
    default: 'Nunito_700Bold',
  }),
  extrabold: Platform.select({
    ios: 'SFProRounded-Heavy',
    default: 'Nunito_800ExtraBold',
  }),
  black: Platform.select({
    ios: 'SFProRounded-Black',
    default: 'Nunito_900Black',
  }),
} as const;

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
    fontFamily: fontFamily.extrabold,
    fontSize: fontSize[50],
    lineHeight: fontSize[50] * lineHeight.none,
    letterSpacing: letterSpacing.tight,
  },
  heroText: {
    fontFamily: fontFamily.extrabold,
    fontSize: fontSize[45],
    lineHeight: fontSize[45] * lineHeight.compact,
    letterSpacing: letterSpacing.tight,
  },

  // Headings
  h1: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize[32],
    lineHeight: fontSize[32] * lineHeight.tight,
    letterSpacing: letterSpacing.tight,
  },
  h2: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize[24],
    lineHeight: fontSize[24] * lineHeight.tight,
  },
  h3: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize[20],
    lineHeight: fontSize[20] * lineHeight.snug,
  },

  // Titles (card titles, section headers)
  titleLg: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize[18],
    lineHeight: fontSize[18] * lineHeight.snug,
  },
  titleMd: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize[15],
    lineHeight: fontSize[15] * lineHeight.snug,
  },
  titleSm: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize[14],
    lineHeight: fontSize[14] * lineHeight.snug,
  },

  // Body
  bodyLg: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize[16],
    lineHeight: fontSize[16] * lineHeight.normal,
  },
  bodyMd: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize[14],
    lineHeight: fontSize[14] * lineHeight.normal,
  },
  bodySm: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize[13],
    lineHeight: fontSize[13] * lineHeight.normal,
  },

  // Captions / labels
  caption: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize[14],
    lineHeight: fontSize[14] * lineHeight.snug,
  },
  captionSm: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize[11],
    lineHeight: fontSize[11] * lineHeight.snug,
  },
  label: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize[14],
    lineHeight: fontSize[14] * lineHeight.snug,
    letterSpacing: letterSpacing.widest,
  },
  labelSm: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize[10],
    lineHeight: fontSize[10] * lineHeight.snug,
    letterSpacing: letterSpacing.wide,
  },

  // Input (16px min to prevent iOS zoom)
  input: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize[16],
    lineHeight: fontSize[16] * lineHeight.normal,
  },

  // Button text
  buttonSm: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize[14],
    lineHeight: fontSize[14] * lineHeight.none,
  },
  buttonMd: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize[14],
    lineHeight: fontSize[14] * lineHeight.none,
  },
  buttonLg: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize[14],
    lineHeight: fontSize[14] * lineHeight.none,
  },
} as const;

export type FontFamily = keyof typeof fontFamily;
export type TextPreset = keyof typeof textPreset;
