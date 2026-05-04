// Phase 2 — Motion tokens: timing presets
// Every duration and delay is extracted from the Perezoso web app.
// These encode how fast each type of transition should feel.
//
// The web app uses withTiming (CSS transitions) for simple state changes
// and withSpring for physics-driven interactions. This file covers the
// timing side — springs.ts covers the physics side.

import type { WithTimingConfig } from 'react-native-reanimated';
import {
  decelerate,
  accelerate,
  standard,
  cardEntrance,
  peekBounce,
  snapBack,
  swipeDismiss,
  panelExpand,
} from './easing';

// ─── Raw durations (ms) ─────────────────────────────────────────────
// Named by their role, not their value.

export const duration = {
  /** Press feedback — must feel instant. CSS: 0.1s */
  press: 100,
  /** Micro transitions — fade-in-scale, backdrop. CSS: 0.18s */
  micro: 180,
  /** Standard entrance — fade-in, slide-down. CSS: 0.2s */
  entrance: 200,
  /** Backdrop fade. CSS: 0.2s linear → we use decelerate */
  backdrop: 200,
  /** Panel expand (FloatingNav). Framer: 0.25s */
  panel: 250,
  /** Dismiss transition — swipe-down sheet. CSS: 0.28s */
  dismiss: 280,
  /** Slide-up entrance — sheets, modals. CSS: 0.3s */
  slideUp: 300,
  /** Peek bounce out. CSS: 0.38s */
  peekOut: 380,
  /** Peek bounce return. CSS: 0.36s */
  peekBack: 360,
  /** Card entrance per item. Framer: 0.4s */
  cardEntrance: 400,
  /** Coin flip rotation. CSS: 0.45s */
  coinFlip: 450,
  /** Swipe hint total. Framer: 1.4s slide + 0.25s reset */
  swipeHintSlide: 1400,
  /** Swipe hint reset */
  swipeHintReset: 250,
  /** Plus button pulse repeat. Framer: 1.6s */
  emphasisPulse: 1600,
} as const;

// ─── Delay constants ────────────────────────────────────────────────

export const delay = {
  /** No delay */
  none: 0,
  /** Stagger increment per list item. Framer: index * 0.055s */
  stagger: 55,
  /** Peek start delay (after slide-up). CSS: 340ms */
  peekStart: 340,
  /** Peek return delay (after peek-out). CSS: 380ms */
  peekReturn: 380,
  /** Gmail panel trigger after localStorage. 350ms */
  panelTrigger: 350,
  /** Swipe hint repeat interval. 6000ms */
  swipeHintRepeat: 6000,
} as const;

// ─── Composed timing configs ────────────────────────────────────────
// Ready to pass to withTiming(value, config).

/**
 * Press feedback — 100ms accelerate.
 * Used for: button scale-down, pressable opacity change.
 * Must feel instant. Uses accelerate curve so the change is front-loaded.
 */
export const pressTiming: WithTimingConfig = {
  duration: duration.press,
  easing: accelerate,
};

/**
 * Press release — 100ms decelerate.
 * Slightly different curve on release vs press.
 */
export const pressReleaseTiming: WithTimingConfig = {
  duration: duration.press,
  easing: decelerate,
};

/**
 * Fade entrance — 200ms decelerate.
 * Used for: opacity 0→1 on mount, slide-down items.
 * The decelerate curve makes it feel like elements "arrive".
 */
export const fadeEntrance: WithTimingConfig = {
  duration: duration.entrance,
  easing: decelerate,
};

/**
 * Scale entrance — 180ms decelerate.
 * Used for: modals, dropdowns scaling from 0.97→1.
 * Slightly faster than fade to feel snappy.
 */
export const scaleEntrance: WithTimingConfig = {
  duration: duration.micro,
  easing: decelerate,
};

/**
 * Slide up — 300ms decelerate.
 * Used for: bottom sheets entering, full-height panels.
 */
export const slideUpEntrance: WithTimingConfig = {
  duration: duration.slideUp,
  easing: decelerate,
};

/**
 * Backdrop in — 200ms decelerate.
 * Web uses linear, but decelerate reads better on mobile
 * where the backdrop is more visually prominent.
 */
export const backdropEntrance: WithTimingConfig = {
  duration: duration.backdrop,
  easing: decelerate,
};

/**
 * Card entrance — 400ms cardEntrance curve.
 * Used for: subscription cards staggering in.
 * The [0.22, 1, 0.36, 1] curve gives a confident, decisive arrival.
 */
export const cardEntranceTiming: WithTimingConfig = {
  duration: duration.cardEntrance,
  easing: cardEntrance,
};

/**
 * Panel expand — 250ms panelExpand curve.
 * Used for: FloatingNav panel opening.
 */
export const panelExpandTiming: WithTimingConfig = {
  duration: duration.panel,
  easing: panelExpand,
};

/**
 * Dismiss — 280ms swipeDismiss curve.
 * Used for: sheet swipe-down exit, quick dismissals.
 * Accelerating exit — element speeds up as it leaves.
 */
export const dismissTiming: WithTimingConfig = {
  duration: duration.dismiss,
  easing: swipeDismiss,
};

/**
 * Snap back — 280ms snapBack curve.
 * Used for: cancelled swipe gestures, sheet returning to position.
 */
export const snapBackTiming: WithTimingConfig = {
  duration: duration.dismiss,
  easing: snapBack,
};

/**
 * Peek out — 380ms peekBounce curve.
 * The bounce curve (y1 > 1) creates overshoot.
 * Used for: bottom sheet peek animation.
 */
export const peekOutTiming: WithTimingConfig = {
  duration: duration.peekOut,
  easing: peekBounce,
};

/**
 * Peek back — 360ms snapBack curve.
 * Used for: peek returning to resting position.
 */
export const peekBackTiming: WithTimingConfig = {
  duration: duration.peekBack,
  easing: snapBack,
};

/** Standard transition — 200ms standard curve. Catch-all. */
export const standardTiming: WithTimingConfig = {
  duration: duration.entrance,
  easing: standard,
};

// ─── Velocity thresholds ────────────────────────────────────────────
// These determine when a gesture becomes a committed action vs. a cancel.

export const velocity = {
  /** Swipe to dismiss / carousel swipe. Framer: 200 px/s */
  swipe: 200,
  /** Surface snap (DraggableSurface). 400 px/s */
  snap: 400,
  /** Minimum drag offset for carousel swipe commit. 30px */
  swipeMinOffset: 30,
  /** Minimum drag offset for sheet dismiss. 120px */
  sheetDismissOffset: 120,
  /** Drag start dead zone. 6px */
  dragStartThreshold: 6,
  /** Swipe navigation minimum. 80px */
  swipeNavMinOffset: 80,
} as const;

// ─── Stagger helper ─────────────────────────────────────────────────

/**
 * Returns the delay for item at `index` in a staggered entrance.
 * Web: delay = index * 0.055s = index * 55ms
 */
export function staggerDelay(index: number): number {
  'worklet';
  return index * delay.stagger;
}

export type DurationName = keyof typeof duration;
export type DelayName = keyof typeof delay;
