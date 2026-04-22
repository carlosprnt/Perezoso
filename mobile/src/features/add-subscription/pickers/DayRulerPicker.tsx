import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { fontFamily, fontSize } from '../../../design/typography';
import { haptic } from '../../../lib/haptics';

const TICKS_PER_DAY = 4;
const TICK_W = 8;
const DAY_SPACING = TICKS_PER_DAY * TICK_W;

const TICK_HEIGHT = 32;
const TICK_THICKNESS = 2;
const TICK_COLOR = '#C7C7CC';
const FADE_WIDTH = 80;

const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildDates(): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setMonth(end.getMonth() + 2);
  const dates: Date[] = [];
  const cursor = new Date(today);
  while (cursor <= end) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function buildTicks(dayCount: number): number[] {
  const out: number[] = [];
  for (let d = 0; d < dayCount; d++) {
    out.push(1);
    if (d < dayCount - 1) {
      for (let s = 0; s < TICKS_PER_DAY - 1; s++) out.push(0);
    }
  }
  return out;
}

interface Props {
  value: Date;
  onChange: (date: Date) => void;
  onTapLabel?: () => void;
}

export function DayRulerPicker({ value, onChange, onTapLabel }: Props) {
  const prevIdx = useRef(0);
  const [halfWidth, setHalfWidth] = useState(0);

  const dates = useMemo(() => buildDates(), []);
  const ticks = useMemo(() => buildTicks(dates.length), [dates.length]);

  const currentIdx = useMemo(() => {
    const idx = dates.findIndex((d) => sameDay(d, value));
    return idx >= 0 ? idx : 0;
  }, [dates, value]);

  const handleLayout = useCallback((e: any) => {
    setHalfWidth(e.nativeEvent.layout.width / 2);
  }, []);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const idx = Math.round(x / DAY_SPACING);
      const clamped = Math.max(0, Math.min(dates.length - 1, idx));
      if (clamped !== prevIdx.current) {
        prevIdx.current = clamped;
        onChange(dates[clamped]);
        haptic.selection();
      }
    },
    [onChange, dates],
  );

  // Blur-fade animation on day/month change
  const textOpacity = useSharedValue(1);
  const textScale = useSharedValue(1);
  const prevDateKey = useRef(`${value.getDate()}-${value.getMonth()}`);

  useEffect(() => {
    const key = `${value.getDate()}-${value.getMonth()}`;
    if (key !== prevDateKey.current) {
      prevDateKey.current = key;
      textOpacity.value = 0.15;
      textScale.value = 0.92;
      textOpacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
      textScale.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) });
    }
  }, [value, textOpacity, textScale]);

  const dateAnimStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ scale: textScale.value }],
  }));

  const monthName = MONTHS_ES[value.getMonth()];
  const capitalMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  return (
    <View style={styles.container}>
      <Pressable onPress={onTapLabel} style={styles.dateTapArea}>
        <Animated.View style={[styles.dateRow, dateAnimStyle]}>
          <Text style={styles.dayNumber}>{value.getDate()}</Text>
          <Text style={styles.monthLabel}>{capitalMonth}</Text>
        </Animated.View>
        <Text style={styles.renewalLabel}>Próxima renovación</Text>
      </Pressable>

      <View style={styles.rulerWrap} onLayout={handleLayout}>
        {halfWidth > 0 && (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={DAY_SPACING}
              decelerationRate="fast"
              scrollEventThrottle={16}
              onScroll={handleScroll}
              contentOffset={{ x: currentIdx * DAY_SPACING, y: 0 }}
              contentContainerStyle={{
                paddingHorizontal: halfWidth,
                alignItems: 'flex-end',
              }}
            >
              {ticks.map((_, i) => (
                <View key={i} style={styles.tickCol}>
                  <View style={styles.tick} />
                </View>
              ))}
            </ScrollView>

            <View style={styles.indicatorWrap} pointerEvents="none">
              <View style={styles.indicator} />
            </View>

            <LinearGradient
              colors={['#FFFFFF', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.fadeLeft}
              pointerEvents="none"
            />
            <LinearGradient
              colors={['rgba(255,255,255,0)', '#FFFFFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.fadeRight}
              pointerEvents="none"
            />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 8,
  },
  dateTapArea: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  dayNumber: {
    ...fontFamily.bold,
    fontSize: fontSize[50],
    color: '#000000',
    letterSpacing: -2,
  },
  monthLabel: {
    ...fontFamily.bold,
    fontSize: fontSize[50],
    color: '#000000',
    letterSpacing: -2,
  },
  renewalLabel: {
    ...fontFamily.medium,
    fontSize: fontSize[16],
    color: '#8E8E93',
    marginTop: 2,
    marginBottom: 24,
  },
  rulerWrap: {
    width: '100%',
    height: 56,
  },
  tickCol: {
    width: TICK_W,
    alignItems: 'center',
  },
  tick: {
    width: TICK_THICKNESS,
    height: TICK_HEIGHT,
    backgroundColor: TICK_COLOR,
    borderRadius: TICK_THICKNESS / 2,
  },
  indicatorWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  indicator: {
    width: 3,
    height: 48,
    backgroundColor: '#FF3B30',
    borderRadius: 1.5,
  },
  fadeLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: FADE_WIDTH,
  },
  fadeRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: FADE_WIDTH,
  },
});
