// Phase 1 — Design tokens: opacity
// Derived from Perezoso web app opacity patterns

export const opacity = {
  /** Fully transparent */
  transparent: 0,
  /** Subtle background tints */
  5: 0.05,
  /** Disabled state (buttons, inputs) */
  disabled: 0.4,
  /** Scroll-driven blur fade-out floor */
  blurFade: 0.45,
  /** De-emphasized text / inactive items */
  muted: 0.5,
  /** Secondary interactive elements */
  secondary: 0.6,
  /** Floating nav pill background (light) */
  navPillLight: 0.65,
  /** Progress bar fills, mid-emphasis */
  medium: 0.7,
  /** Sweep reflection highlight */
  sweep: 0.72,
  /** Text overlays, high-emphasis */
  overlay: 0.8,
  /** Floating nav pill background (dark) */
  navPillDark: 0.85,
  /** Fully opaque */
  full: 1,
} as const;

/** Pressed-state opacity for interactive elements */
export const pressedOpacity = {
  /** Light press feedback */
  light: 0.7,
  /** Standard press feedback */
  default: 0.6,
  /** Heavy press feedback */
  heavy: 0.5,
} as const;

export type OpacityToken = keyof typeof opacity;
