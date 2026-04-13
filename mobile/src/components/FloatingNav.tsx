// Phase 6 — FloatingNav
// Replicates the web app's floating bottom navigation pill:
//   Dashboard (left) | Plus (center, filled circle) | Subscriptions (right)
//   Sliding stroke indicator on active tab
//   Active icons use fill, inactive icons use stroke + subtle border
//
// Web dimensions: buttons 72x48, plus 72x48, padding 8, gap 8
// Plus button: filled circle (black light / #F2F2F7 dark)
// Active icon: filled variant, inactive: stroke + 1.5px border

import React, { useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutGrid, CreditCard, Plus } from 'lucide-react-native';
import { useTheme } from '../design/useTheme';
import { floatingNav } from '../design/layout';
import { zIndex } from '../design/zIndex';

// Layout constants
const BTN_W = floatingNav.buttonWidth;   // 72
const BTN_H = floatingNav.buttonHeight;  // 48
const PAD = floatingNav.padding;         // 8
const GAP = floatingNav.gap;             // 8

const NAV_W = PAD + BTN_W + GAP + BTN_W + GAP + BTN_W + PAD; // 240
const NAV_H = PAD + BTN_H + PAD; // 64

// Indicator X positions
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

  // Colors
  const iconColor = isDark ? '#F2F2F7' : '#000000';
  const inactiveBorder = isDark ? '#2C2C2E' : '#E5E5EA';
  const strokeIndicatorColor = isDark ? '#F2F2F7' : '#000000';
  const plusBg = isDark ? '#F2F2F7' : '#000000';
  const plusIconColor = isDark ? '#000000' : '#FFFFFF';

  return (
    <View
      style={[
        styles.wrapper,
        { bottom: Math.max(insets.bottom, 8) + 4 },
      ]}
      pointerEvents="box-none"
    >
      <View style={[styles.pill, { backgroundColor: colors.floatingNavBg }]}>
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
            activeIndex !== 0 && { borderWidth: 1.5, borderColor: inactiveBorder },
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

        {/* Plus (add subscription) — filled circle */}
        <Pressable
          style={[styles.plusButton, { backgroundColor: plusBg }]}
          onPress={() => router.push('/(tabs)/subscriptions/new')}
        >
          <Plus size={20} strokeWidth={2.5} color={plusIconColor} />
        </Pressable>

        {/* Subscriptions */}
        <Pressable
          style={[
            styles.navButton,
            activeIndex !== 1 && { borderWidth: 1.5, borderColor: inactiveBorder },
          ]}
          onPress={() => router.push('/(tabs)/subscriptions')}
        >
          <CreditCard
            size={20}
            strokeWidth={2}
            color={iconColor}
            fill={activeIndex === 1 ? iconColor : 'none'}
          />
        </Pressable>
      </View>
    </View>
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
