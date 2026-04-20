// PaymentsCalendarModal — globally mounted payments calendar.
//
// Mounted once in app/_layout.tsx. Driven by useCalendarStore so any
// screen can open it with a single call. Renders as a custom 65%-screen
// bottom sheet (not the native pageSheet) so we control the exact
// height and keep the day grid from scrolling.
//
// Layout:
//   · Header block: big month title + circular prev/next + subtitle
//   · Weekday labels row
//   · Day grid — flex:1 → rows expand to fill remaining sheet height
//
// Dismiss:
//   · Drag the handle/header down past 80px (or flick) → close
//   · Tap the backdrop → close
//
// Months animate with a horizontal slide/fade via CalendarMonthHeader.
// Horizontal swipes on the grid also advance the month.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../design/useTheme';
import { fontFamily } from '../../design/typography';
import { useSubscriptionsStore } from '../../stores/subscriptionsStore';
import { formatAmount } from '../subscription-detail/helpers';
import { haptic } from '../../lib/haptics';

import { useCalendarStore } from './useCalendarStore';
import { buildDayMap } from './dateHelpers';
import { CalendarMonthHeader } from './CalendarMonthHeader';
import { CalendarGrid } from './CalendarGrid';
import { useCountUp } from './useCountUp';
import type { Subscription } from '../subscriptions/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.65;

const ENTER_MS = 280;
const EXIT_MS  = 220;
const FADE_MS  = 220;
const EASE     = Easing.bezier(0.4, 0, 0.2, 1);

export function PaymentsCalendarModal() {
  const isOpen        = useCalendarStore((s) => s.isOpen);
  const close         = useCalendarStore((s) => s.close);
  const subscriptions = useSubscriptionsStore((s) => s.subscriptions);

  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const today = useMemo(() => new Date(), [isOpen]);
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const [mounted, setMounted] = useState(isOpen);
  const translateY     = useSharedValue(SHEET_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  // Reset to current month every time the sheet opens.
  useEffect(() => {
    if (isOpen) {
      setYear(today.getFullYear());
      setMonth(today.getMonth());
      setMounted(true);
      translateY.value = SHEET_HEIGHT;
      translateY.value = withTiming(0, { duration: ENTER_MS, easing: EASE });
      backdropOpacity.value = withTiming(1, { duration: ENTER_MS, easing: EASE });
    } else if (mounted) {
      translateY.value = withTiming(
        SHEET_HEIGHT,
        { duration: EXIT_MS, easing: EASE },
        (finished) => {
          if (finished) runOnJS(setMounted)(false);
        },
      );
      backdropOpacity.value = withTiming(0, { duration: EXIT_MS, easing: EASE });
    }
  }, [isOpen, today]);

  const dayMap = useMemo(
    () => buildDayMap(subscriptions, year, month),
    [subscriptions, year, month],
  );

  const totalCount = useMemo(
    () => Object.values(dayMap).reduce((n, list) => n + list.length, 0),
    [dayMap],
  );

  const totalAmount = useMemo(() => {
    let total = 0;
    for (const list of Object.values(dayMap)) {
      for (const sub of list) total += sub.price_amount;
    }
    return total;
  }, [dayMap]);

  const currency = subscriptions[0]?.currency ?? '€';

  // Animated count-up — amount + count smoothly morph on month change.
  const animatedAmount = useCountUp(totalAmount, 550);
  const animatedCount  = useCountUp(totalCount, 450);

  // ── Month navigation ───────────────────────────────────────────────
  const prevMonth = useCallback(() => {
    setMonth((m) => {
      if (m === 0) {
        setYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  const nextMonth = useCallback(() => {
    setMonth((m) => {
      if (m === 11) {
        setYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  // ── Drag-to-dismiss on the header ──────────────────────────────────
  // Only the top strip owns the pan gesture so taps/presses inside
  // the grid keep working normally.
  const dragGesture = Gesture.Pan()
    .onUpdate((e) => {
      'worklet';
      if (e.translationY > 0) {
        translateY.value = e.translationY;
      } else {
        translateY.value = e.translationY * 0.15;
      }
    })
    .onEnd((e) => {
      'worklet';
      const shouldDismiss = e.translationY > 80 || e.velocityY > 500;
      if (shouldDismiss) {
        translateY.value = withTiming(
          SHEET_HEIGHT,
          { duration: EXIT_MS, easing: EASE },
          (fin) => {
            if (fin) runOnJS(close)();
          },
        );
        backdropOpacity.value = withTiming(0, { duration: EXIT_MS, easing: EASE });
      } else {
        translateY.value = withTiming(0, { duration: 200, easing: EASE });
      }
    });

  // ── Horizontal swipe on the grid to change month ───────────────────
  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-20, 20])
    .onEnd((e) => {
      'worklet';
      const dx = e.translationX;
      const dy = e.translationY;
      if (Math.abs(dx) < 50) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.5) return;
      if (dx < 0) runOnJS(nextMonth)();
      else        runOnJS(prevMonth)();
    });

  // ── Grid cross-fade on month change ────────────────────────────────
  const gridOpacity = useSharedValue(1);
  const prevKey = React.useRef(`${year}-${month}`);
  const nowKey = `${year}-${month}`;
  if (prevKey.current !== nowKey) {
    prevKey.current = nowKey;
    gridOpacity.value = 0.4;
    gridOpacity.value = withTiming(1, { duration: FADE_MS, easing: EASE });
  }
  const gridStyle = useAnimatedStyle(() => ({ opacity: gridOpacity.value, flex: 1 }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const handleDayPress = useCallback(
    (_day: number, _subs: Subscription[]) => {
      haptic.selection();
    },
    [],
  );

  if (!mounted) return null;

  const sheetBg       = isDark ? '#1C1C1E' : '#FFFFFF';
  const handleColor   = isDark ? '#3A3A3C' : '#D4D4D4';
  const backdropColor = isDark ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.35)';

  return (
    <Modal
      visible={mounted}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={close}
    >
      {/* Backdrop — tap to dismiss */}
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: backdropColor },
          backdropStyle,
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={close}
          accessibilityLabel="Cerrar calendario"
        />
      </Animated.View>

      <View style={styles.sheetWrap} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.sheet,
            {
              height: SHEET_HEIGHT,
              backgroundColor: sheetBg,
              paddingBottom: Math.max(insets.bottom, 16),
            },
            sheetStyle,
          ]}
        >
          {/* Drag handle + header — pan gesture lives here */}
          <GestureDetector gesture={dragGesture}>
            <View style={styles.headerBlock}>
              <View style={styles.handleWrap}>
                <View style={[styles.handle, { backgroundColor: handleColor }]} />
              </View>

              <View style={styles.headerPad}>
                <CalendarMonthHeader
                  year={year}
                  month={month}
                  onPrev={prevMonth}
                  onNext={nextMonth}
                />

                <View style={styles.subtitleRow}>
                  <Text
                    style={[
                      styles.subtitle,
                      { color: isDark ? '#8E8E93' : '#737373', ...fontFamily.regular },
                    ]}
                  >
                    {formatAmount(animatedAmount, currency)} total
                  </Text>
                  <View
                    style={[
                      styles.divider,
                      { backgroundColor: isDark ? '#3A3A3C' : '#D4D4D4' },
                    ]}
                  />
                  <Text
                    style={[
                      styles.subtitle,
                      { color: isDark ? '#8E8E93' : '#737373', ...fontFamily.regular },
                    ]}
                  >
                    {totalCount === 0
                      ? 'Sin renovaciones'
                      : `${Math.round(animatedCount)} ${Math.round(animatedCount) === 1 ? 'renovación' : 'renovaciones'}`}
                  </Text>
                </View>
              </View>
            </View>
          </GestureDetector>

          {/* Grid — fills remaining height, rows flex equally */}
          <GestureDetector gesture={swipeGesture}>
            <Animated.View style={[styles.gridWrap, gridStyle]}>
              <CalendarGrid
                year={year}
                month={month}
                today={today}
                dayMap={dayMap}
                onDayPress={handleDayPress}
              />
            </Animated.View>
          </GestureDetector>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 24,
    overflow: 'hidden',
  },
  headerBlock: {
    paddingHorizontal: 16,
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 6,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 9999,
  },
  headerPad: {
    paddingTop: 6,
    paddingBottom: 12,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  subtitle: {
    fontSize: 13,
  },
  divider: {
    width: 1,
    height: 12,
  },
  gridWrap: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});
