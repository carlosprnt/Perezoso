// Slide 3 hero — animated calendar that cross-fades between two months.
// Header numbers (total spend + renewal count) interpolate smoothly,
// month name slides sideways, and the grid swaps with a brief opacity
// transition. Only runs while the slide is in view.

import React, { useEffect } from 'react';
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
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { useTheme } from '../../../design/useTheme';
import { fontFamily, fontSize } from '../../../design/typography';
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
const CELL_W = (INNER_W - CELL_GAP * 6) / 7;

const MAX_ROT_DEG = 22;
const MAX_BLUR_INTENSITY = 38;

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// Cycle: show A → transition → show B → transition → repeat.
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
  today: 7,
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

interface Props {
  parallax: SharedValue<number>;
}

export function CalendarHero({ parallax }: Props) {
  // phase: 0→1 over CYCLE_MS, repeating.
  // 0.00–0.43 = month A visible
  // 0.43–0.50 = cross-fade A→B
  // 0.50–0.93 = month B visible
  // 0.93–1.00 = cross-fade B→A
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

  // Month A visibility: 1 during first half, fading at edges.
  const monthAStyle = useAnimatedStyle(() => {
    const p = phase.value;
    const opacity = interpolate(
      p,
      [0, 0.43, 0.50, 0.93, 1.0],
      [1, 1, 0, 0, 1],
      Extrapolation.CLAMP,
    );
    const tx = interpolate(
      p,
      [0, 0.43, 0.50, 0.93, 1.0],
      [0, 0, -16, -16, 0],
      Extrapolation.CLAMP,
    );
    return { opacity, transform: [{ translateX: tx }] };
  });

  const monthBStyle = useAnimatedStyle(() => {
    const p = phase.value;
    const opacity = interpolate(
      p,
      [0, 0.43, 0.50, 0.93, 1.0],
      [0, 0, 1, 1, 0],
      Extrapolation.CLAMP,
    );
    const tx = interpolate(
      p,
      [0, 0.43, 0.50, 0.93, 1.0],
      [16, 16, 0, 0, 16],
      Extrapolation.CLAMP,
    );
    return { opacity, transform: [{ translateX: tx }] };
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
        {/* Header — month name + totals cross-fade */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.monthNameWrap}>
              <Animated.Text
                style={[styles.monthName, { color: colors.textPrimary }, monthAStyle]}
              >
                {MONTH_A.name}
              </Animated.Text>
              <Animated.Text
                style={[
                  styles.monthName,
                  styles.monthNameAbs,
                  { color: colors.textPrimary },
                  monthBStyle,
                ]}
              >
                {MONTH_B.name}
              </Animated.Text>
            </View>
            <View style={styles.subWrap}>
              <Animated.View style={[styles.subRow, monthAStyle]}>
                <Text style={[styles.subText, { color: colors.textMuted }]}>
                  {MONTH_A.total} total
                </Text>
                <View style={[styles.subDot, { backgroundColor: colors.borderLight }]} />
                <Text style={[styles.subText, { color: colors.textMuted }]}>
                  {MONTH_A.renewalCount} renovaciones
                </Text>
              </Animated.View>
              <Animated.View style={[styles.subRow, styles.subRowAbs, monthBStyle]}>
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
            <View style={[styles.navBtn, { borderColor: colors.borderLight }]}>
              <ChevronLeft size={14} color={colors.textMuted} strokeWidth={2.4} />
            </View>
            <View style={[styles.navBtn, { borderColor: colors.borderLight }]}>
              <ChevronRight size={14} color={colors.textMuted} strokeWidth={2.4} />
            </View>
          </View>
        </View>

        {/* Weekday labels (static) */}
        <View style={styles.weekRow}>
          {WEEKDAYS.map((w) => (
            <Text key={w} style={[styles.weekday, { color: colors.textMuted }]}>
              {w}
            </Text>
          ))}
        </View>

        {/* Grids — cross-fade */}
        <View style={styles.gridWrap}>
          <Animated.View style={monthAStyle}>
            <MonthGrid month={MONTH_A} colors={colors} />
          </Animated.View>
          <Animated.View style={[styles.gridAbs, monthBStyle]}>
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

  const cells: (number | null)[] = [];
  for (let i = 0; i < month.firstWeekdayIndex; i++) cells.push(null);
  for (let d = 1; d <= month.daysInMonth; d++) cells.push(d);
  const visible = cells.slice(0, 35);

  return (
    <View style={styles.grid}>
      {visible.map((d, i) => {
        if (d === null) return <View key={`e${i}`} style={styles.cell} />;
        const isToday = d === month.today;
        const renewal = renewalsByDay.get(d);
        return (
          <View
            key={d}
            style={[
              styles.cell,
              styles.dayCell,
              { backgroundColor: colors.borderLight },
              isToday && styles.todayCell,
            ]}
          >
            <Text
              style={[
                styles.dayNumber,
                { color: colors.textMuted },
                isToday && { color: '#2563EB' },
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
  },
  monthName: {
    ...fontFamily.extrabold,
    fontSize: 24,
    letterSpacing: -0.3,
  },
  monthNameAbs: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  subWrap: {
    position: 'relative',
    height: 16,
    marginTop: 4,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subRowAbs: {
    position: 'absolute',
    top: 0,
    left: 0,
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
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
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
    flex: 1,
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
    width: CELL_W,
    aspectRatio: 0.8,
  },
  dayCell: {
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
