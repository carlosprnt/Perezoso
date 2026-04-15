// Phase 6 — FloatingNav
// Replicates the web app's floating bottom navigation pill:
//   Dashboard (left) | Plus (center, filled circle) | Subscriptions (right)
//   Sliding stroke indicator on active tab
//   Active icons use fill, inactive icons use stroke + subtle border
//
// Plus button: filled circle (black light / #F2F2F7 dark)
// Container: white glass ~85% opacity
// Card icon: custom SVG (not lucide CreditCard) with visible stripe when filled

import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet, Pressable, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
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
import { revealProgress } from '../features/dashboard/useDashboardReveal';

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
const BTN_W = floatingNav.buttonWidth; // 72
const BTN_H = floatingNav.buttonHeight; // 48
const PAD = floatingNav.padding; // 8
const GAP = floatingNav.gap; // 8

const NAV_W = PAD + BTN_W + GAP + BTN_W + GAP + BTN_W + PAD; // 240
const NAV_H = PAD + BTN_H + PAD; // 64

const INDICATOR_X_LEFT = PAD;
const INDICATOR_X_RIGHT = PAD + BTN_W + GAP + BTN_W + GAP;

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
  // BlurView (which can return 0,0,0,0 on iOS Paper), and matches the
  // styles below exactly:
  //   - wrapper has bottom: Math.max(insets.bottom, 8) + 4
  //   - pill is centered horizontally, NAV_W wide
  //   - + button is the middle child, at pill.left + PAD + BTN_W + GAP
  //   - + button top offset inside pill is PAD
  const openAddSubscription = useCallback(() => {
    // Guard against double-open: if the overlay is already mounting /
    // animating in, ignore additional taps.
    if (useAddSubscriptionStore.getState().isOpen) return;

    const { width: screenW, height: screenH } = Dimensions.get('window');
    const navBottomOffset = Math.max(insets.bottom, 8) + 4;
    const pillLeft = (screenW - NAV_W) / 2;
    const plusX = pillLeft + PAD + BTN_W + GAP;
    const plusY = screenH - navBottomOffset - NAV_H + PAD;

    useAddSubscriptionStore.getState().open({
      x: plusX,
      y: plusY,
      width: BTN_W,
      height: BTN_H,
      borderRadius: BTN_H / 2, // fully-pill (radius 9999 clamps to h/2)
    });
  }, [insets.bottom]);

  const indicatorX = useSharedValue(
    isSubscriptions ? INDICATOR_X_RIGHT : INDICATOR_X_LEFT,
  );

  useEffect(() => {
    indicatorX.value = withSpring(
      activeIndex === 0 ? INDICATOR_X_LEFT : INDICATOR_X_RIGHT,
      SPRING,
    );
  }, [activeIndex]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

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
      <BlurView
        intensity={80}
        tint={isDark ? 'dark' : 'light'}
        style={[styles.pill, { backgroundColor: navTint }]}
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
        <Pressable
          style={[
            styles.navButton,
            activeIndex !== 0 && {
              borderWidth: 1.5,
              borderColor: inactiveBorder,
            },
          ]}
          onPress={() => router.push('/(tabs)/dashboard')}
        >
          <LayoutGrid
            size={20}
            strokeWidth={2}
            color={iconColor}
            fill={activeIndex === 0 ? iconColor : 'none'}
          />
        </Pressable>

        {/* Plus — filled pill. Position is computed deterministically in
            openAddSubscription() so the AddSubscriptionOverlay can morph
            the sheet out of this exact rect (shared-element transition). */}
        <Pressable
          style={[styles.plusButton, { backgroundColor: plusBg }]}
          onPress={openAddSubscription}
          accessibilityLabel="Crear nueva suscripción"
        >
          <Plus size={20} strokeWidth={2.5} color={plusIconColor} />
        </Pressable>

        {/* Subscriptions — custom CardIcon with stripe */}
        <Pressable
          style={[
            styles.navButton,
            activeIndex !== 1 && {
              borderWidth: 1.5,
              borderColor: inactiveBorder,
            },
          ]}
          onPress={() => router.push('/(tabs)/subscriptions')}
        >
          <CardIcon
            size={20}
            color={iconColor}
            filled={activeIndex === 1}
            stripeColor={cardStripeColor}
          />
        </Pressable>
      </BlurView>
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
    width: NAV_W,
    height: NAV_H,
    borderRadius: floatingNav.borderRadius,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PAD,
    gap: GAP,
    overflow: 'hidden',
  },
  navButton: {
    width: BTN_W,
    height: BTN_H,
    borderRadius: floatingNav.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusButton: {
    width: BTN_W,
    height: BTN_H,
    borderRadius: floatingNav.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    position: 'absolute',
    top: PAD,
    left: 0,
    width: BTN_W,
    height: BTN_H,
    borderRadius: floatingNav.borderRadius,
    borderWidth: 2,
  },
});
