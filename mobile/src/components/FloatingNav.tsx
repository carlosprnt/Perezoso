// Phase 6 — FloatingNav
// Replicates the web app's floating bottom navigation pill:
//   Dashboard (left) | Plus (center) | Subscriptions (right)
//   Sliding stroke indicator on active tab
//   Glass-effect background with safe area handling
//
// Web dimensions: buttons 72x48, plus 48x48, padding 8, gap 8
// Total: 224px wide, 64px tall, pill-shaped

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

// Layout constants derived from design tokens
const BTN_W = floatingNav.buttonWidth;   // 72
const BTN_H = floatingNav.buttonHeight;  // 48
const PAD = floatingNav.padding;         // 8
const GAP = floatingNav.gap;             // 8
const PLUS_SIZE = BTN_H;                 // 48 (square)

const NAV_W = PAD + BTN_W + GAP + PLUS_SIZE + GAP + BTN_W + PAD; // 224
const NAV_H = PAD + BTN_H + PAD; // 64

// Indicator X positions (relative to container, offset by padding)
const INDICATOR_X_LEFT = PAD;
const INDICATOR_X_RIGHT = PAD + BTN_W + GAP + PLUS_SIZE + GAP;

const SPRING = { damping: 22, stiffness: 300, mass: 0.8 };

export function FloatingNav() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  // Active tab: 0 = dashboard, 1 = subscriptions
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

  const strokeColor = isDark ? '#FFFFFF' : '#000000';
  const inactiveColor = isDark ? '#636366' : '#9CA3AF';

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
            { borderColor: strokeColor },
          ]}
        />

        {/* Dashboard */}
        <Pressable
          style={styles.navButton}
          onPress={() => router.push('/(tabs)/dashboard')}
          hitSlop={4}
        >
          <LayoutGrid
            size={20}
            strokeWidth={2}
            color={activeIndex === 0 ? strokeColor : inactiveColor}
          />
        </Pressable>

        {/* Plus (add subscription) */}
        <Pressable
          style={styles.plusButton}
          onPress={() => router.push('/(tabs)/subscriptions/new')}
          hitSlop={4}
        >
          <Plus size={22} strokeWidth={2.5} color={strokeColor} />
        </Pressable>

        {/* Subscriptions */}
        <Pressable
          style={styles.navButton}
          onPress={() => router.push('/(tabs)/subscriptions')}
          hitSlop={4}
        >
          <CreditCard
            size={20}
            strokeWidth={2}
            color={activeIndex === 1 ? strokeColor : inactiveColor}
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
    width: PLUS_SIZE,
    height: PLUS_SIZE,
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
