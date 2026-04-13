// Phase 2/4 — Motion hook: useScrollDrivenBlur
// Replicates the iOS SwiftUI ScrollDrivenBlur and web's scroll-fade behavior.
//
// APPROACH: Each item measures its own layout position within the scroll content.
// Combined with the scroll offset, we compute the item's center position
// relative to the visible viewport on every frame (via useDerivedValue).
//
// BLUR RENDERING OPTIONS:
//
//   Option A — expo-blur BlurView (most faithful)
//     - iOS: Uses UIVisualEffectView — native gaussian blur, GPU-accelerated
//     - Android: Uses BlurView from @react-native-community/blur
//     - Pro: Actual blur matching CSS filter:blur() and SwiftUI .blur()
//     - Con: Requires additional dependency (expo-blur or @react-native-community/blur)
//     - Intensity can be driven by blurProgress (0–100 scale)
//
//   Option B — Opacity + scale only (fastest, partial fidelity)
//     - Pro: Zero dependencies, runs entirely on UI thread
//     - Con: No actual blur — items fade rather than defocus
//     - This is what the hook provides as baseline behavior
//
//   Option C — @shopify/react-native-skia (most powerful, heaviest)
//     - Can render real gaussian blur per-item with full control
//     - Con: Large dependency, complex setup, overkill for this use case
//
// CHOSEN APPROACH: Option A (expo-blur) for iOS fidelity, with Option B as
// fallback. The hook provides all computed values; the ScrollBlurItem component
// renders the appropriate blur layer.
//
// The blur intensity mapping:
//   blurProgress 0 (center) → intensity 0 (sharp)
//   blurProgress 1 (edge)   → intensity maxBlur (fully blurred)
// The quadratic curve (t²) in scrollBlurProgress makes the transition
// feel natural — blur accelerates as items approach the edge.

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

  // Animated style: opacity + scale (always available, no deps)
  const animatedStyle = useAnimatedStyle(() => {
    const p = blurProgress.value;
    return {
      opacity: scrollBlurOpacity(p, maxFade),
      transform: [{ scale: scrollBlurScale(p, minScale) }],
    };
  });

  // Blur radius for driving a BlurView's intensity prop
  const blurRadius = useDerivedValue(() =>
    scrollBlurRadius(blurProgress.value, maxBlur),
  );

  return {
    /** Animated style with opacity + scale. Apply to Animated.View wrapper. */
    animatedStyle,
    /** Raw blur progress (0–1). Use to drive BlurView intensity. */
    blurProgress,
    /** Computed blur radius (0–maxBlur). Maps to expo-blur intensity. */
    blurRadius,
    /** Call from item's onLayout to register position */
    onItemLayout,
  };
}
