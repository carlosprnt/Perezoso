// Phase 2 — Motion hook: useScrollDrivenBlur
// Replicates the iOS SwiftUI ScrollDrivenBlur and web's scroll-fade behavior.
//
// Web behavior (DashboardSummaryHero, scroll-linked):
//   - Items in the center 55% of the viewport are sharp
//   - Items approaching edges get progressively blurred (max 10–12px)
//   - Opacity fades to 45% at the edge
//   - Optional scale reduction (e.g., 0.9 for quick-add platforms)
//
// iOS SwiftUI (ScrollDrivenBlur in Motion.swift):
//   - Uses .visualEffect with GeometryProxy
//   - Quadratic falloff curve: t² for natural blur progression
//   - sharpFraction: 0.55, maxBlur: 10, minScale: 1.0
//
// In React Native, this is implemented via Reanimated's
// useAnimatedScrollHandler + per-item layout measurement.
// The actual blur effect requires expo-blur or a custom shader;
// this hook provides the computed values for opacity, scale,
// and a blur progress value that can drive a BlurView's intensity.

import { useMemo } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { scrollBlurProgress, scrollBlurRadius, scrollBlurOpacity, scrollBlurScale } from './interpolate';

interface UseScrollDrivenBlurOptions {
  /** Scroll offset shared value from useAnimatedScrollHandler */
  scrollY: SharedValue<number>;
  /** Viewport height in px */
  viewportHeight: number;
  /** Item's top position relative to scroll content */
  itemTop: number;
  /** Item's height */
  itemHeight: number;
  /** Fraction of viewport that remains sharp (0–1). Default: 0.55 */
  sharpFraction?: number;
  /** Maximum blur radius. Default: 10 */
  maxBlur?: number;
  /** Maximum opacity fade (0–1). Default: 0.55 */
  maxFade?: number;
  /** Minimum scale at full blur. Default: 1 (no scale) */
  minScale?: number;
}

export function useScrollDrivenBlur(options: UseScrollDrivenBlurOptions) {
  const {
    scrollY,
    viewportHeight,
    itemTop,
    itemHeight,
    sharpFraction = 0.55,
    maxBlur = 10,
    maxFade = 0.55,
    minScale = 1,
  } = options;

  // Compute normalized center position within the viewport
  const blurProgress = useDerivedValue(() => {
    const itemCenter = itemTop + itemHeight / 2 - scrollY.value;
    const normalizedCenter = itemCenter / viewportHeight;
    return scrollBlurProgress(normalizedCenter, sharpFraction);
  });

  const animatedStyle = useAnimatedStyle(() => {
    const p = blurProgress.value;
    return {
      opacity: scrollBlurOpacity(p, maxFade),
      transform: [{ scale: scrollBlurScale(p, minScale) }],
    };
  });

  return {
    /** Animated style with opacity + scale. Apply to Animated.View wrapper. */
    animatedStyle,
    /** Raw blur progress (0–1). Use to drive BlurView intensity. */
    blurProgress,
    /** Computed blur radius. Use to set blur intensity. */
    blurRadius: useDerivedValue(() => scrollBlurRadius(blurProgress.value, maxBlur)),
  };
}
