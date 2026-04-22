import React, { useCallback, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fontFamily, fontSize } from '../../../design/typography';
import { haptic } from '../../../lib/haptics';

const MARKS_PER_DAY = 4;
const MARK_WIDTH = 6;
const DAY_SPACING = MARKS_PER_DAY * MARK_WIDTH;
const TOTAL_DAYS = 31;

type TickSize = 'major' | 'medium' | 'regular' | 'sub';

const TICK: Record<TickSize, { h: number; w: number; c: string }> = {
  major:   { h: 30, w: 2.5, c: '#3C3C43' },
  medium:  { h: 22, w: 2,   c: '#8E8E93' },
  regular: { h: 14, w: 1.5, c: '#AEAEB2' },
  sub:     { h: 8,  w: 1,   c: '#D1D1D6' },
};

function buildMarks(): TickSize[] {
  const out: TickSize[] = [];
  for (let d = 1; d <= TOTAL_DAYS; d++) {
    out.push(
      d === 1 || d % 10 === 0
        ? 'major'
        : d % 5 === 0
          ? 'medium'
          : 'regular',
    );
    if (d < TOTAL_DAYS) {
      for (let s = 0; s < MARKS_PER_DAY - 1; s++) out.push('sub');
    }
  }
  return out;
}

const MARKS = buildMarks();

interface Props {
  value: number;
  onChange: (day: number) => void;
}

export function DayRulerPicker({ value, onChange }: Props) {
  const prevDay = useRef(value);
  const [halfWidth, setHalfWidth] = useState(0);

  const handleLayout = useCallback((e: any) => {
    setHalfWidth(e.nativeEvent.layout.width / 2);
  }, []);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const day = Math.round(x / DAY_SPACING) + 1;
      const clamped = Math.max(1, Math.min(TOTAL_DAYS, day));
      if (clamped !== prevDay.current) {
        prevDay.current = clamped;
        onChange(clamped);
        haptic.selection();
      }
    },
    [onChange],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.dayNumber}>{value}</Text>
      <Text style={styles.dayLabel}>día de renovación</Text>

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
              contentOffset={{ x: (value - 1) * DAY_SPACING, y: 0 }}
              contentContainerStyle={{
                paddingHorizontal: halfWidth,
                alignItems: 'flex-end',
              }}
            >
              {MARKS.map((size, i) => {
                const t = TICK[size];
                return (
                  <View key={i} style={{ width: MARK_WIDTH, alignItems: 'center' }}>
                    <View
                      style={{
                        width: t.w,
                        height: t.h,
                        backgroundColor: t.c,
                        borderRadius: t.w / 2,
                      }}
                    />
                  </View>
                );
              })}
            </ScrollView>

            <View style={styles.indicatorWrap} pointerEvents="none">
              <View style={styles.indicator} />
            </View>
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
  dayLabel: {
    ...fontFamily.regular,
    fontSize: fontSize[15],
    color: '#8E8E93',
    marginTop: 2,
    marginBottom: 28,
  },
  rulerWrap: {
    width: '100%',
    height: 44,
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
});
