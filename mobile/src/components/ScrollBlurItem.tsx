// Phase 4 — Motion-dependent primitive: ScrollBlurItem
// Wraps a list item with scroll-driven blur/opacity/scale behavior.
//
// Replicates the iOS SwiftUI .scrollDrivenBlur() modifier
// and the web app's CSS filter:blur() scroll-linked behavior.
//
// BLUR RENDERING — RESOLVED:
//
// React Native 0.81 introduced a native `filter` style prop that accepts
// `{blur: number}`. This is the DIRECT equivalent of CSS `filter: blur()`.
// No third-party dependency needed. No overlay. No approximation.
//
// The animated style applied to this wrapper includes three properties:
//   1. opacity — fades from 1 to 0.45 at edges (quadratic falloff)
//   2. scale — optional shrink at edges (e.g., 0.9 for quick-add platforms)
//   3. filter: [{blur}] — real gaussian blur from 0px to maxBlur at edges
//
// All three are computed on the UI thread every frame from scroll position.
// The blur is GPU-accelerated on both iOS and Android.
//
// USAGE:
//   const scrollY = useSharedValue(0);
//   const onScroll = useAnimatedScrollHandler(e => { scrollY.value = e.contentOffset.y; });
//
//   <Animated.ScrollView onScroll={onScroll}>
//     <ScrollBlurItem scrollY={scrollY} viewportHeight={screenHeight}>
//       <SubscriptionCard ... />
//     </ScrollBlurItem>
//   </Animated.ScrollView>

import React, { useCallback, type ReactNode } from 'react';
import { type LayoutChangeEvent } from 'react-native';
import Animated, { type SharedValue } from 'react-native-reanimated';
import { useScrollDrivenBlur } from '../motion/useScrollDrivenBlur';

interface ScrollBlurItemProps {
  children: ReactNode;
  /** Scroll offset shared value from useAnimatedScrollHandler */
  scrollY: SharedValue<number>;
  /** Visible viewport height in px */
  viewportHeight: number;
  /** Fraction of viewport that stays sharp. Default: 0.55 */
  sharpFraction?: number;
  /** Maximum blur radius in px. Default: 10 */
  maxBlur?: number;
  /** Maximum opacity fade at edges (0–1). Default: 0.55 */
  maxFade?: number;
  /** Minimum scale at full blur. Default: 1 (no scale change) */
  minScale?: number;
}

export function ScrollBlurItem({
  children,
  scrollY,
  viewportHeight,
  sharpFraction,
  maxBlur,
  maxFade,
  minScale,
}: ScrollBlurItemProps) {
  const { animatedStyle, onItemLayout } = useScrollDrivenBlur({
    scrollY,
    viewportHeight,
    sharpFraction,
    maxBlur,
    maxFade,
    minScale,
  });

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { y, height } = event.nativeEvent.layout;
      onItemLayout(y, height);
    },
    [onItemLayout],
  );

  return (
    <Animated.View onLayout={handleLayout} style={animatedStyle}>
      {children}
    </Animated.View>
  );
}
