// ProgressiveBlurView — iOS-style "progressive glass" header veil.
//
// Technique (Expo Go compatible, no private APIs):
//   • MaskedView with a vertical LinearGradient mask — opaque at the
//     active edge, transparent at the opposite edge, with the fade
//     starting partway down (softFromFraction) so the blur holds
//     solid for the first chunk before tapering.
//   • An Animated.View wrapper whose opacity interpolates from 0 → 1
//     across the caller-supplied `scrollY` range.
//   • A static BlurView inside the mask at the requested intensity.
//
// This mirrors what Apple does on Settings / Wallet headers: the glass
// sits at the top edge at full strength, fades softly toward the
// content below it, and fades in/out of existence as the user scrolls.
// Everything here uses only public APIs (expo-blur, expo-linear-gradient,
// @react-native-masked-view/masked-view — all in Expo SDK 54's bundled
// native modules list) so it runs in Expo Go and carries no App Store
// review risk.

import React from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';

interface Props {
  /** Reanimated shared value tracking the scroll offset. */
  scrollY: SharedValue<number>;
  /** Scroll range over which the blur fades 0 → 1. e.g. `[0, 220]`. */
  range: [number, number];
  /** Peak blur intensity (0..100). expo-blur convention. */
  maxIntensity?: number;
  /** Which edge stays fully blurred; the opposite edge fades to clear. */
  edge?: 'top' | 'bottom';
  /** expo-blur tint. */
  tint?: 'light' | 'dark' | 'default';
  /**
   * Fraction of the height (0..1) at which the gradient mask starts
   * fading out. With 0.6 (default) the top 60% of the veil is fully
   * blurred and the bottom 40% softly fades to clear.
   */
  softFromFraction?: number;
  /** Container style (usually `StyleSheet.absoluteFill`). */
  style?: ViewStyle | ViewStyle[];
  /** Corner radius forwarded to the inner blur. */
  borderRadius?: number;
}

export function ProgressiveBlurView({
  scrollY,
  range,
  maxIntensity = 80,
  edge = 'top',
  tint = 'light',
  softFromFraction = 0.6,
  style,
  borderRadius = 0,
}: Props) {
  const fadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      range,
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  // Build gradient: 3 stops so the mask stays opaque for the first
  // `softFromFraction` of the height, then fades to transparent.
  const stops =
    edge === 'top'
      ? ({
          colors: ['rgba(0,0,0,1)', 'rgba(0,0,0,1)', 'rgba(0,0,0,0)'] as const,
          locations: [0, softFromFraction, 1] as [number, number, number],
        })
      : ({
          colors: ['rgba(0,0,0,0)', 'rgba(0,0,0,1)', 'rgba(0,0,0,1)'] as const,
          locations: [0, 1 - softFromFraction, 1] as [number, number, number],
        });

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, style, fadeStyle]}
    >
      <MaskedView
        style={StyleSheet.absoluteFill}
        maskElement={
          <LinearGradient
            colors={stops.colors}
            locations={stops.locations}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        }
      >
        <BlurView
          tint={tint}
          intensity={maxIntensity}
          style={[StyleSheet.absoluteFill, { borderRadius }]}
        />
      </MaskedView>
    </Animated.View>
  );
}
