// Phase 2 — Motion hook: usePressable
// Replicates the web app's .pressable class behavior:
//   CSS: transform 0.1s var(--ease-accelerate); :active { scale: 0.98 }
//
// This is the most frequently used motion in the app. Every card,
// button, and interactive element uses it. Getting this wrong makes
// the entire app feel off.
//
// The web version uses CSS scale(0.98) on :active with a 0.1s
// accelerate transition. We replicate this with Reanimated shared values.

import { useCallback } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  type AnimatedStyle,
} from 'react-native-reanimated';
import { pressTiming, pressReleaseTiming } from './timing';

interface UsePressableOptions {
  /** Scale when pressed. Default 0.98 (web: scale(0.98)) */
  scale?: number;
  /** Opacity when pressed. Default 1 (no opacity change by default) */
  opacity?: number;
  /** Whether the pressable is disabled */
  disabled?: boolean;
}

interface UsePressableReturn {
  /** Animated style to spread onto Animated.View */
  animatedStyle: AnimatedStyle;
  /** Call on pressIn / gesture begin */
  onPressIn: () => void;
  /** Call on pressOut / gesture end */
  onPressOut: () => void;
  /** Whether currently pressed (shared value for composition) */
  pressed: { value: boolean };
}

export function usePressable(options: UsePressableOptions = {}): UsePressableReturn {
  const {
    scale = 0.98,
    opacity = 1,
    disabled = false,
  } = options;

  const isPressed = useSharedValue(false);

  const onPressIn = useCallback(() => {
    if (disabled) return;
    isPressed.value = true;
  }, [disabled, isPressed]);

  const onPressOut = useCallback(() => {
    isPressed.value = false;
  }, [isPressed]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: isPressed.value
            ? withTiming(scale, pressTiming)
            : withTiming(1, pressReleaseTiming),
        },
      ],
      opacity: isPressed.value
        ? withTiming(opacity, pressTiming)
        : withTiming(1, pressReleaseTiming),
    };
  });

  return {
    animatedStyle,
    onPressIn,
    onPressOut,
    pressed: isPressed,
  };
}

// ─── Preset variants ────────────────────────────────────────────────
// Named presets matching the web app's different press behaviors.

/** Standard press: scale 0.98 (subscription cards, list items) */
export const PRESS_STANDARD = { scale: 0.98 } as const;

/** Button press: scale 0.95 (FloatingNav plus button, CTAs) */
export const PRESS_BUTTON = { scale: 0.95 } as const;

/** Subtle press: scale 0.99 (small interactive elements) */
export const PRESS_SUBTLE = { scale: 0.99 } as const;

/** Card while dragging: scale 0.97 (SavingsCarousel front card) */
export const PRESS_DRAG = { scale: 0.97 } as const;
