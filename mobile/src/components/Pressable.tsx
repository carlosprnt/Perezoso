// Phase 3 — Shared UI primitive: Pressable
// Replicates the web app's .pressable CSS class:
//   transition: transform 0.1s var(--ease-accelerate);
//   :active { transform: scale(0.98); }
//
// This wraps any content with the product's press feedback.
// It does NOT add its own background, padding, or shape —
// it only provides the scale-down-on-press behavior.
//
// Every interactive surface in the app uses this.
// Getting the feel wrong here makes everything feel wrong.

import React, { useCallback, type ReactNode } from 'react';
import {
  Pressable as RNPressable,
  type ViewStyle,
  type StyleProp,
  type GestureResponderEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { pressTiming, pressReleaseTiming } from '../motion/timing';

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

interface PressableProps {
  children: ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
  onLongPress?: (e: GestureResponderEvent) => void;
  /** Scale when pressed. Default 0.98 matches web .pressable:active */
  activeScale?: number;
  /** Whether interaction is disabled */
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Accessibility label */
  accessibilityLabel?: string;
  /** Accessibility role */
  accessibilityRole?: 'button' | 'link' | 'none';
  /** Test ID */
  testID?: string;
  /** Hit slop for larger touch targets */
  hitSlop?: number | { top: number; bottom: number; left: number; right: number };
}

export function Pressable({
  children,
  onPress,
  onLongPress,
  activeScale = 0.98,
  disabled = false,
  style,
  accessibilityLabel,
  accessibilityRole = 'button',
  testID,
  hitSlop,
}: PressableProps) {
  const scale = useSharedValue(1);

  const onPressIn = useCallback(() => {
    // 100ms accelerate — fast, front-loaded response
    scale.value = withTiming(activeScale, pressTiming);
  }, [activeScale, scale]);

  const onPressOut = useCallback(() => {
    // 100ms decelerate — smooth return
    scale.value = withTiming(1, pressReleaseTiming);
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      style={[animatedStyle, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      testID={testID}
      hitSlop={hitSlop}
    >
      {children}
    </AnimatedPressable>
  );
}
