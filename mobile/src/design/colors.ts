// Phase 1 — Design tokens: colors
// Derived from Perezoso web app globals.css + component inline styles

const palette = {
  // Neutrals
  white: '#FFFFFF',
  black: '#000000',

  // Grays (light mode surfaces)
  gray50: '#F7F8FA',
  gray100: '#F0F0F0',
  gray150: '#E8E8E8',
  gray200: '#E5E7EB',
  gray300: '#D4D4D4',
  gray400: '#D1D5DB',
  gray500: '#A3A3A3',
  gray600: '#9CA3AF',
  gray700: '#9E9E9E',
  gray800: '#8E8E93',
  gray900: '#737373',
  gray950: '#616161',

  // Dark mode surfaces
  dark100: '#121212',
  dark200: '#1C1C1E',
  dark300: '#2C2C2E',
  dark400: '#3A3A3C',

  // Semantic
  red400: '#F87171',
  red500: '#EF4444',
  red600: '#DC2626',
  red700: '#B91C1C',
  red800: '#991B1B',

  green400: '#4ADE80',
  green500: '#22C55E',
  green600: '#16A34A',
  green800: '#166534',

  amber500: '#F59E0B',
  amber600: '#D97706',
  amber800: '#92400E',

  yellow300: '#FCD34D',

  // Accent (shimmer/glow effects)
  indigo: '#3D3BF3',
} as const;

export const light = {
  // Surfaces
  background: palette.gray50,
  surface: palette.white,
  surfaceSecondary: palette.gray100,
  surfaceTertiary: palette.gray150,

  // Text
  textPrimary: palette.black,
  textSecondary: palette.gray950,
  textMuted: palette.gray900,
  textDisabled: palette.gray700,

  // Accent
  accent: palette.black,
  accentLight: palette.gray100,
  accentFg: palette.white,

  // Borders
  border: palette.gray300,
  borderStrong: palette.gray500,
  borderLight: palette.gray150,

  // Status
  statusActive: palette.green600,
  statusTrial: palette.amber600,
  statusPaused: palette.gray600,
  statusCancelled: palette.red500,

  // Semantic
  success: palette.green800,
  warning: palette.amber800,
  danger: palette.red600,
  dangerHover: palette.red700,
  dangerActive: palette.red800,

  // Overlays
  floatingNavBg: 'rgba(255, 255, 255, 0.65)',
  sheetBackdrop: 'rgba(0, 0, 0, 0.4)',

  // Misc
  scrollbarThumb: palette.gray300,
} as const;

export const dark = {
  // Surfaces
  background: palette.dark100,
  surface: palette.dark200,
  surfaceSecondary: palette.dark300,
  surfaceTertiary: palette.dark400,

  // Text
  textPrimary: '#F2F2F7',
  textSecondary: palette.gray800,
  textMuted: palette.gray600,
  textDisabled: palette.gray700,

  // Accent
  accent: palette.white,
  accentLight: palette.dark300,
  accentFg: palette.black,

  // Borders
  border: palette.dark400,
  borderStrong: palette.gray500,
  borderLight: palette.dark300,

  // Status
  statusActive: palette.green400,
  statusTrial: palette.yellow300,
  statusPaused: palette.gray600,
  statusCancelled: palette.red400,

  // Semantic
  success: palette.green400,
  warning: palette.yellow300,
  danger: palette.red500,
  dangerHover: palette.red600,
  dangerActive: palette.red700,

  // Overlays
  floatingNavBg: 'rgba(28, 28, 30, 0.85)',
  sheetBackdrop: 'rgba(0, 0, 0, 0.6)',

  // Misc
  scrollbarThumb: palette.dark300,
} as const;

/** Subscription card color presets — user-selectable */
export const cardColors = {
  white:    { bg: '#FFFFFF', border: '#E8E8E8', title: '#121212', subtitle: '#737373' },
  black:    { bg: '#121212', border: '#2C2C2E', title: '#FFFFFF', subtitle: '#737373' },
  navy:     { bg: '#1A3B8A', border: '#1A3B8A', title: '#FFFFFF', subtitle: '#8BA8D4' },
  teal:     { bg: '#B8E8F0', border: '#B8E8F0', title: '#0A3D4A', subtitle: '#3A7A88' },
  lime:     { bg: '#C4EDA8', border: '#C4EDA8', title: '#1A3D08', subtitle: '#4A7A28' },
  lavender: { bg: '#E0D8FF', border: '#E0D8FF', title: '#2D1A6B', subtitle: '#6B5BAA' },
  peach:    { bg: '#FFE4CC', border: '#FFE4CC', title: '#5C2A00', subtitle: '#9A6040' },
  rose:     { bg: '#FFD6E0', border: '#FFD6E0', title: '#5C0A1A', subtitle: '#9A4060' },
  midnight: { bg: '#1C2B3A', border: '#1C2B3A', title: '#FFFFFF', subtitle: '#5A8A9F' },
  forest:   { bg: '#2D5A27', border: '#2D5A27', title: '#FFFFFF', subtitle: '#7ABF70' },
  plum:     { bg: '#6C3483', border: '#6C3483', title: '#FFFFFF', subtitle: '#C39BD3' },
  mint:     { bg: '#B5EAD7', border: '#B5EAD7', title: '#0A3D2A', subtitle: '#3A7A60' },
  ice:      { bg: '#D6EAF8', border: '#D6EAF8', title: '#0A2A4A', subtitle: '#3A6A8A' },
  apricot:  { bg: '#FAD7A0', border: '#FAD7A0', title: '#5C2A00', subtitle: '#9A6040' },
  sand:     { bg: '#E8D5B7', border: '#E8D5B7', title: '#3D2800', subtitle: '#7A5A30' },
  gold:     { bg: '#F4D03F', border: '#F4D03F', title: '#3D2800', subtitle: '#7A5000' },
} as const;

/** Category colors for treemap / chart visualizations */
export const categoryColors = {
  streaming:    '#FECACA',
  music:        '#BBF7D0',
  productivity: '#BFDBFE',
  cloud:        '#BAE6FD',
  ai:           '#DDD6FE',
  health:       '#A7F3D0',
  gaming:       '#FED7AA',
  education:    '#FEF08A',
  mobility:     '#FBCFE8',
  home:         '#FDE68A',
  other:        '#E5E7EB',
  resto:        '#D1D5DB',
} as const;

/** Gradient definitions (use with expo-linear-gradient or Reanimated) */
export const gradients = {
  savingsBlue:   { colors: ['#DBEAFE', '#BFDBFE'] as const, start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  savingsYellow: { colors: ['#FEF9C3', '#FDE68A'] as const, start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
} as const;

export { palette };
export type CardColorName = keyof typeof cardColors;
export type CategoryName = keyof typeof categoryColors;
/** Widened type so light & dark are both assignable */
export type ThemeColors = { [K in keyof typeof light]: string };
