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
  Dimensions,
  Image,
  Linking,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
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
  ScrollView,
} from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Mail, Store } from 'lucide-react-native';

import { useAddSubscriptionStore } from './useAddSubscriptionStore';
import { useCreateSubscriptionStore } from './useCreateSubscriptionStore';
import { fontFamily, fontSize } from '../../design/typography';
import { useT } from '../../lib/i18n/LocaleProvider';
import { radius } from '../../design/radius';
import { zIndex } from '../../design/zIndex';
import { PLATFORMS, logoUrlFromDomain } from '../../lib/constants/platforms';
import { haptic } from '../../lib/haptics';

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
// Thresholds chosen to match the iOS system pageSheet feel: a moderate
// drag (≈80px) or a clear flick (≈400px/s) commits the dismiss.
const DISMISS_DISTANCE = 80;
const DISMISS_VELOCITY = 400;

const APP_STORE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';

export function AddSubscriptionOverlay() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const isOpen = useAddSubscriptionStore((s) => s.isOpen);
  const triggerRect = useAddSubscriptionStore((s) => s.triggerRect);
  const close = useAddSubscriptionStore((s) => s.close);

  const [mounted, setMounted] = useState(false);
  const [showFindSubs, setShowFindSubs] = useState(false);
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
      setShowFindSubs(false);
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

  // Track ScrollView offset so pull-to-dismiss only activates at top.
  const scrollOffset = useSharedValue(0);
  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffset.value = e.nativeEvent.contentOffset.y;
  }, [scrollOffset]);

  // Swipe-to-dismiss: works from anywhere in the sheet. Only activates
  // when the ScrollView is at the top (offset ≤ 2) AND dragging down.
  // This mimics iOS native modal dismiss behavior.
  const panGesture = Gesture.Pan()
    .activeOffsetY(10)
    .failOffsetY(-10)
    .onUpdate((e) => {
      'worklet';
      if (scrollOffset.value > 2) return;
      if (e.translationY > 0) {
        swipeY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      'worklet';
      if (scrollOffset.value > 2) {
        swipeY.value = withTiming(0, { duration: 260 });
        return;
      }
      const shouldClose =
        e.translationY > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY;
      if (shouldClose) {
        runOnJS(haptic.light)();
        runOnJS(close)();
      }
      swipeY.value = withTiming(0, { duration: 260 });
    });

  const nativeScrollGesture = Gesture.Native();

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
            <GestureDetector gesture={panGesture.simultaneousWithExternalGesture(nativeScrollGesture)}>
            <View style={{ flex: 1 }}>
            {/* ─── Drag handle — iOS affordance for swipe-to-dismiss ─ */}
              <View style={styles.handleWrap}>
                <View style={styles.handle} />
              </View>
            {/* ─── Header ── */}
              <View style={styles.header}>
                <Text style={styles.title}>{t('create.title')}</Text>
                <Pressable
                  style={styles.closeBtn}
                  onPress={close}
                  hitSlop={8}
                  accessibilityLabel={t('common.close')}
                >
                  <X size={16} color="#FFFFFF" strokeWidth={2.5} />
                </Pressable>
              </View>

            {/* ─── Scrollable service list ─────────────────────── */}
            <GestureDetector gesture={nativeScrollGesture}>
            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              bounces={false}
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
            </GestureDetector>

            {/* ─── Footer actions ──────────────────────────────── */}
            {showFindSubs ? (
              <View style={[styles.findSubsPanel, { paddingBottom: 22 }]}>
                <View style={styles.findSubsHeader}>
                  <Pressable onPress={() => setShowFindSubs(false)} hitSlop={8}>
                    <Text style={styles.findSubsBack}>←</Text>
                  </Pressable>
                  <Text style={styles.findSubsTitle}>{t('findSubs.title')}</Text>
                  <View style={{ width: 24 }} />
                </View>

                {/* Gmail — disabled */}
                <Pressable style={[styles.findSubsRow, styles.findSubsRowDisabled]} disabled>
                  <View style={styles.findSubsIconWrap}>
                    <Mail size={18} color="rgba(255,255,255,0.3)" strokeWidth={2} />
                  </View>
                  <View style={styles.findSubsTextCol}>
                    <View style={styles.findSubsLabelRow}>
                      <Text style={[styles.findSubsRowTitle, { color: 'rgba(255,255,255,0.3)' }]}>
                        {t('findSubs.gmail')}
                      </Text>
                      <View style={styles.findSubsBadge}>
                        <Text style={styles.findSubsBadgeText}>{t('findSubs.gmailSoon')}</Text>
                      </View>
                    </View>
                    <Text style={[styles.findSubsRowDesc, { color: 'rgba(255,255,255,0.2)' }]}>
                      {t('findSubs.gmailDesc')}
                    </Text>
                  </View>
                </Pressable>

                {/* App Store — active */}
                <Pressable
                  style={({ pressed }) => [
                    styles.findSubsRow,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => {
                    Linking.openURL(APP_STORE_SUBSCRIPTIONS_URL).catch(() => {});
                  }}
                >
                  <View style={styles.findSubsIconWrap}>
                    <Store size={18} color="#FFFFFF" strokeWidth={2} />
                  </View>
                  <View style={styles.findSubsTextCol}>
                    <Text style={styles.findSubsRowTitle}>{t('findSubs.appStore')}</Text>
                    <Text style={styles.findSubsRowDesc}>{t('findSubs.appStoreDesc')}</Text>
                  </View>
                </Pressable>
              </View>
            ) : (
              <View
                style={[
                  styles.footer,
                  { paddingBottom: 22 },
                ]}
              >
                <Pressable
                  style={({ pressed }) => [
                    styles.footerBtnSecondary,
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={() => setShowFindSubs(true)}
                >
                  <Text style={styles.footerBtnSecondaryText}>
                    {t('findSubs.search')}
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.footerBtnPrimary,
                    pressed && { opacity: 0.85 },
                  ]}
                  onPress={() => {
                    useCreateSubscriptionStore.getState().open();
                    close();
                  }}
                >
                  <Text style={styles.footerBtnPrimaryText}>
                    {t('create.addManually')}
                  </Text>
                </Pressable>
              </View>
            )}
            </View>
            </GestureDetector>
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
    paddingTop: 6,
  },
  // ── Drag handle (iOS affordance) ────────────────────────
  handleWrap: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 6,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  // ── Header ──────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
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
    borderRadius: radius.full,
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
    borderRadius: radius.full,
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
  // ── Find subscriptions panel ───────────────────────────
  findSubsPanel: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
  },
  findSubsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  findSubsBack: {
    ...fontFamily.medium,
    fontSize: fontSize[20],
    color: '#FFFFFF',
  },
  findSubsTitle: {
    ...fontFamily.semibold,
    fontSize: fontSize[16],
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  findSubsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  findSubsRowDisabled: {
    opacity: 0.45,
  },
  findSubsIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  findSubsTextCol: {
    flex: 1,
  },
  findSubsLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  findSubsRowTitle: {
    ...fontFamily.semibold,
    fontSize: fontSize[14],
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
  findSubsRowDesc: {
    ...fontFamily.regular,
    fontSize: fontSize[13],
    color: 'rgba(255,255,255,0.45)',
    marginTop: 2,
  },
  findSubsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  findSubsBadgeText: {
    ...fontFamily.medium,
    fontSize: fontSize[11],
    color: 'rgba(255,255,255,0.35)',
  },
});
