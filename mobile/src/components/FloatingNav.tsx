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
// Driven by the module-scoped `navCompactProgress` (0=expanded, 1=compact).
// After COMPACT_SCROLL_THRESHOLD px of scroll the pill waits 1 s then
// compacts over 300 ms; scrolling back reverses in 200 ms immediately.
// Each elongated button (72×48) morphs into a 48×48 circle, shrinking
// the pill from 240 → 176 px wide.
//
// Layout structure (fixes vertical-centering on iOS):
//   Animated.View  ← owns the animated width + overflow:hidden clip
//     BlurView (absoluteFill)  ← blur background
//     View     (absoluteFill)  ← tint overlay
//     Animated.View            ← sliding indicator (absolute, below buttons)
//     View (buttonRow)         ← flex-row with alignItems:center

import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet, Pressable, Dimensions } from 'react-native';
import { haptic } from '../lib/haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  interpolate,
  Easing,
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
import { useSubscriptionsStore } from '../stores/subscriptionsStore';
import {
  revealProgress,
  navCompactProgress,
} from '../features/dashboard/useDashboardReveal';

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
const BTN_W_EXPANDED = floatingNav.buttonWidth;   // 72
const BTN_W_COMPACT  = floatingNav.buttonHeight;  // 48 — square → circle
const BTN_H          = floatingNav.buttonHeight;  // 48
const PAD            = floatingNav.padding;       // 8
const GAP            = floatingNav.gap;           // 8

const NAV_H = PAD + BTN_H + PAD; // 64

const SPRING = { damping: 32, stiffness: 420, mass: 0.8 };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function FloatingNav() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const isSubscriptions = pathname.includes('/subscriptions');
  const activeIndex = isSubscriptions ? 1 : 0;

  // When the user has 0 subscriptions, the `+` button pulses in a soft
  // grow/shrink loop to draw attention — the empty states above it
  // push the user toward this button as the primary action.
  const isEmpty = useSubscriptionsStore((s) => s.subscriptions.length === 0);
  const pulseScale = useSharedValue(1);
  useEffect(() => {
    if (isEmpty) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 800, easing: Easing.inOut(Easing.quad) }),
          withTiming(1.0,  { duration: 800, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(pulseScale);
      pulseScale.value = withTiming(1.0, { duration: 200 });
    }
    return () => {
      cancelAnimation(pulseScale);
    };
  }, [isEmpty, pulseScale]);

  // Compute the `+` button's window rect from layout constants + current
  // compact state. Read navCompactProgress.value synchronously on JS
  // thread so the morph-from-rect origin matches the visual button size.
  const openAddSubscription = useCallback(() => {
    if (useAddSubscriptionStore.getState().isOpen) return;
    haptic.medium();

    const compact = navCompactProgress.value;
    const btnW = BTN_W_EXPANDED + (BTN_W_COMPACT - BTN_W_EXPANDED) * compact;
    const navW = PAD + btnW + GAP + btnW + GAP + btnW + PAD;

    const { width: screenW, height: screenH } = Dimensions.get('window');
    const navBottomOffset = Math.max(insets.bottom - 6, 2);
    const pillLeft = (screenW - navW) / 2;
    const plusX = pillLeft + PAD + btnW + GAP;
    const plusY = screenH - navBottomOffset - NAV_H + PAD;

    useAddSubscriptionStore.getState().open({
      x: plusX,
      y: plusY,
      width: btnW,
      height: BTN_H,
      borderRadius: BTN_H / 2,
    });
  }, [insets.bottom]);

  // Tab-switch spring: 0 = left, 1 = right.
  const activeIndicatorPos = useSharedValue(activeIndex);
  useEffect(() => {
    activeIndicatorPos.value = withSpring(activeIndex, SPRING);
  }, [activeIndex, activeIndicatorPos]);

  // Reveal-aware: fades + scales down as the profile layer reveals.
  const wrapperRevealStyle = useAnimatedStyle(() => {
    const p = revealProgress.value;
    return {
      opacity: interpolate(p, [0, 1], [1, 0], Extrapolation.CLAMP),
      transform: [
        { scale: interpolate(p, [0, 1], [1, 0.9], Extrapolation.CLAMP) },
      ],
    };
  });

  // Derived button width shared value — same for all three buttons.
  const btnW = useDerivedValue(() =>
    interpolate(
      navCompactProgress.value,
      [0, 1],
      [BTN_W_EXPANDED, BTN_W_COMPACT],
      Extrapolation.CLAMP,
    ),
  );

  // Pill total width (3 buttons + 2 gaps + 2 padding).
  const pillStyle = useAnimatedStyle(() => {
    const w = btnW.value;
    return { width: PAD + w + GAP + w + GAP + w + PAD };
  });

  // Each button's width follows btnW.
  const navButtonStyle = useAnimatedStyle(() => ({
    width: btnW.value,
  }));

  // Plus button combines width morph + idle pulse (only when isEmpty).
  const plusButtonStyle = useAnimatedStyle(() => ({
    width: btnW.value,
    transform: [{ scale: pulseScale.value }],
  }));

  // Indicator slides between left/right; width and anchor positions
  // both change with btnW so indicator tracks button edges exactly.
  const indicatorStyle = useAnimatedStyle(() => {
    const w = btnW.value;
    const leftX  = PAD;
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
  const iconColor          = isDark ? '#F2F2F7' : '#000000';
  const inactiveBorder     = isDark ? '#2C2C2E' : '#E5E5EA';
  const strokeIndicator    = isDark ? '#F2F2F7' : '#000000';
  const plusBg             = isDark ? '#F2F2F7' : '#000000';
  const plusIconColor      = isDark ? '#000000' : '#FFFFFF';
  const navTint            = isDark ? 'rgba(28,28,30,0.45)' : 'rgba(255,255,255,0.4)';
  const cardStripeColor    = isDark ? '#1C1C1E' : '#F7F8FA';

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { bottom: Math.max(insets.bottom - 6, 2) },
        wrapperRevealStyle,
      ]}
      pointerEvents="box-none"
    >
      {/*
        Pill: Animated.View owns the width animation + overflow clip.
        BlurView fills it absolutely — this separates blur rendering from
        the flex layout so BlurView quirks on iOS don't affect centering.
        ButtonRow is a plain flex-row that vertically centers buttons.
      */}
      <Animated.View style={[styles.pill, pillStyle]}>
        {/* Background: blur + tint */}
        <BlurView
          intensity={80}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: navTint, borderRadius: floatingNav.borderRadius },
          ]}
          pointerEvents="none"
        />

        {/* Sliding stroke indicator — drawn below the buttons */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicator,
            indicatorStyle,
            { borderColor: strokeIndicator },
          ]}
        />

        {/* Buttons row — plain View so alignItems:center always works */}
        <View style={styles.buttonRow}>
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
            onPress={() => { haptic.selection(); router.push('/(tabs)/dashboard'); }}
          >
            <LayoutGrid
              size={20}
              strokeWidth={2}
              color={iconColor}
              fill={activeIndex === 0 ? iconColor : 'none'}
            />
          </AnimatedPressable>

          {/* Plus */}
          <AnimatedPressable
            style={[styles.plusButton, { backgroundColor: plusBg }, plusButtonStyle]}
            onPress={openAddSubscription}
            accessibilityLabel="Crear nueva suscripción"
          >
            <Plus size={20} strokeWidth={2.5} color={plusIconColor} />
          </AnimatedPressable>

          {/* Subscriptions */}
          <AnimatedPressable
            style={[
              styles.navButton,
              activeIndex !== 1 && {
                borderWidth: 1.5,
                borderColor: inactiveBorder,
              },
              navButtonStyle,
            ]}
            onPress={() => { haptic.selection(); router.push('/(tabs)/subscriptions'); }}
          >
            <CardIcon
              size={20}
              color={iconColor}
              filled={activeIndex === 1}
              stripeColor={cardStripeColor}
            />
          </AnimatedPressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: zIndex.floatingNav,
  },
  pill: {
    // width is animated via pillStyle.
    // overflow:hidden clips the BlurView to the animated width boundary.
    height: NAV_H,
    borderRadius: floatingNav.borderRadius,
    overflow: 'hidden',
  },
  buttonRow: {
    // Sits on top of the absolute blur/tint layers. flex:1 fills pill
    // height so alignItems:center actually centres the 48px buttons
    // within the 64px NAV_H correctly on iOS.
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PAD,
    gap: GAP,
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
