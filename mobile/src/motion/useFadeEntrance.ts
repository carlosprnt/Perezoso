// Phase 2 — Motion hook: useFadeEntrance
// Replicates the web app's animate-fade-in and animate-fade-in-scale.
//
// Web behavior:
//   fade-in:       opacity 0→1, translateY 6px→0, 0.2s decelerate
//   fade-in-scale: opacity 0→1, scale 0.97→1,     0.18s decelerate
//   slide-up:      translateY 100%→0,              0.3s decelerate
//   slide-down:    opacity 0→1, translateY -8px→0, 0.2s decelerate
//
// This hook returns animated styles that trigger on mount.
// It does NOT handle exit — AnimatePresence equivalent will be
// handled at the component level with layout animations.

import { useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { fadeEntrance, scaleEntrance, slideUpEntrance } from './timing';
import { decelerate } from './easing';
import { duration } from './timing';

type EntranceVariant = 'fadeIn' | 'fadeInScale' | 'slideUp' | 'slideDown';

interface UseFadeEntranceOptions {
  /** Which entrance animation to use */
  variant?: EntranceVariant;
  /** Delay before starting (ms). Use with stagger. */
  delay?: number;
  /** Set false to prevent animation (e.g., for items already visible) */
  enabled?: boolean;
}

const CONFIGS: Record<EntranceVariant, {
  duration: number;
  translateY: number;
  scale: number;
}> = {
  fadeIn: {
    duration: duration.entrance,   // 200ms
    translateY: 6,                 // 6px upward
    scale: 1,                      // no scale change
  },
  fadeInScale: {
    duration: duration.micro,      // 180ms
    translateY: 0,                 // no translate
    scale: 0.97,                   // scale from 0.97
  },
  slideUp: {
    duration: duration.slideUp,    // 300ms
    translateY: 80,                // large upward slide (% of parent in web)
    scale: 1,
  },
  slideDown: {
    duration: duration.entrance,   // 200ms
    translateY: -8,                // 8px downward
    scale: 1,
  },
};

export function useFadeEntrance(options: UseFadeEntranceOptions = {}) {
  const {
    variant = 'fadeIn',
    delay: delayMs = 0,
    enabled = true,
  } = options;

  const config = CONFIGS[variant];
  const opacity = useSharedValue(enabled ? 0 : 1);
  const translateY = useSharedValue(enabled ? config.translateY : 0);
  const scale = useSharedValue(enabled ? config.scale : 1);

  useEffect(() => {
    if (!enabled) return;

    const timingConfig = {
      duration: config.duration,
      easing: decelerate,
    };

    opacity.value = withDelay(delayMs, withTiming(1, timingConfig));
    translateY.value = withDelay(delayMs, withTiming(0, timingConfig));
    if (config.scale !== 1) {
      scale.value = withDelay(delayMs, withTiming(1, timingConfig));
    }
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return { animatedStyle };
}
