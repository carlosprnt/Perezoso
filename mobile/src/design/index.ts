// Phase 1 — Design tokens: barrel export

export { light, dark, palette, cardColors, categoryColors, gradients } from './colors';
export type { ThemeColors, CardColorName, CategoryName } from './colors';

export { fontFamily, fontSize, lineHeight, letterSpacing, textPreset } from './typography';
export type { FontFamily, TextPreset } from './typography';

export { spacing, px, hitSlop } from './spacing';

export { radius } from './radius';
export type { RadiusToken } from './radius';

export { shadows } from './shadows';
export type { ShadowToken } from './shadows';

export { borderWidth, borderColors } from './borders';
export type { BorderWidthToken } from './borders';

export {
  floatingNav, draggableSurface, sheet, card, avatar, button, input, statusDot, screen,
} from './layout';
export type { AvatarSize } from './layout';

export { zIndex } from './zIndex';
export type { ZIndexToken } from './zIndex';

export { opacity, pressedOpacity } from './opacity';
export type { OpacityToken } from './opacity';

export { useTheme, resolveTheme } from './useTheme';
export type { ThemeMode } from './useTheme';
