// useDashboardReveal — the gesture + state machine behind the
// "pull dashboard down to reveal a layer behind" interaction.
//
// Direct port of the web app's DraggableSurface.tsx mechanics
// (components/ui/DraggableSurface.tsx). Numbers, spring, damping
// and gating logic all mirror it 1:1 for fidelity.
//
// The dashboard is a foreground sheet that slides DOWN over a dark
// backdrop. When "lowered" (open) the sheet leaves a 120px peek strip
// at the bottom so the user can grab it back up. When "raised" (closed)
// the sheet covers the whole screen.
//
// Shared values exposed
//   - translateY  0 .. REVEAL_HEIGHT
//   - progress    0 .. 1  (= translateY / REVEAL_HEIGHT)
//   - scrollY     current scroll offset of the inner ScrollView
//
// Gesture / scroll coordination
//   The pan is composed simultaneously with a Native gesture so the
//   ScrollView keeps scrolling. A `manualActivation(true)` pan is
//   NOT used — instead we gate in onUpdate:
//     - raised + gesture started with scrollTop == 0 + dy > 0 → drag surface
//     - raised + scrolled into content → native scroll owns the gesture
//     - lowered → any drag moves the surface
//   This mirrors the web touch-handler's `mode = 'drag' | 'scroll'` state.

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

// ─── Tunables — match DraggableSurface.tsx ──────────────────────────
const PEEK_HEIGHT = 120;            // px of foreground visible when lowered
const SNAP_THRESHOLD = 0.12;        // fraction of loweredY to trigger snap
const VEL_THRESHOLD = 400;          // px/s flick velocity
// Pan activation threshold. Set higher than the web's 6px because on
// native, a tap naturally produces a few px of finger drift at release —
// at 6px the Pan would activate on taps and the velocity-based snap in
// onEnd would pop the sheet open. 14px is comfortably past tap jitter
// without making an intentional drag feel sluggish.
const DRAG_START_THRESHOLD = 14;
const OVER_DAMP = 0.15;             // rubber-band resistance beyond bounds

const SNAP_SPRING = {
  damping: 36,
  stiffness: 340,
  mass: 0.95,
  overshootClamping: false,
  restDisplacementThreshold: 0.5,
  restSpeedThreshold: 0.5,
} as const;

const screenH = Dimensions.get('window').height;
// Lowered Y target — how far the sheet slides down when open.
export const REVEAL_HEIGHT = Math.max(0, screenH - PEEK_HEIGHT);

export interface DashboardReveal {
  translateY: SharedValue<number>;
  progress: SharedValue<number>;
  scrollY: SharedValue<number>;
  gesture: ComposedGesture;
  scrollHandler: ReturnType<typeof useAnimatedScrollHandler>;
  isOpenJS: boolean;
  close: () => void;
  revealHeight: number;
  peekHeight: number;
}

export function useDashboardReveal(): DashboardReveal {
  const translateY = useSharedValue(0);
  const scrollY = useSharedValue(0);
  // Captured at gesture start so onUpdate can decide whether the user
  // started "from the top" (the only condition that lets a closed sheet
  // begin to reveal while scroll is the dominant gesture).
  const startScrollY = useSharedValue(0);
  const startTranslateY = useSharedValue(0);
  // Snapped state — matches raisedRef in the web app.
  const isOpenSV = useSharedValue(false);
  const [isOpenJS, setIsOpenJS] = useState(false);

  const progress = useDerivedValue(() => {
    if (REVEAL_HEIGHT <= 0) return 0;
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

  // Native gesture representing the ScrollView's own pan. Composing
  // simultaneously lets native scroll keep working; our pan only
  // commits a translateY when the gating conditions match.
  const nativeScroll = Gesture.Native();

  const pan = Gesture.Pan()
    // Only activate on downward drag past DRAG_START_THRESHOLD. Upward
    // drags never activate this pan (scroll handles them). This mirrors
    // the web's `mode = 'scroll'` branch for upward/scrolled gestures.
    .activeOffsetY([-9999, DRAG_START_THRESHOLD])
    .onBegin(() => {
      'worklet';
      startScrollY.value = scrollY.value;
      startTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      'worklet';
      const dy = e.translationY;

      if (isOpenSV.value) {
        // Lowered → any drag moves the surface. Position is base + dy,
        // rubber-banded past the bounds.
        const raw = startTranslateY.value + dy;
        let clamped = raw;
        if (raw < 0) clamped = raw * OVER_DAMP;
        else if (raw > REVEAL_HEIGHT)
          clamped = REVEAL_HEIGHT + (raw - REVEAL_HEIGHT) * OVER_DAMP;
        translateY.value = clamped;
      } else {
        // Raised → only move the sheet if the user started at scroll
        // top AND is dragging down. Otherwise leave translateY alone —
        // native scroll is the active gesture.
        if (startScrollY.value <= 0 && dy > 0) {
          let clamped = dy;
          if (dy > REVEAL_HEIGHT)
            clamped = REVEAL_HEIGHT + (dy - REVEAL_HEIGHT) * OVER_DAMP;
          translateY.value = clamped;
        }
      }
    })
    .onEnd((e) => {
      'worklet';
      const v = e.velocityY;
      const cur = translateY.value;

      // Decide target (0 or REVEAL_HEIGHT) mirroring the web logic.
      let target: number;
      if (isOpenSV.value) {
        // Was lowered; if still lowered and not flicked up, stay lowered.
        // If dragged/flicked up past thresholds, go back to 0.
        if (Math.abs(v) > VEL_THRESHOLD) {
          target = v > 0 ? REVEAL_HEIGHT : 0;
        } else {
          target = cur < REVEAL_HEIGHT - REVEAL_HEIGHT * SNAP_THRESHOLD
            ? 0
            : REVEAL_HEIGHT;
        }
      } else {
        // Closed → open logic. Two guards against false positives:
        //
        //  1. `cur <= 0` — the surface never actually moved (gate in
        //     onUpdate refused, e.g. user wasn't at scroll-top, or dragging
        //     up). A fast scroll flick would hit this path with high v but
        //     cur still 0.
        //
        //  2. cur moved but stayed under half the snap threshold — the
        //     Pan activated from tap jitter (~14 px) but the user didn't
        //     actually pull the sheet. Velocity at finger release is
        //     easily > 400 px/s for a normal tap, so we CANNOT let
        //     velocity alone open the sheet from such a small offset.
        //
        // Only once the drag crossed ~6% of the reveal distance (half the
        // snap threshold) does velocity get to commit the snap early.
        const minOpenDistance = REVEAL_HEIGHT * SNAP_THRESHOLD * 0.5;
        if (cur <= 0) {
          target = 0;
        } else if (cur > REVEAL_HEIGHT * SNAP_THRESHOLD) {
          target = REVEAL_HEIGHT;
        } else if (cur > minOpenDistance && v > VEL_THRESHOLD) {
          target = REVEAL_HEIGHT;
        } else {
          target = 0;
        }
      }

      const willBeOpen = target === REVEAL_HEIGHT;
      if (willBeOpen !== isOpenSV.value) {
        isOpenSV.value = willBeOpen;
        runOnJS(setOpenState)(willBeOpen);
      }
      translateY.value = withSpring(target, SNAP_SPRING);
    });

  const gesture = Gesture.Simultaneous(pan, nativeScroll);

  const close = useCallback(() => {
    isOpenSV.value = false;
    setIsOpenJS(false);
    translateY.value = withSpring(0, SNAP_SPRING);
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
    peekHeight: PEEK_HEIGHT,
  };
}
