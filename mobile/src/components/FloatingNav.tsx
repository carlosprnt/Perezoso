// Phase 6 — FloatingNav
// Replicates the web app's floating bottom navigation pill:
//   Dashboard (left) | Plus (center, filled circle) | Subscriptions (right)
//   Sliding stroke indicator on active tab
//   Active icons use fill, inactive icons use stroke + subtle border
//
// Plus button: filled circle (black light / #F2F2F7 dark)
// Container: white glass ~85% opacity
// Card icon: custom SVG (not lucide CreditCard) with visible stripe when filled
//
// Scroll-driven compaction
// ─────────────────────────
// As the user scrolls the dashboard / subscriptions list, the pill
// narrows: each elongated 72×48 button shrinks to a 48×48 circle and
// the pill width collapses from 240 → 176. Driven by the module-scoped
// `navCompactProgress` shared value from useDashboardReveal — which
// every scroll handler writes into. The interpolation happens inside
// worklets so the animation tracks the finger frame-perfect.

import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet, Pressable, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutGrid, Plus } from 'lucide-react-native';
import Svg, { Rect } from 'react-native-svg';
import { useTheme } from '../design/useTheme';
import { floatingNav } from '../design/layout';
import { zIndex } from '../design/zIndex';
import { useAddSubscriptionStore } from '../features/add-subscription/useAddSubscriptionStore';
import {
  revealProgress,
  navCompactProgress,
} from '../features/dashboard/useDashboardReveal';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

// ─── Custom CardIcon (matches web's CardIcon with stripe) ────────────
function CardIcon({
  size,
  color,
  filled,
  stripeColor,
}: {
  size: number;
  color: string;
  filled: boolean;
  stripeColor?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x={2}
        y={4}
        width={20}
        height={16}
        rx={3}
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={2}
      />
      <Rect
        x={2}
        y={9.5}
        width={20}
        height={2.5}
        fill={filled ? stripeColor || '#FFFFFF' : color}
      />
    </Svg>
  );
}

// ─── Layout constants ────────────────────────────────────────────────
const BTN_W_EXPANDED = floatingNav.buttonWidth; // 72
const BTN_W_COMPACT = floatingNav.buttonHeight; // 48 — square → circle
const BTN_H = floatingNav.buttonHeight; // 48
const PAD = floatingNav.padding; // 8
const GAP = floatingNav.gap; // 8

const NAV_W_EXPANDED =
  PAD + BTN_W_EXPANDED + GAP + BTN_W_EXPANDED + GAP + BTN_W_EXPANDED + PAD; // 240
const NAV_W_COMPACT =
  PAD + BTN_W_COMPACT + GAP + BTN_W_COMPACT + GAP + BTN_W_COMPACT + PAD; // 176
const NAV_H = PAD + BTN_H + PAD; // 64

const SPRING = { damping: 32, stiffness: 420, mass: 0.8 };

export function FloatingNav() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const isSubscriptions = pathname.includes('/subscriptions');
  const activeIndex = isSubscriptions ? 1 : 0;

  // Compute the `+` button's window rect deterministically from the
  // FloatingNav layout constants + current safe-area insets. This is
  // more reliable than `measureInWindow` on a Pressable inside a
  // BlurView (which can return 0,0,0,0 on iOS Paper).
  //
  // Note: we read `navCompactProgress.value` synchronously so the
  // morph-from-rect matches whatever visual size the button has at
  // the moment of the tap.
  const openAddSubscription = useCallback(() => {
    // Guard against double-open: if the overlay is already mounting /
    // animating in, ignore additional taps.
    if (useAddSubscriptionStore.getState().isOpen) return;

    const compact = navCompactProgress.value;
    const btnW = BTN_W_EXPANDED + (BTN_W_COMPACT - BTN_W_EXPANDED) * compact;
    const navW = PAD + btnW + GAP + btnW + GAP + btnW + PAD;

    const { width: screenW, height: screenH } = Dimensions.get('window');
    const navBottomOffset = Math.max(insets.bottom, 8) + 4;
    const pillLeft = (screenW - navW) / 2;
    const plusX = pillLeft + PAD + btnW + GAP;
    const plusY = screenH - navBottomOffset - NAV_H + PAD;

    useAddSubscriptionStore.getState().open({
      x: plusX,
      y: plusY,
      width: btnW,
      height: BTN_H,
      borderRadius: BTN_H / 2, // fully-pill (radius 9999 clamps to h/2)
    });
  }, [insets.bottom]);

  // Tab-switch spring: 0 = left, 1 = right. Smoothly moves the
  // indicator between left and right anchor positions.
  const activeIndicatorPos = useSharedValue(activeIndex);

  useEffect(() => {
    activeIndicatorPos.value = withSpring(activeIndex, SPRING);
  }, [activeIndex, activeIndicatorPos]);

  // Reveal-aware wrapper animation — as the dashboard pull-down opens,
  // the nav fades out and scales down to 0.9 so it doesn't compete with
  // the profile panel that's becoming the focus.
  const wrapperRevealStyle = useAnimatedStyle(() => {
    const p = revealProgress.value;
    return {
      opacity: interpolate(p, [0, 1], [1, 0], Extrapolation.CLAMP),
      transform: [
        { scale: interpolate(p, [0, 1], [1, 0.9], Extrapolation.CLAMP) },
      ],
    };
  });

  // Derived button width — same value for all three buttons, animates
  // continuously with scroll position.
  const btnW = useDerivedValue(() =>
    interpolate(
      navCompactProgress.value,
      [0, 1],
      [BTN_W_EXPANDED, BTN_W_COMPACT],
      Extrapolation.CLAMP,
    ),
  );

  // Pill total width follows button widths (3 buttons + 2 gaps + 2 pads).
  const pillStyle = useAnimatedStyle(() => {
    const w = btnW.value;
    return { width: PAD + w + GAP + w + GAP + w + PAD };
  });

  const navButtonStyle = useAnimatedStyle(() => ({
    width: btnW.value,
  }));

  // Indicator slides between left/right anchors; its width and the
  // anchor positions both depend on the current button width.
  const indicatorStyle = useAnimatedStyle(() => {
    const w = btnW.value;
    const leftX = PAD;
    const rightX = PAD + w + GAP + w + GAP;
    const x = interpolate(
      activeIndicatorPos.value,
      [0, 1],
      [leftX, rightX],
      Extrapolation.CLAMP,
    );
    return {
      width: w,
      transform: [{ translateX: x }],
    };
  });

  // Colors
  const iconColor = isDark ? '#F2F2F7' : '#000000';
  const inactiveBorder = isDark ? '#2C2C2E' : '#E5E5EA';
  const strokeIndicatorColor = isDark ? '#F2F2F7' : '#000000';
  const plusBg = isDark ? '#F2F2F7' : '#000000';
  const plusIconColor = isDark ? '#000000' : '#FFFFFF';
  const navTint = isDark ? 'rgba(28, 28, 30, 0.45)' : 'rgba(255, 255, 255, 0.4)';
  const cardStripeColor = isDark ? '#1C1C1E' : '#F7F8FA';

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { bottom: Math.max(insets.bottom, 8) + 4 },
        wrapperRevealStyle,
      ]}
      pointerEvents="box-none"
    >
      <AnimatedBlurView
        intensity={80}
        tint={isDark ? 'dark' : 'light'}
        style={[styles.pill, { backgroundColor: navTint }, pillStyle]}
      >
        {/* Sliding stroke indicator */}
        <Animated.View
          style={[
            styles.indicator,
            indicatorStyle,
            { borderColor: strokeIndicatorColor },
          ]}
        />

        {/* Dashboard */}
        <AnimatedPressable
          style={[
            styles.navButton,
            activeIndex !== 0 && {
              borderWidth: 1.5,
              borderColor: inactiveBorder,
            },
            navButtonStyle,
          ]}
          onPress={() => router.push('/(tabs)/dashboard')}
        >
          <LayoutGrid
            size={20}
            strokeWidth={2}
            color={iconColor}
            fill={activeIndex === 0 ? iconColor : 'none'}
          />
        </AnimatedPressable>

        {/* Plus — filled pill. Position is computed deterministically in
            openAddSubscription() so the AddSubscriptionOverlay can morph
            the sheet out of this exact rect (shared-element transition). */}
        <AnimatedPressable
          style={[styles.plusButton, { backgroundColor: plusBg }, navButtonStyle]}
          onPress={openAddSubscription}
          accessibilityLabel="Crear nueva suscripción"
        >
          <Plus size={20} strokeWidth={2.5} color={plusIconColor} />
        </AnimatedPressable>

        {/* Subscriptions — custom CardIcon with stripe */}
        <AnimatedPressable
          style={[
            styles.navButton,
            activeIndex !== 1 && {
              borderWidth: 1.5,
              borderColor: inactiveBorder,
            },
            navButtonStyle,
          ]}
          onPress={() => router.push('/(tabs)/subscriptions')}
        >
          <CardIcon
            size={20}
            color={iconColor}
            filled={activeIndex === 1}
            stripeColor={cardStripeColor}
          />
        </AnimatedPressable>
      </AnimatedBlurView>
    </Animated.View>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: zIndex.floatingNav,
  },
  pill: {
    // width is animated via pillStyle
    height: NAV_H,
    borderRadius: floatingNav.borderRadius,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PAD,
    gap: GAP,
    overflow: 'hidden',
  },
  navButton: {
    // width is animated via navButtonStyle
    height: BTN_H,
    borderRadius: floatingNav.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusButton: {
    // width is animated via navButtonStyle
    height: BTN_H,
    borderRadius: floatingNav.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    position: 'absolute',
    top: PAD,
    left: 0,
    // width is animated via indicatorStyle
    height: BTN_H,
    borderRadius: floatingNav.borderRadius,
    borderWidth: 2,
  },
});
