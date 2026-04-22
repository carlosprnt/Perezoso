// Phase 1 — Design tokens: shadows
// Derived from Perezoso web app inline box-shadow values
// React Native shadows use the iOS shadow* props + Android elevation

import { Platform, type ViewStyle } from 'react-native';

type ShadowStyle = Pick<
  ViewStyle,
  'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'
>;

function shadow(
  offsetX: number,
  offsetY: number,
  blurRadius: number,
  color: string,
  opacity: number,
  elevation: number,
): ShadowStyle {
  return Platform.select({
    ios: {
      shadowColor: color,
      shadowOffset: { width: offsetX, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: blurRadius / 2, // iOS shadowRadius ≈ CSS blur / 2
    },
    android: {
      elevation,
    },
    default: {
      shadowColor: color,
      shadowOffset: { width: offsetX, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: blurRadius / 2,
      elevation,
    },
  }) as ShadowStyle;
}

export const shadows = {
  /** No shadow */
  none: shadow(0, 0, 0, '#000', 0, 0),

  /** Subtle card lift — 0 1px 2px rgba(0,0,0,0.05) */
  sm: shadow(0, 1, 2, '#000000', 0.05, 1),

  /** Card resting state — 0 -1px 2px rgba(0,0,0,0.04) */
  cardSubtle: shadow(0, -1, 2, '#000000', 0.04, 1),

  /** Opportunity card — 0 1px 5px rgba(0,0,0,0.06) */
  cardSm: shadow(0, 1, 5, '#000000', 0.06, 2),

  /** Stacked card — 0 2px 8px rgba(0,0,0,0.09) */
  cardMd: shadow(0, 2, 8, '#000000', 0.09, 3),

  /** Standard medium — 0 4px 6px rgba(0,0,0,0.1) */
  md: shadow(0, 4, 6, '#000000', 0.1, 4),

  /** Form field focus — 0 1px 3px rgba(0,0,0,0.2) */
  fieldFocus: shadow(0, 1, 3, '#000000', 0.2, 2),

  /** Dropdown / menu — 0 4px 24px rgba(0,0,0,0.12) */
  dropdown: shadow(0, 4, 24, '#000000', 0.12, 8),

  /** Bottom sheet top edge — 0 -12px 40px rgba(0,0,0,0.22) */
  sheetTop: shadow(0, -12, 40, '#000000', 0.22, 16),

  /** Standard bottom sheet — direct style (not Platform.select) for sheets
   *  that set shadowColor/shadowOpacity/shadowRadius/shadowOffset/elevation
   *  verbatim (the shadow() helper halves blurRadius for iOS, but these
   *  sheets already use the raw iOS values). */
  sheet: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 24,
  } as ShadowStyle,
} as const;

export type ShadowToken = keyof typeof shadows;
