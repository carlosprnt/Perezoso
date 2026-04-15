// useDashboardReveal — the gesture + state machine behind the
// "pull dashboard down to reveal a layer behind" interaction.
//
// Shape of the system
// ───────────────────
// We treat the dashboard as a single physical sheet that slides down
// over a fixed underlying profile layer. A SharedValue `translateY`
// controls the sheet's vertical offset:
//    0          → closed   (covers everything)
//    REVEAL_HEIGHT → open  (underlying layer fully visible)
//
// Two animated values feed every consumer:
//   - `translateY` — raw offset for the sheet's transform
//   - `progress`   — derived 0→1 (translateY / REVEAL_HEIGHT). UI uses
//     this for synchronized fades / scales / parallax.
//
// Gesture / scroll coordination — this is the hard part
// ─────────────────────────────────────────────────────
// The dashboard body is a ScrollView. We only want the reveal to take
// over vertical input when the user is at the very top AND drags down.
// Otherwise the ScrollView's native pan owns the input.
//
// Strategy:
//   1. Track scrollY via `useAnimatedScrollHandler`.
//   2. Use a `Gesture.Pan()` composed `simultaneousWith` a
//      `Gesture.Native()` that wraps the ScrollView. Both can be
//      active at the same time without one cancelling the other.
//   3. Inside `onUpdate`, gate the action by the current state:
//        - If closed: only translate when scrollY (at gesture start)
//          was <= 0 AND the user is dragging down. Otherwise let
//          scroll consume.
//        - If open: translate freely on drag — the user is closing it.
//          Dragging up moves toward 0; dragging down does nothing.
//   4. `activeOffsetY([-15, 15])` makes the pan require a real gesture
//      before activating (taps, tiny twitches don't move the sheet).
//
// Snap behavior
// ─────────────
//   - On release, decide target by combining position + velocity:
//     position past SNAP_THRESHOLD OR velocity past VELOCITY_THRESHOLD
//     in the appropriate direction snaps to that side.
//   - Spring to the target — same spring on open and close so the
//     interaction feels symmetrical.
//
// Scroll lock when open
// ─────────────────────
// We expose `isOpenJS` so the consumer can disable the ScrollView's
// own scrolling while open — at that point the only valid input on
// the dashboard surface is "drag back up to close".

import { useCallback, useState } from 'react';
import { Dimensions } from 'react-native';
import {
  useSharedValue,
  useAnimatedScrollHandler,
  useDerivedValue,
  withSpring,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';
import { Gesture, type ComposedGesture } from 'react-native-gesture-handler';

// ─── Tunables ────────────────────────────────────────────────────────
// REVEAL_HEIGHT is the distance the dashboard slides down. Capped at
// 78% of the screen height so a sliver of the dashboard always peeks
// at the bottom — that sliver is what the user grabs to close.
const screenH = Dimensions.get('window').height;
export const REVEAL_HEIGHT = Math.min(screenH * 0.78, 620);

// Drag must cross this many pixels before snapping (when velocity is low).
const SNAP_THRESHOLD = REVEAL_HEIGHT * 0.28;
// Velocity in px/s above which we always snap in the direction of motion.
const VELOCITY_THRESHOLD = 700;
// Pan won't activate until the user moves at least this much vertically.
// Keeps taps + small jitters from triggering the reveal.
const PAN_ACTIVATION = 12;
// Spring config — symmetric for open & close, fast iOS-y settle.
const SPRING = {
  damping: 30,
  stiffness: 260,
  mass: 0.9,
  overshootClamping: false,
  restDisplacementThreshold: 0.001,
  restSpeedThreshold: 0.01,
} as const;
// When open and the user keeps dragging down, we let the sheet rubber-band
// a tiny bit beyond REVEAL_HEIGHT so it doesn't feel hard-stopped.
const OVERDRAG = 30;
// When closed and the user pulls down past REVEAL_HEIGHT we apply
// diminishing returns so the sheet doesn't fly off.
function rubberBand(value: number, max: number): number {
  'worklet';
  if (value <= max) return value;
  const excess = value - max;
  return max + excess * 0.18;
}

export interface DashboardReveal {
  /** translateY of the dashboard surface (0 = closed). Bind to transform. */
  translateY: SharedValue<number>;
  /** 0..1 progress, useful for synchronized fades / scales. */
  progress: SharedValue<number>;
  /** Current scroll offset of the dashboard (driven by `scrollHandler`). */
  scrollY: SharedValue<number>;
  /** Composed gesture: attach to GestureDetector around the ScrollView. */
  gesture: ComposedGesture;
  /** Animated scroll handler — pass to the ScrollView's onScroll prop. */
  scrollHandler: ReturnType<typeof useAnimatedScrollHandler>;
  /** True once snapped to open (JS state — use to disable scroll, etc.). */
  isOpenJS: boolean;
  /** Force-close from JS (e.g. after a button press inside the layer). */
  close: () => void;
  /** Total distance the sheet slides down. */
  revealHeight: number;
}

export function useDashboardReveal(): DashboardReveal {
  const translateY = useSharedValue(0);
  const scrollY = useSharedValue(0);
  // Captured on gesture start so onUpdate can decide whether the user
  // started "from the top" (which is the only condition that lets a
  // closed sheet begin to reveal).
  const startScrollY = useSharedValue(0);
  const startTranslateY = useSharedValue(0);
  // Tracks the snapped state — separate from translateY because the
  // value itself is mid-animation often. SharedValue<boolean>.
  const isOpenSV = useSharedValue(false);
  const [isOpenJS, setIsOpenJS] = useState(false);

  const progress = useDerivedValue(() => {
    const t = translateY.value;
    if (t <= 0) return 0;
    if (t >= REVEAL_HEIGHT) return 1;
    return t / REVEAL_HEIGHT;
  });

  const setOpenState = useCallback((open: boolean) => {
    setIsOpenJS(open);
  }, []);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Native gesture that represents the ScrollView's own pan. Composing
  // simultaneously lets the ScrollView keep scrolling normally; our pan
  // only takes meaningful action when the gating conditions are met.
  const nativeScroll = Gesture.Native();

  const pan = Gesture.Pan()
    .activeOffsetY([-PAN_ACTIVATION, PAN_ACTIVATION])
    .onBegin(() => {
      'worklet';
      startScrollY.value = scrollY.value;
      startTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      'worklet';
      const dy = e.translationY;

      if (isOpenSV.value) {
        // Open → user can only close by dragging up.
        // Dragging down rubber-bands a tiny amount.
        const next = startTranslateY.value + dy;
        if (next >= REVEAL_HEIGHT) {
          translateY.value = Math.min(
            REVEAL_HEIGHT + OVERDRAG,
            REVEAL_HEIGHT + (next - REVEAL_HEIGHT) * 0.2,
          );
        } else {
          translateY.value = Math.max(0, next);
        }
      } else {
        // Closed → only respond if (1) gesture started at scroll top
        // AND (2) the user is dragging downward. Otherwise the
        // ScrollView's pan owns the gesture and we leave translateY at 0.
        if (startScrollY.value <= 0 && dy > 0) {
          translateY.value = rubberBand(dy, REVEAL_HEIGHT);
        }
      }
    })
    .onEnd((e) => {
      'worklet';
      const v = e.velocityY;
      const t = translateY.value;

      let toOpen: boolean;
      if (isOpenSV.value) {
        // Close if dragged up past threshold OR flicked up.
        const draggedUp = REVEAL_HEIGHT - t;
        if (draggedUp > SNAP_THRESHOLD || v < -VELOCITY_THRESHOLD) {
          toOpen = false;
        } else {
          toOpen = true;
        }
      } else {
        // Open if dragged down past threshold OR flicked down.
        if (t > SNAP_THRESHOLD || v > VELOCITY_THRESHOLD) {
          toOpen = true;
        } else {
          toOpen = false;
        }
      }

      // Only reflect to JS state if it actually changed — avoids
      // useless re-renders on every minor wobble.
      if (toOpen !== isOpenSV.value) {
        isOpenSV.value = toOpen;
        runOnJS(setOpenState)(toOpen);
      }
      translateY.value = withSpring(toOpen ? REVEAL_HEIGHT : 0, SPRING);
    });

  const gesture = Gesture.Simultaneous(pan, nativeScroll);

  const close = useCallback(() => {
    isOpenSV.value = false;
    setIsOpenJS(false);
    translateY.value = withSpring(0, SPRING);
  }, [isOpenSV, translateY]);

  return {
    translateY,
    progress,
    scrollY,
    gesture,
    scrollHandler,
    isOpenJS,
    close,
    revealHeight: REVEAL_HEIGHT,
  };
}
