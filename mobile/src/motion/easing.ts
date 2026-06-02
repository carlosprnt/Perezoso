// Phase 2 — Motion tokens: easing curves
// Every curve is extracted from the Perezoso web app's CSS cubic-bezier values
// and Framer Motion ease arrays. These are NOT generic easings.
//
// Reanimated's Easing.bezier(x1, y1, x2, y2) maps 1:1 to CSS cubic-bezier.
// Framer Motion's ease: [x1, y1, x2, y2] is the same format.

import { Easing } from 'react-native-reanimated';

// ─── Material-derived curves (from globals.css custom properties) ────────

/**
 * Standard — default for most UI transitions.
 * CSS: cubic-bezier(0.2, 0, 0, 1)
 * Character: fast start, very slow end. Elements feel like they "arrive".
 */
export const standard = Easing.bezier(0.2, 0, 0, 1);

/**
 * Decelerate — elements entering the viewport.
 * CSS: cubic-bezier(0, 0, 0, 1)
 * Character: instant start, long deceleration. Used for fade-in, slide-up.
 * This is the workhorse curve for entrances.
 */
export const decelerate = Easing.bezier(0, 0, 0, 1);

/**
 * Accelerate — elements leaving the viewport.
 * CSS: cubic-bezier(0.3, 0, 1, 1)
 * Character: slow start, instant end. Elements "disappear" at the edge.
 * Used for press feedback (0.1s), exit animations.
 */
export const accelerate = Easing.bezier(0.3, 0, 1, 1);

/**
 * Emphasized — same as standard but semantically distinct.
 * CSS: cubic-bezier(0.2, 0, 0, 1)
 * Used when the transition is the focal point (not just supporting UI).
 */
export const emphasized = Easing.bezier(0.2, 0, 0, 1);

// ─── Component-specific curves ──────────────────────────────────────

/**
 * Peek bounce — BottomSheet peek-out animation.
 * CSS: cubic-bezier(0.34, 1.56, 0.64, 1)
 * The y1 > 1 creates overshoot — the sheet bounces past its target.
 * This is what makes the sheet peek feel springy using CSS timing.
 */
export const peekBounce = Easing.bezier(0.34, 1.56, 0.64, 1);

/**
 * Snap back — BottomSheet return from peek / swipe cancel.
 * CSS: cubic-bezier(0.25, 0.46, 0.45, 0.94)
 * Smooth, no overshoot. Feels like settling into place.
 */
export const snapBack = Easing.bezier(0.25, 0.46, 0.45, 0.94);

/**
 * Swipe dismiss — sheet swipe-down exit.
 * CSS: cubic-bezier(0.4, 0, 1, 1)
 * Accelerating exit — the sheet speeds up as it leaves.
 */
export const swipeDismiss = Easing.bezier(0.4, 0, 1, 1);

/**
 * Panel expand — FloatingNav panel open.
 * Framer: ease [0.16, 1, 0.3, 1]
 * Very fast initial expansion, long gentle settle. Feels expansive.
 */
export const panelExpand = Easing.bezier(0.16, 1, 0.3, 1);

/**
 * Card entrance — subscription card staggered entrance.
 * Framer: ease [0.22, 1, 0.36, 1]
 * Similar to panelExpand but slightly less aggressive start.
 */
export const cardEntrance = Easing.bezier(0.22, 1, 0.36, 1);

/**
 * Swipe hint — carousel swipe hint slide.
 * Framer: ease [0.12, 0, 0.4, 1]
 * Gentle ease-in to draw attention without startling.
 */
export const swipeHint = Easing.bezier(0.12, 0, 0.4, 1);

/**
 * Swipe out — carousel card swipe exit.
 * Framer: ease [0.4, 0, 1, 1]
 * Same as swipeDismiss — accelerating exit.
 */
export const swipeOut = Easing.bezier(0.4, 0, 1, 1);

/**
 * Bubble float — hero bubble overlay entrance.
 * Framer: ease [0.15, 0, 0.25, 1]
 * Very gentle — bubbles should feel weightless.
 */
export const bubbleFloat = Easing.bezier(0.15, 0, 0.25, 1);

/**
 * Coin flip — avatar menu interaction.
 * CSS: cubic-bezier(0.05, 0.95, 0.2, 1)
 * Extremely fast start (near-instant), long momentum coast.
 */
export const coinFlip = Easing.bezier(0.05, 0.95, 0.2, 1);

// ─── Lookup table ───────────────────────────────────────────────────

export const easings = {
  standard,
  decelerate,
  accelerate,
  emphasized,
  peekBounce,
  snapBack,
  swipeDismiss,
  panelExpand,
  cardEntrance,
  swipeHint,
  swipeOut,
  bubbleFloat,
  coinFlip,
} as const;

export type EasingName = keyof typeof easings;
