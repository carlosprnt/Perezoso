// AddSubscriptionOverlay — shared-element morph from the FloatingNav `+`
// button into a large dark bottom sheet.
//
// Technique
// ─────────
// Three sibling layers stacked via zIndex, driven by a single shared value
// `progress` (0 = closed → 1 = fully open):
//
//   1) Backdrop — full-screen dimmer, opacity interpolated from 0 → 1
//   2) Morph layer — absolutely-positioned dark rounded rect whose
//      left/top/width/height/borderRadius interpolate from the measured
//      trigger rect to the final sheet rect. With `overflow: hidden`
//      it clips the content inside during the expansion, so the user
//      sees a single pill turning into the sheet — the button IS the
//      sheet, not a sheet that slides in on top.
//   3) Content — header, list, footer. Lives INSIDE the morph layer,
//      laid out at final sheet dimensions. Fades in only during the
//      last ~40% of the morph so the content doesn't flash before the
//      shape is large enough to contain it.
//
// Open animation: spring (fast decel, no overshoot) — iOS-y premium feel.
// Close animation: cubic ease-in-out, slightly shorter — snappier exit.
//
// On close the content fades out first (same curve, happens in the
// first half of progress 1→0), then the morph shrinks back to the
// trigger rect, leaving the `+` button visually continuous.

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import { useAddSubscriptionStore } from './useAddSubscriptionStore';
import { useCreateSubscriptionStore } from './useCreateSubscriptionStore';
import { fontFamily, fontSize } from '../../design/typography';
import { zIndex } from '../../design/zIndex';
import { PLATFORMS, logoUrlFromDomain } from '../../lib/constants/platforms';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ─── Services shown in the sheet ───────────────────────────────────
// Curated list — picks the most recognizable platforms first so the
// grid looks populated without scrolling.
const FEATURED_IDS = [
  'netflix',
  'youtube-premium',
  'disney-plus',
  'apple-tv',
  'prime-video',
  'hbo-max',
  'hulu',
  'spotify',
  'apple-music',
  'notion',
  'figma',
  'adobe',
  'canva',
  'dropbox',
  'google-one',
  'icloud',
  'github',
  'chatgpt',
  'claude',
] as const;

const FEATURED = FEATURED_IDS
  .map((id) => PLATFORMS.find((p) => p.id === id))
  .filter((p): p is NonNullable<typeof p> => !!p);

// ─── Animation config ───────────────────────────────────────────────
const OPEN_SPRING = {
  damping: 26,
  stiffness: 280,
  mass: 0.9,
  overshootClamping: true,
  restDisplacementThreshold: 0.001,
  restSpeedThreshold: 0.01,
} as const;

const CLOSE_TIMING = {
  duration: 280,
  easing: Easing.bezier(0.4, 0, 0.6, 1),
} as const;

// ─── Sheet geometry ─────────────────────────────────────────────────
// Radius chosen to harmonize with the iPhone bezel corners (~47–55px
// on modern devices). 48 works across the full lineup and gives the
// "soft premium" feel iOS system sheets have.
const SHEET_SIDE_MARGIN = 8;
const SHEET_RADIUS = 48;

// ─── Swipe-to-dismiss config ────────────────────────────────────────
const DISMISS_DISTANCE = 100;
const DISMISS_VELOCITY = 600;

export function AddSubscriptionOverlay() {
  const insets = useSafeAreaInsets();
  const isOpen = useAddSubscriptionStore((s) => s.isOpen);
  const triggerRect = useAddSubscriptionStore((s) => s.triggerRect);
  const close = useAddSubscriptionStore((s) => s.close);

  const [mounted, setMounted] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const progress = useSharedValue(0);
  // swipeY tracks the user's vertical drag distance during a pull-to-dismiss
  // gesture. It adds to the morph's `top` so the sheet follows the finger.
  // On release it either animates back to 0 (if below threshold) or animates
  // to 0 alongside the close morph-shrink (if dismissed).
  const swipeY = useSharedValue(0);

  // Recompute sheet rect on every render (cheap, values are primitive).
  // Using Dimensions directly matches the window measurement coord space
  // returned by `measureInWindow` on the trigger button.
  const { width: screenW, height: screenH } = Dimensions.get('window');
  const sheetW = screenW - SHEET_SIDE_MARGIN * 2;
  const sheetX = SHEET_SIDE_MARGIN;
  // Small visual breathing room above the screen bottom — the home
  // indicator safe area is handled by the footer's paddingBottom
  // (so the sheet extends visually close to the edge like in the reference).
  const sheetBottomMargin = 8;
  const sheetH = Math.min(screenH * 0.78, 660);
  const sheetY = screenH - sheetBottomMargin - sheetH;

  // Effect 1: sync store open state → mount the overlay.
  // We mount on open; unmounting happens when the close animation finishes
  // (setMounted(false) inside the animation completion callback below).
  useEffect(() => {
    if (isOpen && triggerRect && !mounted) {
      setMounted(true);
    }
  }, [isOpen, triggerRect, mounted]);

  // Effect 2: drive the morph animation off the current (mounted, isOpen) state.
  // Runs every time either changes — handles taps repeated during animation
  // because `withSpring` / `withTiming` interrupt any in-flight animation on
  // the same shared value and start from the current value toward the new target.
  useEffect(() => {
    if (!mounted) return;

    if (isOpen) {
      progress.value = withSpring(1, OPEN_SPRING, (finished) => {
        if (finished) runOnJS(setInteractive)(true);
      });
    } else {
      setInteractive(false);
      progress.value = withTiming(0, CLOSE_TIMING, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
  }, [mounted, isOpen, progress]);

  // ─── Animated styles ──────────────────────────────────────────────
  // triggerRect is guaranteed non-null here because the component returns
  // null when `triggerRect` is falsy. We pre-snapshot the rect values into
  // plain numbers so the worklet's closure captures stable primitives
  // (keeps Reanimated happy on the old architecture).
  const rx = triggerRect?.x ?? 0;
  const ry = triggerRect?.y ?? 0;
  const rw = triggerRect?.width ?? 0;
  const rh = triggerRect?.height ?? 0;
  const rr = triggerRect?.borderRadius ?? 0;

  const morphStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      left: interpolate(p, [0, 1], [rx, sheetX], Extrapolation.CLAMP),
      // Add swipeY so the sheet follows the finger during a pull-to-dismiss.
      // At progress < 1 the morph is shrinking back anyway, but adding
      // swipeY keeps the transition smooth if the user releases past
      // threshold while the morph-shrink is in flight.
      top:
        interpolate(p, [0, 1], [ry, sheetY], Extrapolation.CLAMP) +
        swipeY.value,
      width: interpolate(p, [0, 1], [rw, sheetW], Extrapolation.CLAMP),
      height: interpolate(p, [0, 1], [rh, sheetH], Extrapolation.CLAMP),
      borderRadius: interpolate(
        p,
        [0, 1],
        [rr, SHEET_RADIUS],
        Extrapolation.CLAMP,
      ),
      opacity: 1,
    };
  });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
  }));

  // Content fades in during the last ~40% of the open morph, and fades
  // out during the first ~40% of close — fast enough that the user
  // never sees content outside the shape's bounds.
  const contentStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, [0.6, 0.95], [0, 1], Extrapolation.CLAMP),
      transform: [
        {
          translateY: interpolate(p, [0.6, 1], [16, 0], Extrapolation.CLAMP),
        },
      ],
    };
  });

  const handleBackdropPress = useCallback(() => {
    if (interactive) close();
  }, [interactive, close]);

  // Swipe-to-dismiss (attached to the header area so it doesn't conflict
  // with the ScrollView's own pan gesture). Requires 10px down before
  // activating so taps on the close button still register; fails if the
  // user starts by dragging up so upward flicks feel natural too.
  const panGesture = Gesture.Pan()
    .activeOffsetY(10)
    .failOffsetY(-10)
    .onUpdate((e) => {
      'worklet';
      if (e.translationY > 0) {
        swipeY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      'worklet';
      const shouldClose =
        e.translationY > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY;
      if (shouldClose) {
        runOnJS(close)();
      }
      // In both cases animate swipeY back to 0 — either because we're
      // snapping back, or because the close morph-shrink needs the
      // translation to settle while `top` interpolates to the trigger rect.
      swipeY.value = withTiming(0, { duration: 260 });
    });

  if (!mounted || !triggerRect) return null;

  return (
    <View style={styles.root} pointerEvents="box-none">
      {/* Backdrop — dimmer + tap-to-close */}
      <AnimatedPressable
        style={[styles.backdrop, backdropStyle]}
        onPress={handleBackdropPress}
      />

      {/* Morph layer — black pill that grows into the sheet shape.
          Content lives inside so it's clipped by the morph's rounded
          bounds during the expansion (overflow: hidden). */}
      <Animated.View
        style={[styles.morph, morphStyle]}
        pointerEvents={interactive ? 'auto' : 'none'}
      >
        {/* Fixed-size content slot anchored to the morph's top-left.
            During the early morph (shape still tiny) this is clipped away;
            the contentStyle fade keeps it invisible until the shape
            is large enough to contain it. */}
        <View style={{ width: sheetW, height: sheetH }}>
          <Animated.View style={[styles.content, contentStyle]}>
            {/* ─── Header (also the drag handle for swipe-to-dismiss) ── */}
            <GestureDetector gesture={panGesture}>
              <View style={styles.header}>
                <Text style={styles.title}>Crear nueva suscripción</Text>
                <Pressable
                  style={styles.closeBtn}
                  onPress={close}
                  hitSlop={8}
                  accessibilityLabel="Cerrar"
                >
                  <X size={16} color="#FFFFFF" strokeWidth={2.5} />
                </Pressable>
              </View>
            </GestureDetector>

            {/* ─── Scrollable service list ─────────────────────── */}
            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            >
              {FEATURED.map((p) => (
                <Pressable
                  key={p.id}
                  style={({ pressed }) => [
                    styles.row,
                    pressed && styles.rowPressed,
                  ]}
                  android_ripple={{ color: 'rgba(255,255,255,0.08)' }}
                  onPress={() => {
                    // Step 2: open white form with prefill, then close
                    // the dark picker. Order matters — opening first
                    // guarantees the white sheet is requested to render
                    // even if close() has any side-effect that would
                    // suppress later state updates.
                    console.log('[AddSubscriptionOverlay] row tap →', p.name);
                    useCreateSubscriptionStore.getState().open({
                      name: p.name,
                      logoUrl: logoUrlFromDomain(p.domain),
                    });
                    close();
                  }}
                >
                  <View style={styles.logoBox}>
                    <Image
                      source={{ uri: logoUrlFromDomain(p.domain) }}
                      style={styles.logoImg}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.rowText}>{p.name}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* ─── Footer actions ──────────────────────────────── */}
            <View
              style={[
                styles.footer,
                // The morph already sits 8px above the screen edge (see
                // sheetBottomMargin), so the footer's own bottom padding
                // only needs to breathe a little — no full insets.bottom.
                { paddingBottom: 22 },
              ]}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.footerBtnSecondary,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => {
                  // TODO: Gmail import flow
                }}
              >
                <Text style={styles.footerBtnSecondaryText}>
                  Buscar en Gmail
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.footerBtnPrimary,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() => {
                  console.log('[AddSubscriptionOverlay] manual tap');
                  useCreateSubscriptionStore.getState().open();
                  close();
                }}
              >
                <Text style={styles.footerBtnPrimaryText}>
                  Añadir manualmente
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: zIndex.sheetBackdrop,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  morph: {
    position: 'absolute',
    backgroundColor: '#0F0F10',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    paddingTop: 14,
  },
  // ── Header ──────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  title: {
    ...fontFamily.semibold,
    fontSize: fontSize[20],
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── List ────────────────────────────────────────────────
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 14,
  },
  rowPressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  logoBox: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImg: {
    width: 28,
    height: 28,
  },
  rowText: {
    ...fontFamily.medium,
    fontSize: fontSize[16],
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
  // ── Footer ──────────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  footerBtnSecondary: {
    flex: 1,
    height: 48,
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.10)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  footerBtnSecondaryText: {
    ...fontFamily.semibold,
    fontSize: fontSize[15],
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
  footerBtnPrimary: {
    flex: 1,
    height: 48,
    borderRadius: 9999,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  footerBtnPrimaryText: {
    ...fontFamily.semibold,
    fontSize: fontSize[15],
    color: '#000000',
    letterSpacing: -0.1,
  },
});
