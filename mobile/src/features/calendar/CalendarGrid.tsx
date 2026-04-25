// 7-column, Monday-first grid that renders a full month. Pads with
// null cells before day 1 and after the last day so rows stay fully
// 7-wide — matching the web calendar.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../design/useTheme';
import { fontFamily } from '../../design/typography';
import { CalendarDayCell } from './CalendarDayCell';
import {
  WEEKDAYS_ES,
  getDaysInMonth,
  getFirstDayOfWeek,
} from './dateHelpers';
import type { Subscription } from '../subscriptions/types';

interface Props {
  year: number;
  month: number;
  today: Date;
  dayMap: Record<number, Subscription[]>;
  onDayPress?: (day: number, subs: Subscription[]) => void;
}

export function CalendarGrid({ year, month, today, dayMap, onDayPress }: Props) {
  const { isDark } = useTheme();

  const firstOffset  = getFirstDayOfWeek(year, month);
  const daysInMonth  = getDaysInMonth(year, month);

  // Build cells array and pad to complete 7-day rows.
  const cells: (number | null)[] = [
    ...Array(firstOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  // Split into weeks so we can use a flexbox row layout (RN has no
  // CSS grid). Each row gets a 5px bottom gap; columns get a 5px right gap.
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  const weekdayColor = isDark ? '#8E8E93' : '#A0A0A0';

  const sameMonth =
    year === today.getFullYear() && month === today.getMonth();

  return (
    <View style={styles.container}>
      {/* Weekday header */}
      <View style={styles.weekRow}>
        {WEEKDAYS_ES.map((w) => (
          <View key={w} style={styles.weekCell}>
            <Text
              style={[
                styles.weekLabel,
                { color: weekdayColor, ...fontFamily.regular },
              ]}
            >
              {w}
            </Text>
          </View>
        ))}
      </View>

      {/* Day cells — rows and columns flex so the grid fills whatever
          vertical space the parent gives us. */}
      <View style={styles.grid}>
        {weeks.map((row, weekIdx) => (
          <View
            key={weekIdx}
            style={[
              styles.dayRow,
              weekIdx < weeks.length - 1 ? { marginBottom: 5 } : null,
            ]}
          >
            {row.map((day, colIdx) => {
              const isToday = sameMonth && day === today.getDate();
              const subs    = day !== null ? (dayMap[day] ?? []) : [];
              return (
                <View
                  key={`${weekIdx}-${colIdx}`}
                  style={[
                    styles.dayColWrap,
                    colIdx < 6 ? { marginRight: 5 } : null,
                  ]}
                >
                  <CalendarDayCell
                    day={day}
                    isToday={isToday}
                    subs={subs}
                    onPress={onDayPress}
                  />
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekLabel: {
    fontSize: 11,
    letterSpacing: 0.4,
  },
  grid: {
    flex: 1,
  },
  dayRow: {
    flexDirection: 'row',
    flex: 1,
  },
  dayColWrap: {
    flex: 1,
  },
});
