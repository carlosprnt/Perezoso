// useDashboardReveal — the gesture + state machine behind the
// "pull dashboard down to reveal a layer behind" interaction.
//
// Mechanics ported from web DraggableSurface.tsx. The dashboard is a
// foreground sheet that slides DOWN over a dark backdrop. When "lowered"
// (open) the sheet leaves a 120px peek strip at the bottom so the user
// can grab it back up. When "raised" (closed) the sheet covers the whole
// screen.
//
// Why manual activation
// ─────────────────────
// Previous iterations relied on Pan's built-in `activeOffsetY` threshold.
// On native that threshold is measured in gesture-level translation space
// and — crucially — the Pan STILL activates on taps that happen to drift
// a few pixels, at which point onEnd fires with the finger's release
// velocity. A "tap" with ~20 px of drift and ~500 px/s release velocity
// looks identical to an intentional flick to the snap logic, so the
// sheet opens/closes from taps on Pressables inside the surface.
//
// The fix: `manualActivation(true)`. We track the finger's absolute Y
// from touchesDown and only activate the Pan when:
//   • the user has moved vertically by PULL_ACTIVATION_PX (not a tap), AND
//   • the direction matches what the current state allows:
//       - closed: must be downward + scrolled to top
//       - open:   any vertical direction
//
// Below that threshold the Pan stays in BEGAN and never commits
// translateY or fires onEnd — Pressables inside the surface get their
// taps through untouched.
//
// Shared values exposed
//   - translateY  0 .. REVEAL_HEIGHT
//   - progress    0 .. 1  (= translateY / REVEAL_HEIGHT)
//   - scrollY     current scroll offset of the inner ScrollView

import { useCallback, useEffect, useState } from 'react';
import { Dimensions } from 'react-native';
import {
  useSharedValue,
  useAnimatedScrollHandler,
  useDerivedValue,
  withSpring,
  withTiming,
  Easing,
  runOnJS,
  makeMutable,
  type SharedValue,
} from 'react-native-reanimated';
import { Gesture, type ComposedGesture } from 'react-native-gesture-handler';
import { haptic } from '../../lib/haptics';

// ─── Tunables ───────────────────────────────────────────────────────
const PEEK_HEIGHT = 120;            // px of foreground visible when lowered
const SNAP_THRESHOLD = 0.12;        // fraction of loweredY to trigger snap
const VEL_THRESHOLD = 400;          // px/s flick velocity
// Finger MUST move this many px from touch-down before the Pan activates.
// Set high enough that natural tap drift (press+lift motion) never crosses
// it. iOS's own tap slop is ~10pt; we go well past that so Pressables
// inside the surface work reliably.
const PULL_ACTIVATION_PX = 24;
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

// ─── Module-level singletons ────────────────────────────────────────
// Exposed so components that live OUTSIDE DashboardScreen (the tabs-level
// FloatingNav, the SharedProfileHeader that overlays the whole app shell)
// can read the reveal progress without prop-drilling a SharedValue
// through the router / _layout boundary. Only useDashboardReveal writes
// these; everyone else reads `.value` in worklets.
export const revealProgress = makeMutable(0);
export const revealIsOpen = makeMutable(false);

// Scroll-driven nav-bar compaction. Both DashboardScreen and
// SubscriptionsScreen write these from their own scroll handlers so the
// FloatingNav stays in sync regardless of which tab is visible.
//
// Behaviour: once scrollY exceeds COMPACT_SCROLL_THRESHOLD the pill starts
// compacting IMMEDIATELY, animated over 500 ms with a soft iOS curve.
// Scrolling back reverses over 500 ms with a mirrored curve. The two
// shared values implement a tiny state machine that prevents
// re-triggering the animation on every scroll tick while one is running.
export const navCompactProgress = makeMutable(0); // 0=expanded … 1=compact (animated)
export const navCompactState = makeMutable(0);    // 0=expanded, 1=compacting/compact
export const COMPACT_SCROLL_THRESHOLD = 60;       // px of scroll before trigger
export const NAV_COMPACT_DURATION = 500;          // ms of compact/expand animation

export interface DashboardReveal {
  translateY: SharedValue<number>;
  progress: SharedValue<number>;
  scrollY: SharedValue<number>;
  gesture: ComposedGesture;
  scrollHandler: ReturnType<typeof useAnimatedScrollHandler>;
  isOpenJS: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
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
  // Absolute Y of the finger at touch-down — used by manualActivation
  // to measure finger displacement independently of the gesture's own
  // translation state (which only exists after activation).
  const startFingerY = useSharedValue(0);
  // Snapped state — matches raisedRef in the web app.
  const isOpenSV = useSharedValue(false);
  const [isOpenJS, setIsOpenJS] = useState(false);

  const progress = useDerivedValue(() => {
    if (REVEAL_HEIGHT <= 0) return 0;
    const t = translateY.value;
    const p = t <= 0 ? 0 : t >= REVEAL_HEIGHT ? 1 : t / REVEAL_HEIGHT;
    // Mirror into the module singleton so siblings outside DashboardScreen
    // (FloatingNav, SharedProfileHeader) can read it without context.
    revealProgress.value = p;
    return p;
  });

  // Reset the module singletons when the hook mounts, in case a previous
  // DashboardScreen lifecycle left them at 1 (e.g. navigation away while
  // open). They're module-scoped so they persist across unmounts.
  useEffect(() => {
    revealProgress.value = 0;
    revealIsOpen.value = false;
    navCompactProgress.value = 0;
    navCompactState.value = 0;
    return () => {
      revealProgress.value = 0;
      revealIsOpen.value = false;
      navCompactProgress.value = 0;
      navCompactState.value = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setOpenState = useCallback((open: boolean) => {
    setIsOpenJS(open);
  }, []);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const y = event.contentOffset.y;
      scrollY.value = y;
      // State machine: as soon as scrollY crosses COMPACT_SCROLL_THRESHOLD
      // the pill starts compacting over 500 ms (no delay). Crossing back
      // reverses over 500 ms with a mirrored curve. Assigning a new
      // animation to a shared value replaces any in-flight one, so fast
      // back-and-forth scrolling just seamlessly retargets.
      if (y > COMPACT_SCROLL_THRESHOLD) {
        if (navCompactState.value === 0) {
          navCompactState.value = 1;
          navCompactProgress.value = withTiming(1, {
            duration: NAV_COMPACT_DURATION,
            easing: Easing.out(Easing.cubic),
          });
        }
      } else {
        if (navCompactState.value === 1) {
          navCompactState.value = 0;
          navCompactProgress.value = withTiming(0, {
            duration: NAV_COMPACT_DURATION,
            easing: Easing.in(Easing.cubic),
          });
        }
      }
    },
  });

  // Native gesture representing the ScrollView's own pan. Composing
  // simultaneously lets native scroll keep working; our pan only
  // commits a translateY when the gating conditions match.
  const nativeScroll = Gesture.Native();

  const pan = Gesture.Pan()
    // We control activation explicitly via onTouchesMove so that taps
    // never trigger the reveal (see the header comment).
    .manualActivation(true)
    .onTouchesDown((e) => {
      'worklet';
      const touch = e.allTouches[0];
      if (!touch) return;
      startFingerY.value = touch.absoluteY;
      startScrollY.value = scrollY.value;
      startTranslateY.value = translateY.value;
    })
    .onTouchesMove((e, state) => {
      'worklet';
      const touch = e.allTouches[0];
      if (!touch) return;
      const dy = touch.absoluteY - startFingerY.value;

      if (isOpenSV.value) {
        // Open: activate on any vertical drag past the threshold. User
        // may want to close (drag up) or just jostle (drag down a bit).
        if (Math.abs(dy) >= PULL_ACTIVATION_PX) {
          state.activate();
        }
      } else {
        // Closed: ONLY activate for a deliberate downward pull from
        // scroll-top. Anything else (upward drag, scrolled content,
        // sub-threshold motion) lets the native scroll keep ownership.
        if (startScrollY.value <= 0 && dy >= PULL_ACTIVATION_PX) {
          state.activate();
        }
      }
    })
    .onUpdate((e) => {
      'worklet';
      const dy = e.translationY;

      if (isOpenSV.value) {
        // Open → user is closing (or jostling). Position is base + dy,
        // rubber-banded past both bounds.
        const raw = startTranslateY.value + dy;
        let clamped = raw;
        if (raw < 0) clamped = raw * OVER_DAMP;
        else if (raw > REVEAL_HEIGHT)
          clamped = REVEAL_HEIGHT + (raw - REVEAL_HEIGHT) * OVER_DAMP;
        translateY.value = clamped;
      } else {
        // Closed → we only reach here after manualActivation approved
        // the gesture (downward from scroll-top). Track dy directly.
        let clamped = dy;
        if (dy > REVEAL_HEIGHT)
          clamped = REVEAL_HEIGHT + (dy - REVEAL_HEIGHT) * OVER_DAMP;
        else if (dy < 0) clamped = 0;
        translateY.value = clamped;
      }
    })
    .onEnd((e) => {
      'worklet';
      const v = e.velocityY;
      const cur = translateY.value;

      let target: number;
      if (isOpenSV.value) {
        // Open → close: velocity OR position commits the close.
        if (Math.abs(v) > VEL_THRESHOLD) {
          target = v > 0 ? REVEAL_HEIGHT : 0;
        } else {
          target = cur < REVEAL_HEIGHT - REVEAL_HEIGHT * SNAP_THRESHOLD
            ? 0
            : REVEAL_HEIGHT;
        }
      } else {
        // Closed → open: velocity OR position commits the open.
        if (Math.abs(v) > VEL_THRESHOLD) {
          target = v > 0 ? REVEAL_HEIGHT : 0;
        } else {
          target = cur > REVEAL_HEIGHT * SNAP_THRESHOLD ? REVEAL_HEIGHT : 0;
        }
      }

      const willBeOpen = target === REVEAL_HEIGHT;
      if (willBeOpen !== isOpenSV.value) {
        isOpenSV.value = willBeOpen;
        revealIsOpen.value = willBeOpen;
        runOnJS(setOpenState)(willBeOpen);
        runOnJS(haptic.medium)();
      }
      translateY.value = withSpring(target, SNAP_SPRING);
    });

  const gesture = Gesture.Simultaneous(pan, nativeScroll);

  const open = useCallback(() => {
    isOpenSV.value = true;
    revealIsOpen.value = true;
    setIsOpenJS(true);
    translateY.value = withSpring(REVEAL_HEIGHT, SNAP_SPRING);
  }, [isOpenSV, translateY]);

  const close = useCallback(() => {
    isOpenSV.value = false;
    revealIsOpen.value = false;
    setIsOpenJS(false);
    translateY.value = withSpring(0, SNAP_SPRING);
  }, [isOpenSV, translateY]);

  const toggle = useCallback(() => {
    haptic.medium();
    if (isOpenSV.value) close();
    else open();
  }, [open, close, isOpenSV]);

  return {
    translateY,
    progress,
    scrollY,
    gesture,
    scrollHandler,
    isOpenJS,
    open,
    close,
    toggle,
    revealHeight: REVEAL_HEIGHT,
    peekHeight: PEEK_HEIGHT,
  };
}
