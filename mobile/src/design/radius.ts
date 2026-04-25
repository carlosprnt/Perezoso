// Phase 1 — Design tokens: border radius
// Derived from Perezoso web app CSS custom properties + Tailwind classes
// --radius-sm: 6px, --radius-md: 10px, --radius-lg: 14px, --radius-xl: 18px
// Plus component-specific values: 8, 12, 16, 20, 32, 9999

export const radius = {
  /** 6px — small elements (badges, small tags) */
  sm: 6,
  /** 8px — inputs, small cards */
  md: 8,
  /** 10px — medium components */
  lg: 10,
  /** 12px — buttons, list items */
  xl: 12,
  /** 14px — cards, panels */
  '2xl': 14,
  /** 16px — sheets top radius, larger cards */
  '3xl': 16,
  /** 18px — prominent surfaces */
  '4xl': 18,
  /** 20px — modal surfaces */
  '5xl': 20,
  /** 32px — subscription cards, bottom sheets */
  card: 32,
  /** 9999px — pills, avatars, circular elements */
  full: 9999,
} as const;

export type RadiusToken = keyof typeof radius;
