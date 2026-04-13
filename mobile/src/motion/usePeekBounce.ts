// Phase 2 — Motion hook: usePeekBounce
// Replicates the web app's BottomSheet peek animation.
//
// Web behavior (BottomSheet.tsx):
//   1. Sheet slides up (300ms decelerate) → enters viewport
//   2. After 340ms delay → peek OUT: translateY shifts by peekDistance
//      over 380ms with cubic-bezier(0.34, 1.56, 0.64, 1) — BOUNCE
//   3. After 380ms delay → peek BACK: returns to 0
//      over 360ms with cubic-bezier(0.25, 0.46, 0.45, 0.94) — SETTLE
//
// Total sequence: 300 + 340 + 380 + 380 + 360 = ~1760ms
// The bounce curve (y1=1.56 > 1) creates overshoot — the sheet
// momentarily extends past its peek target, then settles.
// This tiny detail communicates "there's more content below".

import { useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
} from 'react-native-reanimated';
import { peekBounce, snapBack } from './easing';
import { duration, delay } from './timing';

interface UsePeekBounceOptions {
  /** Distance to peek (px). Positive = downward. Default: 12 */
  peekDistance?: number;
  /** Whether to run the animation */
  enabled?: boolean;
  /** Delay before the peek sequence starts (ms). Default: 340 */
  initialDelay?: number;
}

export function usePeekBounce(options: UsePeekBounceOptions = {}) {
  const {
    peekDistance = 12,
    enabled = true,
    initialDelay = delay.peekStart,
  } = options;

  const translateY = useSharedValue(0);

  useEffect(() => {
    if (!enabled) return;

    // Sequence: wait → bounce out → wait → settle back
    translateY.value = withDelay(
      initialDelay,
      withSequence(
        // Peek OUT with bounce overshoot
        withTiming(peekDistance, {
          duration: duration.peekOut,
          easing: peekBounce,
        }),
        // Pause at peek position
        withDelay(
          delay.peekReturn,
          // Peek BACK with smooth settle
          withTiming(0, {
            duration: duration.peekBack,
            easing: snapBack,
          }),
        ),
      ),
    );
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return { animatedStyle, translateY };
}
