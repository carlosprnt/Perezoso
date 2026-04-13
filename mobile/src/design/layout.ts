// Phase 1 — Design tokens: layout
// Derived from Perezoso web app component dimensions

import { Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

/** Floating nav pill dimensions */
export const floatingNav = {
  buttonWidth: 72,
  buttonHeight: 48,
  padding: 8,
  gap: 8,
  borderRadius: 9999,
} as const;

/** Draggable surface / peek panel */
export const draggableSurface = {
  peekHeight: 120,
} as const;

/** Bottom sheet sizing */
export const sheet = {
  borderRadius: 32,
  /** Default max height fraction (0–1) — 80dvh */
  maxHeightDefault: 0.80,
  /** Tall variant — 82dvh */
  maxHeightTall: 0.82,
  /** Full variant — 92dvh */
  maxHeightFull: 0.92,
  /** Bottom padding (before safe area) */
  paddingBottom: 16,
} as const;

/** Subscription card dimensions */
export const card = {
  borderRadius: 32,
  paddingSm: 16,
  paddingMd: 20,
  paddingLg: 24,
} as const;

/** Avatar / logo sizes */
export const avatar = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 56,
  '2xl': 64,
} as const;

/** Button height — web uses 48px (h-12) for all sizes */
export const button = {
  height: 48,
} as const;

/** Input field dimensions */
export const input = {
  height: 48,
  paddingHorizontal: 12,
  paddingVertical: 10,
} as const;

/** Status indicator dot */
export const statusDot = {
  size: 6,
  borderRadius: 3,
} as const;

/** Screen dimensions (snapshot — use Dimensions listener for updates) */
export const screen = {
  width: screenWidth,
  height: screenHeight,
} as const;

export type AvatarSize = keyof typeof avatar;
