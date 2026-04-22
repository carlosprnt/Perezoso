import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fontFamily, fontSize } from '../../../design/typography';
import { haptic } from '../../../lib/haptics';

const TICKS_PER_DAY = 4;
const TICK_W = 6;
const DAY_SPACING = TICKS_PER_DAY * TICK_W;

const TICK_HEIGHT = 14;
const TICK_THICKNESS = 1.5;
const TICK_COLOR = '#C7C7CC';
const FADE_WIDTH = 60;

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
  end.setMonth(end.getMonth() + 1);
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

  return (
    <View style={styles.container}>
      <Text style={styles.dayNumber}>{value.getDate()}</Text>
      <Pressable onPress={onTapLabel} hitSlop={8}>
        <Text style={styles.monthLabel}>de {MONTHS_ES[value.getMonth()]}</Text>
      </Pressable>
      <Text style={styles.renewalLabel}>Próxima renovación</Text>

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
  dayNumber: {
    ...fontFamily.bold,
    fontSize: fontSize[50],
    color: '#000000',
    letterSpacing: -2,
  },
  monthLabel: {
    ...fontFamily.regular,
    fontSize: fontSize[18],
    color: '#000000',
    letterSpacing: -0.2,
    marginTop: 2,
  },
  renewalLabel: {
    ...fontFamily.regular,
    fontSize: fontSize[13],
    color: '#8E8E93',
    marginTop: 4,
    marginBottom: 28,
  },
  rulerWrap: {
    width: '100%',
    height: 44,
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
    height: 38,
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
