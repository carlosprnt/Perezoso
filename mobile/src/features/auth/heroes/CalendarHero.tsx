// Slide 3 hero — animated calendar that cross-fades between two months.
// Month name slides horizontally, totals slide vertically (slot-machine
// feel), and the day grid cross-fades. Only runs while visible.

import React from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { useTheme } from '../../../design/useTheme';
import { fontFamily } from '../../../design/typography';
import { radius } from '../../../design/radius';
import { shadows } from '../../../design/shadows';
import { logoUrlFromDomain } from '../../../lib/constants/platforms';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

const { width: SCREEN_W } = Dimensions.get('window');
const SIDE_MARGIN = 20;
const CARD_W = SCREEN_W - SIDE_MARGIN * 2;
const CARD_H = 480;
const CELL_GAP = 4;
const GRID_PAD = 14;
const INNER_W = CARD_W - GRID_PAD * 2;
const CELL_SIZE = (INNER_W - CELL_GAP * 6) / 7;

const LOGO_SIZE = Math.min(24, CELL_SIZE * 0.52);

const MAX_ROT_DEG = 22;
const MAX_BLUR_INTENSITY = 38;

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const HOLD_MS = 3000;
const FADE_MS = 500;
const CYCLE_MS = (HOLD_MS + FADE_MS) * 2;

interface MonthData {
  name: string;
  total: string;
  renewalCount: number;
  daysInMonth: number;
  firstWeekdayIndex: number;
  today: number | null;
  renewals: { day: number; domain: string; stackCount?: number }[];
}

const MONTH_A: MonthData = {
  name: 'Abril',
  total: '476,58€',
  renewalCount: 11,
  daysInMonth: 30,
  firstWeekdayIndex: 2,
  today: 21,
  renewals: [
    { day: 5, domain: 'netflix.com', stackCount: 6 },
    { day: 10, domain: 'notion.so' },
    { day: 16, domain: 'disneyplus.com' },
    { day: 22, domain: 'spotify.com' },
  ],
};

const MONTH_B: MonthData = {
  name: 'Mayo',
  total: '398,42€',
  renewalCount: 8,
  daysInMonth: 31,
  firstWeekdayIndex: 3,
  today: null,
  renewals: [
    { day: 3, domain: 'spotify.com' },
    { day: 12, domain: 'netflix.com', stackCount: 3 },
    { day: 20, domain: 'amazon.com' },
    { day: 28, domain: 'disneyplus.com' },
  ],
};

function buildCells(month: MonthData): (number | null)[] {
  const cells: (number | null)[] = [];
  for (let i = 0; i < month.firstWeekdayIndex; i++) cells.push(null);
  for (let d = 1; d <= month.daysInMonth; d++) cells.push(d);
  // Pad trailing to complete the last week (fill to Sunday).
  while (cells.length % 7 !== 0) cells.push(null);
  // Cap at 35 cells (5 weeks) to fit the card.
  return cells.slice(0, 35);
}

interface Props {
  parallax: SharedValue<number>;
}

export function CalendarHero({ parallax }: Props) {
  const phase = useSharedValue(0);

  useAnimatedReaction(
    () => Math.abs(parallax.value) < 0.5,
    (active, wasActive) => {
      if (active && !wasActive) {
        phase.value = 0;
        phase.value = withRepeat(
          withTiming(1, { duration: CYCLE_MS, easing: Easing.linear }),
          -1,
          false,
        );
      } else if (!active && wasActive) {
        phase.value = 0;
      }
    },
  );

  const wrapStyle = useAnimatedStyle(() => {
    const p = parallax.value;
    const abs = Math.abs(p);
    return {
      opacity: interpolate(abs, [0, 0.8, 1], [1, 0.4, 0], Extrapolation.CLAMP),
      transform: [
        { perspective: 1200 },
        { translateX: p * 40 },
        { rotateY: `${p * MAX_ROT_DEG}deg` },
        { scale: interpolate(abs, [0, 1], [1, 0.94], Extrapolation.CLAMP) },
      ],
    };
  });

  const blurProps = useAnimatedProps(() => ({
    intensity: Math.abs(parallax.value) * MAX_BLUR_INTENSITY,
  }));

  // Month name — horizontal slide.
  const nameAStyle = useAnimatedStyle(() => {
    const p = phase.value;
    return {
      opacity: interpolate(p, [0, 0.43, 0.50, 0.93, 1.0], [1, 1, 0, 0, 1], Extrapolation.CLAMP),
      transform: [{
        translateX: interpolate(p, [0, 0.43, 0.50, 0.93, 1.0], [0, 0, -20, -20, 0], Extrapolation.CLAMP),
      }],
    };
  });
  const nameBStyle = useAnimatedStyle(() => {
    const p = phase.value;
    return {
      opacity: interpolate(p, [0, 0.43, 0.50, 0.93, 1.0], [0, 0, 1, 1, 0], Extrapolation.CLAMP),
      transform: [{
        translateX: interpolate(p, [0, 0.43, 0.50, 0.93, 1.0], [20, 20, 0, 0, 20], Extrapolation.CLAMP),
      }],
    };
  });

  // Totals — vertical slot-machine slide.
  const totalAStyle = useAnimatedStyle(() => {
    const p = phase.value;
    return {
      opacity: interpolate(p, [0, 0.43, 0.50, 0.93, 1.0], [1, 1, 0, 0, 1], Extrapolation.CLAMP),
      transform: [{
        translateY: interpolate(p, [0, 0.43, 0.50, 0.93, 1.0], [0, 0, -14, -14, 0], Extrapolation.CLAMP),
      }],
    };
  });
  const totalBStyle = useAnimatedStyle(() => {
    const p = phase.value;
    return {
      opacity: interpolate(p, [0, 0.43, 0.50, 0.93, 1.0], [0, 0, 1, 1, 0], Extrapolation.CLAMP),
      transform: [{
        translateY: interpolate(p, [0, 0.43, 0.50, 0.93, 1.0], [14, 14, 0, 0, 14], Extrapolation.CLAMP),
      }],
    };
  });

  // Grid — simple opacity cross-fade.
  const gridAStyle = useAnimatedStyle(() => {
    const p = phase.value;
    return {
      opacity: interpolate(p, [0, 0.43, 0.50, 0.93, 1.0], [1, 1, 0, 0, 1], Extrapolation.CLAMP),
    };
  });
  const gridBStyle = useAnimatedStyle(() => {
    const p = phase.value;
    return {
      opacity: interpolate(p, [0, 0.43, 0.50, 0.93, 1.0], [0, 0, 1, 1, 0], Extrapolation.CLAMP),
    };
  });

  const { colors } = useTheme();

  return (
    <Animated.View style={[styles.root, wrapStyle]}>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.borderLight },
        ]}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.monthNameWrap}>
              <Animated.Text style={[styles.monthName, { color: colors.textPrimary }, nameAStyle]}>
                {MONTH_A.name}
              </Animated.Text>
              <Animated.Text style={[styles.monthName, styles.abs, { color: colors.textPrimary }, nameBStyle]}>
                {MONTH_B.name}
              </Animated.Text>
            </View>
            <View style={styles.subWrap}>
              <Animated.View style={[styles.subRow, totalAStyle]}>
                <Text style={[styles.subText, { color: colors.textMuted }]}>
                  {MONTH_A.total} total
                </Text>
                <View style={[styles.subDot, { backgroundColor: colors.borderLight }]} />
                <Text style={[styles.subText, { color: colors.textMuted }]}>
                  {MONTH_A.renewalCount} renovaciones
                </Text>
              </Animated.View>
              <Animated.View style={[styles.subRow, styles.abs, totalBStyle]}>
                <Text style={[styles.subText, { color: colors.textMuted }]}>
                  {MONTH_B.total} total
                </Text>
                <View style={[styles.subDot, { backgroundColor: colors.borderLight }]} />
                <Text style={[styles.subText, { color: colors.textMuted }]}>
                  {MONTH_B.renewalCount} renovaciones
                </Text>
              </Animated.View>
            </View>
          </View>
          <View style={styles.navBtns}>
            <View style={[styles.navBtn, { backgroundColor: colors.borderLight }]}>
              <ChevronLeft size={14} color={colors.textMuted} strokeWidth={2.4} />
            </View>
            <View style={[styles.navBtn, { backgroundColor: colors.borderLight }]}>
              <ChevronRight size={14} color={colors.textMuted} strokeWidth={2.4} />
            </View>
          </View>
        </View>

        {/* Weekday labels */}
        <View style={styles.weekRow}>
          {WEEKDAYS.map((w) => (
            <Text key={w} style={[styles.weekday, { color: colors.textMuted }]}>
              {w}
            </Text>
          ))}
        </View>

        {/* Grids */}
        <View style={styles.gridWrap}>
          <Animated.View style={gridAStyle}>
            <MonthGrid month={MONTH_A} colors={colors} />
          </Animated.View>
          <Animated.View style={[styles.gridAbs, gridBStyle]}>
            <MonthGrid month={MONTH_B} colors={colors} />
          </Animated.View>
        </View>
      </View>

      <AnimatedBlurView
        tint="default"
        intensity={0}
        animatedProps={blurProps}
        style={styles.blurOverlay}
        pointerEvents="none"
      />
    </Animated.View>
  );
}

function MonthGrid({
  month,
  colors,
}: {
  month: MonthData;
  colors: Record<string, string>;
}) {
  const renewalsByDay = new Map<number, { domain: string; stackCount?: number }>();
  month.renewals.forEach((r) => renewalsByDay.set(r.day, r));
  const cells = buildCells(month);

  return (
    <View style={styles.grid}>
      {cells.map((d, i) => {
        const isToday = d === month.today;
        const renewal = d ? renewalsByDay.get(d) : undefined;
        return (
          <View
            key={i}
            style={[
              styles.cell,
              { backgroundColor: d ? colors.borderLight : colors.background },
              isToday && styles.todayCell,
            ]}
          >
            {d !== null && (
              <>
                <Text
                  style={[
                    styles.dayNumber,
                    { color: colors.textMuted },
                    isToday && { color: colors.textPrimary, ...fontFamily.bold },
                    renewal && { ...fontFamily.bold },
                  ]}
                >
                  {d}
                </Text>
                {renewal && (
                  <View style={styles.logoWrap}>
                    <Image
                      source={{ uri: logoUrlFromDomain(renewal.domain) }}
                      style={styles.logoImg}
                      resizeMode="contain"
                    />
                    {renewal.stackCount ? (
                      <View style={[styles.stackBadge, { backgroundColor: colors.borderLight }]}>
                        <Text style={[styles.stackBadgeText, { color: colors.textMuted }]}>
                          +{renewal.stackCount}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                )}
              </>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 100,
    left: SIDE_MARGIN,
    width: CARD_W,
    height: CARD_H,
    borderRadius: radius['2xl'],
    overflow: 'hidden',
  },
  card: {
    flex: 1,
    borderRadius: radius['2xl'],
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    paddingHorizontal: GRID_PAD,
    paddingTop: 18,
    ...shadows.cardMd,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: {
    flex: 1,
  },
  monthNameWrap: {
    position: 'relative',
    height: 30,
    overflow: 'hidden',
  },
  monthName: {
    ...fontFamily.extrabold,
    fontSize: 24,
    letterSpacing: -0.3,
  },
  abs: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  subWrap: {
    position: 'relative',
    height: 16,
    marginTop: 4,
    overflow: 'hidden',
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subText: {
    ...fontFamily.regular,
    fontSize: 10,
  },
  subDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  navBtns: {
    flexDirection: 'row',
    gap: 6,
  },
  navBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
    width: CELL_SIZE,
    textAlign: 'center',
  },
  gridWrap: {
    position: 'relative',
    flex: 1,
  },
  gridAbs: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CELL_GAP,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 8,
    padding: 4,
  },
  todayCell: {
    borderWidth: 1.5,
    borderColor: '#000000',
    backgroundColor: 'transparent',
  },
  dayNumber: {
    ...fontFamily.medium,
    fontSize: 9.5,
  },
  logoWrap: {
    marginTop: 'auto',
    alignItems: 'center',
    position: 'relative',
  },
  logoImg: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: 5,
  },
  stackBadge: {
    position: 'absolute',
    bottom: -6,
    borderRadius: 4,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  stackBadgeText: {
    ...fontFamily.semibold,
    fontSize: 7,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius['2xl'],
  },
});
