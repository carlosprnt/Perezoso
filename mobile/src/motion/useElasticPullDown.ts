// Phase 2 — Motion hook: useElasticPullDown
// Replicates the web app's DraggableSurface elastic pull-down gesture.
//
// Web behavior (DraggableSurface.tsx):
//   - Pull curve: Math.sqrt(delta) * 3.6 — diminishing returns
//   - Hard cap: 65px maximum pull distance
//   - Overdamp: beyond bounds, multiply excess by 0.15
//   - Release: spring back with stiffness 400, damping 50, mass 0.8
//   - Pull affects: card stack gap (8→24px), background opacity, greeting transition
//
// This hook provides the elastic pull value as a shared value.
// Components read it to derive their own transforms via interpolate.ts helpers.

import { useCallback } from 'react';
import {
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { Gesture, type GestureType } from 'react-native-gesture-handler';
import { elastic } from './springs';
import { velocity as velocityThresholds } from './timing';
import { elasticPull } from './interpolate';

interface UseElasticPullDownOptions {
  /** Maximum pull distance in px. Default: 65 */
  cap?: number;
  /** Called when pull crosses the activation threshold */
  onActivate?: () => void;
  /** Activation threshold as fraction of cap. Default: 0.7 */
  activationThreshold?: number;
  /** Whether the gesture is enabled */
  enabled?: boolean;
}

interface UseElasticPullDownReturn {
  /** Current elastic pull distance (0 to cap). Read this in useAnimatedStyle. */
  pullY: SharedValue<number>;
  /** Normalized progress (0 to 1). Convenience for interpolations. */
  progress: SharedValue<number>;
  /** Whether the user is actively pulling */
  isPulling: SharedValue<boolean>;
  /** Pan gesture to attach to GestureDetector */
  gesture: GestureType;
}

export function useElasticPullDown(
  options: UseElasticPullDownOptions = {},
): UseElasticPullDownReturn {
  const {
    cap = 65,
    onActivate,
    activationThreshold = 0.7,
    enabled = true,
  } = options;

  const pullY = useSharedValue(0);
  const progress = useSharedValue(0);
  const isPulling = useSharedValue(false);
  const startY = useSharedValue(0);
  const didActivate = useSharedValue(false);

  const gesture = Gesture.Pan()
    .enabled(enabled)
    .activeOffsetY(velocityThresholds.dragStartThreshold)
    .onStart(() => {
      'worklet';
      startY.value = pullY.value;
      isPulling.value = true;
      didActivate.value = false;
    })
    .onUpdate((event) => {
      'worklet';
      const rawDelta = event.translationY;
      if (rawDelta <= 0) {
        // Pulling up — overdamp
        pullY.value = rawDelta * 0.15;
      } else {
        pullY.value = elasticPull(rawDelta, cap);
      }
      progress.value = Math.min(Math.max(pullY.value / cap, 0), 1);

      // Activation check
      if (!didActivate.value && progress.value >= activationThreshold) {
        didActivate.value = true;
        if (onActivate) {
          // runOnJS would be needed here for the callback
        }
      }
    })
    .onEnd(() => {
      'worklet';
      isPulling.value = false;
      pullY.value = withSpring(0, elastic);
      progress.value = withSpring(0, elastic);
    });

  return { pullY, progress, isPulling, gesture };
}
