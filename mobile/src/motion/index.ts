// Phase 2 — Motion system: barrel export

// ─── Token files ────────────────────────────────────────────────────
export { snap, card, tab, peek, sheet, elastic, emphasis, panRelease, springs } from './springs';
export type { SpringName } from './springs';

export {
  standard, decelerate, accelerate, emphasized,
  peekBounce, snapBack, swipeDismiss, panelExpand,
  cardEntrance, swipeHint, swipeOut, bubbleFloat, coinFlip,
  easings,
} from './easing';
export type { EasingName } from './easing';

export {
  duration, delay, velocity, staggerDelay,
  pressTiming, pressReleaseTiming, fadeEntrance, scaleEntrance,
  slideUpEntrance, backdropEntrance, cardEntranceTiming, panelExpandTiming,
  dismissTiming, snapBackTiming, peekOutTiming, peekBackTiming, standardTiming,
} from './timing';
export type { DurationName, DelayName } from './timing';

export {
  scrollBlurProgress, scrollBlurRadius, scrollBlurOpacity, scrollBlurScale,
  elasticPull, overdamp, surfaceProgress,
  greetingOpacity, heroFadeOpacity, greetingFontSize,
  cardStackGap, carouselRotation,
  peekScale, peekOpacity, peekOffset,
} from './interpolate';

// ─── Hooks ──────────────────────────────────────────────────────────
export { usePressable, PRESS_STANDARD, PRESS_BUTTON, PRESS_SUBTLE, PRESS_DRAG } from './usePressable';
export { useFadeEntrance } from './useFadeEntrance';
export { useStaggeredEntrance } from './useStaggeredEntrance';
export { usePeekBounce } from './usePeekBounce';
export { useElasticPullDown } from './useElasticPullDown';
export { useScrollDrivenBlur } from './useScrollDrivenBlur';
export { useSheetGesture } from './useSheetGesture';
