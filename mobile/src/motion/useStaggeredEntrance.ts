// Phase 2 — Motion hook: useStaggeredEntrance
// Replicates the web app's staggered list entrance.
//
// Web behavior (SubscriptionCard, CSS stagger classes):
//   Each child delays by 55ms * index (40ms in CSS nth-child, 55ms in Framer).
//   Animation: opacity 0→1, translateY 6px→0, 0.4s [0.22, 1, 0.36, 1]
//
// Usage:
//   const { animatedStyle } = useStaggeredEntrance({ index: 3 });
//   <Animated.View style={animatedStyle}>...</Animated.View>

import { useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { cardEntrance } from './easing';
import { duration, delay } from './timing';

interface UseStaggeredEntranceOptions {
  /** Item index in the list (0-based) */
  index: number;
  /** Set false to skip animation */
  enabled?: boolean;
  /** Override the per-item delay increment (default: 55ms) */
  staggerMs?: number;
  /** Override duration (default: 400ms card entrance) */
  durationMs?: number;
  /** Initial translateY offset (default: 6px) */
  translateY?: number;
}

export function useStaggeredEntrance(options: UseStaggeredEntranceOptions) {
  const {
    index,
    enabled = true,
    staggerMs = delay.stagger,
    durationMs = duration.cardEntrance,
    translateY: initialY = 6,
  } = options;

  const opacity = useSharedValue(enabled ? 0 : 1);
  const translateY = useSharedValue(enabled ? initialY : 0);

  useEffect(() => {
    if (!enabled) return;

    const itemDelay = index * staggerMs;
    const config = { duration: durationMs, easing: cardEntrance };

    opacity.value = withDelay(itemDelay, withTiming(1, config));
    translateY.value = withDelay(itemDelay, withTiming(0, config));
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return { animatedStyle };
}
