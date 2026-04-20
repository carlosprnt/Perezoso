// Slide 3 hero — month calendar mockup matching the web app's
// calendar grid: labeled header with total spend and renewal count,
// weekday row, and days rendered as rounded tiles with platform
// logos dropped into the days that have renewals.

import React from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { fontFamily } from '../../../design/typography';
import { shadows } from '../../../design/shadows';
import { logoUrlFromDomain } from '../../../lib/constants/platforms';
import { MOCK_CALENDAR } from '../constants';
import { PhoneFrame } from './PhoneFrame';

const CELL_GAP = 4;
// Frame content width = screen − 2*32 margin − 2*10 padding
const INNER_W = Dimensions.get('window').width - 64 - 20;
const CELL_W = (INNER_W - CELL_GAP * 6) / 7;

interface Props {
  parallax: SharedValue<number>;
}

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function CalendarHero({ parallax }: Props) {
  const heroStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: parallax.value * 22 },
      {
        scale: interpolate(
          Math.abs(parallax.value),
          [0, 1],
          [1, 0.96],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const renewalsByDay = new Map<number, { domain: string; stackCount?: number }>();
  MOCK_CALENDAR.renewals.forEach((r) => renewalsByDay.set(r.day, r));

  // Pad leading blanks for the first week.
  const cells: (number | null)[] = [];
  for (let i = 0; i < MOCK_CALENDAR.firstWeekdayIndex; i++) cells.push(null);
  for (let d = 1; d <= MOCK_CALENDAR.daysInMonth; d++) cells.push(d);
  // Only show first 4 weeks + partial (28 cells) so the phone frame
  // doesn't overflow vertically.
  const visibleCells = cells.slice(0, 35);

  return (
    <Animated.View style={[styles.root, heroStyle]}>
      <PhoneFrame>
        {/* Header ─────────────────────────── */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.monthName}>{MOCK_CALENDAR.monthName}</Text>
            <View style={styles.subRow}>
              <Text style={styles.subText}>{MOCK_CALENDAR.totalLabel}</Text>
              <View style={styles.subDot} />
              <Text style={styles.subText}>{MOCK_CALENDAR.renewalsLabel}</Text>
            </View>
          </View>
          <View style={styles.navBtns}>
            <View style={styles.navBtn}>
              <ChevronLeft size={14} color="#737373" strokeWidth={2.4} />
            </View>
            <View style={styles.navBtn}>
              <ChevronRight size={14} color="#737373" strokeWidth={2.4} />
            </View>
          </View>
        </View>

        {/* Weekday labels ──────────────────── */}
        <View style={styles.weekRow}>
          {WEEKDAYS.map((w) => (
            <Text key={w} style={styles.weekday}>{w}</Text>
          ))}
        </View>

        {/* Grid ───────────────────────────── */}
        <View style={styles.grid}>
          {visibleCells.map((d, i) => (
            <DayCell
              key={i}
              day={d}
              isToday={d === MOCK_CALENDAR.today}
              renewal={d ? renewalsByDay.get(d) : undefined}
            />
          ))}
        </View>
      </PhoneFrame>
    </Animated.View>
  );
}

function DayCell({
  day,
  isToday,
  renewal,
}: {
  day: number | null;
  isToday: boolean;
  renewal?: { domain: string; stackCount?: number };
}) {
  if (day === null) {
    return <View style={styles.cell} />;
  }
  return (
    <View
      style={[
        styles.cell,
        styles.dayCell,
        isToday && styles.todayCell,
      ]}
    >
      <Text
        style={[
          styles.dayNumber,
          isToday && { color: '#2563EB' },
          renewal && { ...fontFamily.bold },
        ]}
      >
        {day}
      </Text>
      {renewal && (
        <View style={styles.logoWrap}>
          <Image
            source={{ uri: logoUrlFromDomain(renewal.domain) }}
            style={styles.logoImg}
            resizeMode="contain"
          />
          {renewal.stackCount ? (
            <View style={styles.stackBadge}>
              <Text style={styles.stackBadgeText}>+{renewal.stackCount}</Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthName: {
    ...fontFamily.extrabold,
    fontSize: 24,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  subText: {
    ...fontFamily.regular,
    fontSize: 10,
    color: '#737373',
  },
  subDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#D4D4D4',
  },
  navBtns: {
    flexDirection: 'row',
    gap: 6,
  },
  navBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  weekRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekday: {
    ...fontFamily.medium,
    fontSize: 9.5,
    color: '#737373',
    flex: 1,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CELL_GAP,
  },
  cell: {
    width: CELL_W,
    aspectRatio: 0.8,
  },
  dayCell: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 4,
  },
  todayCell: {
    borderWidth: 1.2,
    borderColor: '#2563EB',
    backgroundColor: 'transparent',
  },
  dayNumber: {
    ...fontFamily.medium,
    fontSize: 9.5,
    color: '#737373',
  },
  logoWrap: {
    marginTop: 'auto',
    alignItems: 'center',
    position: 'relative',
  },
  logoImg: {
    width: 18,
    height: 18,
    borderRadius: 4,
  },
  stackBadge: {
    position: 'absolute',
    bottom: -6,
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  stackBadgeText: {
    ...fontFamily.semibold,
    fontSize: 7,
    color: '#737373',
  },
});
