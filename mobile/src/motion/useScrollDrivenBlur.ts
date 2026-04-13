// Phase 2/4 — Motion hook: useScrollDrivenBlur
// Replicates the iOS SwiftUI ScrollDrivenBlur and web's scroll-fade behavior.
//
// APPROACH: Each item measures its own layout position within the scroll content.
// Combined with the scroll offset, we compute the item's center position
// relative to the visible viewport on every frame (via useDerivedValue).
//
// BLUR RENDERING — FINAL DECISION:
//
// React Native 0.81 introduced a native `filter` style prop that supports
// `{blur: number}` — the DIRECT equivalent of CSS `filter: blur()`.
// This is the same rendering technique the web app uses.
//
// The `filter` prop:
//   - Is a native style property (not a third-party overlay)
//   - Uses GPU-accelerated gaussian blur on both iOS and Android
//   - Works inside Reanimated's `useAnimatedStyle` (verified by type-check)
//   - Blurs the content itself (not a backdrop/overlay approach)
//   - Is the 1:1 equivalent of CSS `filter: blur(Npx)` and SwiftUI `.blur(radius:)`
//
// This means we do NOT need expo-blur, @react-native-community/blur,
// or @shopify/react-native-skia. The blur is a style property, just like
// opacity and transform.
//
// The animated style now returns three properties in one:
//   - opacity: 1 → 0.45 at edges (quadratic falloff)
//   - scale: 1 → minScale at edges (optional)
//   - filter: [{blur: 0}] → [{blur: maxBlur}] at edges (real gaussian blur)
//
// All three run on the UI thread, computed from scroll position every frame.

import { useCallback } from 'react';
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
  /** Fraction of viewport that remains sharp (0–1). Default: 0.55 */
  sharpFraction?: number;
  /** Maximum blur radius in px. Default: 10 */
  maxBlur?: number;
  /** Maximum opacity fade at edges (0–1). Default: 0.55 */
  maxFade?: number;
  /** Minimum scale at full blur. Default: 1 (no scale change) */
  minScale?: number;
}

export function useScrollDrivenBlur(options: UseScrollDrivenBlurOptions) {
  const {
    scrollY,
    viewportHeight,
    sharpFraction = 0.55,
    maxBlur = 10,
    maxFade = 0.55,
    minScale = 1,
  } = options;

  // Item measures its own position within the scroll content
  const itemTop = useSharedValue(0);
  const itemHeight = useSharedValue(0);

  /** Call from the item's onLayout to register its position */
  const onItemLayout = useCallback(
    (y: number, h: number) => {
      itemTop.value = y;
      itemHeight.value = h;
    },
    [itemTop, itemHeight],
  );

  // Compute normalized center position within the viewport every frame
  const blurProgress = useDerivedValue(() => {
    if (itemHeight.value <= 0 || viewportHeight <= 0) return 0;
    const itemCenter = itemTop.value + itemHeight.value / 2 - scrollY.value;
    const normalizedCenter = itemCenter / viewportHeight;
    return scrollBlurProgress(normalizedCenter, sharpFraction);
  });

  // Combined animated style: opacity + scale + REAL gaussian blur
  // All three properties derived from the same blurProgress value.
  // Center items: opacity 1, scale 1, blur 0 (fully sharp)
  // Edge items: opacity 0.45, scale minScale, blur maxBlur (fully blurred)
  const animatedStyle = useAnimatedStyle(() => {
    const p = blurProgress.value;
    return {
      opacity: scrollBlurOpacity(p, maxFade),
      transform: [{ scale: scrollBlurScale(p, minScale) }],
      filter: [{ blur: scrollBlurRadius(p, maxBlur) }],
    };
  });

  // Exposed for external consumers that need raw values
  const blurRadius = useDerivedValue(() =>
    scrollBlurRadius(blurProgress.value, maxBlur),
  );

  return {
    /** Animated style with opacity + scale + blur. Apply to Animated.View. */
    animatedStyle,
    /** Raw blur progress (0–1). */
    blurProgress,
    /** Computed blur radius (0–maxBlur). */
    blurRadius,
    /** Call from item's onLayout to register position. */
    onItemLayout,
  };
}
