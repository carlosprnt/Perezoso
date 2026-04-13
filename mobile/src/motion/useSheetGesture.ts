// Phase 2 — Motion hook: useSheetGesture
// Replicates the web app's BottomSheet drag-to-dismiss behavior.
//
// Web behavior (BottomSheet.tsx):
//   - User drags sheet downward
//   - If drag > 120px OR velocity > 200px/s → dismiss
//   - Dismiss: 280ms cubic-bezier(0.4, 0, 1, 1) — accelerating exit
//   - Cancel: 280ms cubic-bezier(0.25, 0.46, 0.45, 0.94) — settle back
//   - Backdrop opacity tracks sheet position
//   - Overdamp when dragging upward (beyond content)
//
// DraggableSurface (related but different):
//   - Velocity threshold: 400px/s
//   - Snap threshold: 0.12 fraction of loweredY
//   - Uses spring (stiffness 340, damping 36, mass 0.95) not timing

import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';
import { Gesture, type GestureType } from 'react-native-gesture-handler';
import { dismissTiming, snapBackTiming, velocity as vel } from './timing';
import { snap as snapSpring } from './springs';

interface UseSheetGestureOptions {
  /** Total sheet height when fully open (px) */
  sheetHeight: number;
  /** Called when the sheet should dismiss */
  onDismiss: () => void;
  /** Use spring physics instead of timing for snap. Default: false (matches web BottomSheet) */
  useSpring?: boolean;
  /** Override dismiss offset threshold (default: 120px) */
  dismissOffset?: number;
  /** Override dismiss velocity threshold (default: 200px/s) */
  dismissVelocity?: number;
}

interface UseSheetGestureReturn {
  /** Sheet translateY shared value */
  translateY: SharedValue<number>;
  /** Backdrop opacity (0–1) derived from sheet position */
  backdropOpacity: SharedValue<number>;
  /** Pan gesture to attach to GestureDetector */
  gesture: GestureType;
  /** Animated style for the sheet container */
  sheetStyle: ReturnType<typeof useAnimatedStyle>;
  /** Animated style for the backdrop */
  backdropStyle: ReturnType<typeof useAnimatedStyle>;
}

export function useSheetGesture(options: UseSheetGestureOptions): UseSheetGestureReturn {
  const {
    sheetHeight,
    onDismiss,
    useSpring: useSpringPhysics = false,
    dismissOffset = vel.sheetDismissOffset,
    dismissVelocity = vel.swipe,
  } = options;

  const translateY = useSharedValue(0);
  const backdropOpacity = useSharedValue(1);

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      'worklet';
      const raw = event.translationY;
      if (raw < 0) {
        // Dragging upward — overdamp (resist going beyond top)
        translateY.value = raw * 0.15;
      } else {
        translateY.value = raw;
      }
      // Backdrop fades as sheet moves down
      backdropOpacity.value = Math.max(0, 1 - translateY.value / sheetHeight);
    })
    .onEnd((event) => {
      'worklet';
      const shouldDismiss =
        event.translationY > dismissOffset ||
        event.velocityY > dismissVelocity;

      if (shouldDismiss) {
        // Dismiss: accelerating exit
        translateY.value = withTiming(sheetHeight, dismissTiming, () => {
          runOnJS(onDismiss)();
        });
        backdropOpacity.value = withTiming(0, dismissTiming);
      } else {
        // Cancel: settle back
        if (useSpringPhysics) {
          translateY.value = withSpring(0, {
            ...snapSpring,
            velocity: event.velocityY,
          });
          backdropOpacity.value = withSpring(1, snapSpring);
        } else {
          translateY.value = withTiming(0, snapBackTiming);
          backdropOpacity.value = withTiming(1, snapBackTiming);
        }
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  return { translateY, backdropOpacity, gesture, sheetStyle, backdropStyle };
}
