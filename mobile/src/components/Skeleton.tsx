// Shared UI primitive: Skeleton
// Pulsing shimmer placeholder — used while a value is transitioning
// (e.g. monthly → annual totals) or while remote data is loading.
//
// Implementation: a rounded View with a subtle base color that pulses
// its opacity between 1 and 0.45 on a ~650ms reverse timing loop. On
// top sits a translucent linear-gradient band that sweeps left-to-right
// across the width every ~1100ms, giving the classic "shimmer" feel.
//
// The component measures its own width via onLayout so the shimmer
// band scales correctly to any container. Until width is measured the
// band is hidden (translateX off-screen).

import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../design/useTheme';

interface SkeletonProps {
  /** Outer style — typically width, height, borderRadius. */
  style?: StyleProp<ViewStyle>;
  /** Override base pulse color. */
  baseColor?: string;
  /** Override highlight color for the sweeping shimmer band. */
  highlightColor?: string;
  /** Border radius (defaults to 6). */
  borderRadius?: number;
}

export function Skeleton({
  style,
  baseColor,
  highlightColor,
  borderRadius = 6,
}: SkeletonProps) {
  const { isDark } = useTheme();

  const base = baseColor ?? (isDark ? '#2C2C2E' : '#E5E7EB');
  const highlight =
    highlightColor ?? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.75)');

  const width = useSharedValue(0);
  const pulse = useSharedValue(0);
  const shimmer = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 650, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.linear }),
      -1,
      false,
    );
    return () => {
      cancelAnimation(pulse);
      cancelAnimation(shimmer);
    };
  }, [pulse, shimmer]);

  const onLayout = (e: LayoutChangeEvent) => {
    width.value = e.nativeEvent.layout.width;
  };

  const baseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [1, 0.55]),
  }));

  const shimmerStyle = useAnimatedStyle(() => {
    const w = width.value;
    if (w === 0) return { transform: [{ translateX: -9999 }] };
    const tx = interpolate(shimmer.value, [0, 1], [-w, w]);
    return { transform: [{ translateX: tx }] };
  });

  return (
    <View
      onLayout={onLayout}
      style={[styles.container, { borderRadius }, style]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: base, borderRadius },
          baseStyle,
        ]}
      />
      <Animated.View style={[StyleSheet.absoluteFill, shimmerStyle]}>
        <LinearGradient
          colors={['transparent', highlight, 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[StyleSheet.absoluteFill, { borderRadius }]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
