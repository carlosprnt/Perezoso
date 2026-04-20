// PaymentsCalendarModal — globally mounted payments calendar.
//
// Mounted once in app/_layout.tsx. Driven by useCalendarStore so any
// screen can open it with a single call. Uses a native iOS pageSheet
// (same primitive as SubscriptionDetailSheet) so we inherit the
// correct safe-area insets, the dimmed backdrop, the handle bar and
// the pan-down-to-dismiss gesture for free.
//
// Inside the sheet:
//   · Large month title + circular prev/next nav buttons
//   · Subtitle: "X€ total · N renovaciones"
//   · Monday-first 7-column day grid with logos + today border
//
// Months animate with a horizontal slide/fade via CalendarMonthHeader.
// Horizontal swipes on the grid also advance the month.

import React, { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  ScrollView,
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
import type { Subscription } from '../subscriptions/types';

const FADE_MS = 220;
const EASE = Easing.bezier(0.4, 0, 0.2, 1);

export function PaymentsCalendarModal() {
  const isOpen        = useCalendarStore((s) => s.isOpen);
  const close         = useCalendarStore((s) => s.close);
  const subscriptions = useSubscriptionsStore((s) => s.subscriptions);

  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const today = useMemo(() => new Date(), [isOpen]); // re-freeze on each open
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  // Reset to current month every time the sheet opens so the user
  // always lands on "today" when revisiting the calendar.
  React.useEffect(() => {
    if (isOpen) {
      setYear(today.getFullYear());
      setMonth(today.getMonth());
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
  // Tiny opacity pulse to mask the content swap for a cleaner transition.
  const gridOpacity = useSharedValue(1);
  const prevKey = React.useRef(`${year}-${month}`);
  const nowKey = `${year}-${month}`;
  if (prevKey.current !== nowKey) {
    prevKey.current = nowKey;
    gridOpacity.value = 0.4;
    gridOpacity.value = withTiming(1, { duration: FADE_MS, easing: EASE });
  }
  const gridStyle = useAnimatedStyle(() => ({ opacity: gridOpacity.value }));

  const handleDayPress = useCallback(
    (_day: number, _subs: Subscription[]) => {
      haptic.selection();
    },
    [],
  );

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={close}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            paddingTop: 8,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          bounces
        >
          <View style={styles.headerBlock}>
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
                {formatAmount(totalAmount, currency)} total
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
                  : `${totalCount} ${totalCount === 1 ? 'renovación' : 'renovaciones'}`}
              </Text>
            </View>
          </View>

          <GestureDetector gesture={swipeGesture}>
            <Animated.View style={gridStyle}>
              <CalendarGrid
                year={year}
                month={month}
                today={today}
                dayMap={dayMap}
                onDayPress={handleDayPress}
              />
            </Animated.View>
          </GestureDetector>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  headerBlock: {
    paddingTop: 8,
    paddingBottom: 16,
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
});
