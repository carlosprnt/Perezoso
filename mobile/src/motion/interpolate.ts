// Phase 2 — Motion tokens: interpolation helpers
// Worklet-compatible interpolation functions for scroll-driven and
// gesture-driven animations. These run on the UI thread.
//
// The web app uses Framer Motion's useTransform for these mappings.
// In Reanimated, we use interpolate() or manual worklet math.

import { interpolate as reanimatedInterpolate, Extrapolation } from 'react-native-reanimated';

// ─── Scroll-driven blur zone ────────────────────────────────────────
// Matches the iOS SwiftUI ScrollDrivenBlur and web's scroll-fade behavior.

/**
 * Given an item's center position (0–1 normalized within scroll viewport),
 * returns a blur/fade progress value (0 = sharp, 1 = fully blurred).
 *
 * The scroll viewport is divided into zones:
 *   [0 ......... edge] [edge ... 1-edge] [1-edge ......... 1]
 *    ↑ blur zone        ↑ sharp zone       ↑ blur zone
 *
 * @param center  — normalized center position of the item (0 = top, 1 = bottom)
 * @param sharpFraction — fraction of viewport that stays sharp (default 0.55)
 * @returns 0–1 progress where 0 = fully sharp, 1 = fully blurred
 */
export function scrollBlurProgress(center: number, sharpFraction: number = 0.55): number {
  'worklet';
  const edge = (1 - sharpFraction) / 2;
  const lo = edge;
  const hi = 1 - edge;

  let progress: number;
  if (center < lo) {
    progress = (lo - center) / edge;
  } else if (center > hi) {
    progress = (center - hi) / edge;
  } else {
    progress = 0;
  }

  // Quadratic curve for natural falloff (matches SwiftUI implementation)
  const t = Math.min(Math.max(progress, 0), 1);
  return t * t;
}

/**
 * Applies the scroll blur progress to compute blur radius.
 * Web: blur = progress * 12 (max 12px)
 * iOS: maxBlur configurable, default 10
 */
export function scrollBlurRadius(progress: number, maxBlur: number = 10): number {
  'worklet';
  return progress * maxBlur;
}

/**
 * Applies the scroll blur progress to compute opacity.
 * Web: opacity = 1 - progress * 0.55
 * iOS: 1 - curved * 0.55
 */
export function scrollBlurOpacity(progress: number, maxFade: number = 0.55): number {
  'worklet';
  return 1 - progress * maxFade;
}

/**
 * Applies the scroll blur progress to compute scale.
 * iOS: 1 - curved * (1 - minScale)
 */
export function scrollBlurScale(progress: number, minScale: number = 1): number {
  'worklet';
  if (minScale >= 1) return 1;
  return 1 - progress * (1 - minScale);
}

// ─── Elastic pull-down curve ────────────────────────────────────────
// Matches DraggableSurface's overdamped pull behavior.

/**
 * Converts raw drag delta into an elastic pull distance.
 * Web: Math.sqrt(delta) * 3.6, capped at 65px.
 * Creates a rubber-band feel where each additional pixel of drag
 * yields diminishing returns.
 */
export function elasticPull(rawDelta: number, cap: number = 65): number {
  'worklet';
  if (rawDelta <= 0) return 0;
  const elastic = Math.sqrt(rawDelta) * 3.6;
  return Math.min(elastic, cap);
}

/**
 * Overdamp multiplier for drag beyond bounds.
 * Web: multiply by 0.15 when beyond the allowed range.
 */
export function overdamp(excess: number, factor: number = 0.15): number {
  'worklet';
  return excess * factor;
}

// ─── DraggableSurface progress ──────────────────────────────────────

/**
 * Maps a vertical position [0, loweredY] to normalized progress [0, 1].
 * Used for: background opacity, background translate, greeting transitions.
 */
export function surfaceProgress(y: number, loweredY: number): number {
  'worklet';
  if (loweredY <= 0) return 0;
  return Math.min(Math.max(y / loweredY, 0), 1);
}

// ─── Dashboard greeting transforms ─────────────────────────────────
// Web: DashboardFixedGreeting uses useTransform chains on surfaceProgress.

/** Greeting text opacity: appears between progress 0.04–0.08 */
export function greetingOpacity(progress: number): number {
  'worklet';
  return reanimatedInterpolate(progress, [0.04, 0.08], [0, 1], Extrapolation.CLAMP);
}

/** Hero content opacity: fades out between 0–0.04 */
export function heroFadeOpacity(progress: number): number {
  'worklet';
  return reanimatedInterpolate(progress, [0, 0.04], [1, 0], Extrapolation.CLAMP);
}

/** Greeting font size: scales from 17→25 over full progress */
export function greetingFontSize(progress: number): number {
  'worklet';
  return reanimatedInterpolate(progress, [0, 1], [17, 25], Extrapolation.CLAMP);
}

// ─── Card stack gap ─────────────────────────────────────────────────
// Web: gap = 8 + (elasticY / 65) * 16

/** Dashboard card stack gap during elastic pull: 8px → 24px */
export function cardStackGap(elasticY: number, cap: number = 65): number {
  'worklet';
  const t = Math.min(Math.max(elasticY / cap, 0), 1);
  return 8 + t * 16;
}

// ─── Carousel rotation ─────────────────────────────────────────────
// Web: useTransform(dragX, [-180, 0, 180], [-8, 0, 8])

/** Savings carousel card rotation during drag (degrees) */
export function carouselRotation(dragX: number): number {
  'worklet';
  return reanimatedInterpolate(dragX, [-180, 0, 180], [-8, 0, 8], Extrapolation.CLAMP);
}

// ─── Peek card transforms ───────────────────────────────────────────
// Web: scale = 1 - depth * 0.025, opacity = 1 - depth * 0.10

/** Scale for stacked peek cards behind the front card */
export function peekScale(depth: number): number {
  'worklet';
  return 1 - depth * 0.025;
}

/** Opacity for stacked peek cards behind the front card */
export function peekOpacity(depth: number): number {
  'worklet';
  return 1 - depth * 0.10;
}

/** Horizontal offset for stacked peek cards (px per depth level) */
export function peekOffset(depth: number): number {
  'worklet';
  return depth * 4;
}
