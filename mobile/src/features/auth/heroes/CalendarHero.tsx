// Slide 3 hero — animated calendar that cross-fades between two months.
// Month name slides horizontally, totals count up/down in place,
// and the day grid cross-fades. Only runs while the slide is visible.

import React from 'react';
import { Dimensions, Image, StyleSheet, Text, TextInput, View } from 'react-native';
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
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const { width: SCREEN_W } = Dimensions.get('window');
const SIDE_MARGIN = 20;
const CARD_W = SCREEN_W - SIDE_MARGIN * 2;
const CARD_H = 480;
const GRID_PAD = 14;

const COL_GAP = 3;
const ROW_GAP = 3;
const CELL_H = 68;
const APPROX_CELL_W = (CARD_W - GRID_PAD * 2 - COL_GAP * 6) / 7;
const LOGO_SIZE = Math.min(28, APPROX_CELL_W * 0.62);

const MAX_ROT_DEG = 22;
const MAX_BLUR_INTENSITY = 38;

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const HOLD_MS = 3000;
const FADE_MS = 500;
const CYCLE_MS = (HOLD_MS + FADE_MS) * 2;

const TOTAL_A = 476.58;
const TOTAL_B = 398.42;
const RENEWALS_A = 11;
const RENEWALS_B = 8;

interface MonthData {
  name: string;
  daysInMonth: number;
  firstWeekdayIndex: number;
  today: number | null;
  renewals: { day: number; domain: string }[];
}

const MONTH_A: MonthData = {
  name: 'Abril',
  daysInMonth: 30,
  firstWeekdayIndex: 2,
  today: 21,
  renewals: [
    { day: 5, domain: 'netflix.com' },
    { day: 10, domain: 'notion.so' },
    { day: 16, domain: 'disneyplus.com' },
    { day: 22, domain: 'spotify.com' },
  ],
};

const MONTH_B: MonthData = {
  name: 'Mayo',
  daysInMonth: 31,
  firstWeekdayIndex: 3,
  today: null,
  renewals: [
    { day: 3, domain: 'spotify.com' },
    { day: 12, domain: 'netflix.com' },
    { day: 20, domain: 'amazon.com' },
    { day: 28, domain: 'disneyplus.com' },
  ],
};

function buildCells(month: MonthData): (number | null)[] {
  const cells: (number | null)[] = [];
  for (let i = 0; i < month.firstWeekdayIndex; i++) cells.push(null);
  for (let d = 1; d <= month.daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
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

  // Sequential: name slides (0.38–0.43) → numbers count (0.43–0.50)
  const nameAStyle = useAnimatedStyle(() => {
    const p = phase.value;
    return {
      opacity: interpolate(p, [0.38, 0.43, 0.93, 1.0], [1, 0, 0, 1], Extrapolation.CLAMP),
      transform: [{
        translateX: interpolate(
          p, [0.38, 0.43, 0.44, 0.93, 1.0], [0, -28, 28, 28, 0], Extrapolation.CLAMP,
        ),
      }],
    };
  });

  const nameBStyle = useAnimatedStyle(() => {
    const p = phase.value;
    return {
      opacity: interpolate(p, [0.38, 0.43, 0.88, 0.93], [0, 1, 1, 0], Extrapolation.CLAMP),
      transform: [{
        translateX: interpolate(
          p, [0.38, 0.43, 0.88, 0.93], [28, 0, 0, -28], Extrapolation.CLAMP,
        ),
      }],
    };
  });

  // Animated counting numbers (after name slides)
  const totalTextProps = useAnimatedProps(() => {
    const val = interpolate(
      phase.value,
      [0.43, 0.50, 0.93, 1.0],
      [TOTAL_A, TOTAL_B, TOTAL_B, TOTAL_A],
      Extrapolation.CLAMP,
    );
    return { text: val.toFixed(2).replace('.', ',') + '€' } as any;
  });

  const renewalTextProps = useAnimatedProps(() => {
    const val = interpolate(
      phase.value,
      [0.43, 0.50, 0.93, 1.0],
      [RENEWALS_A, RENEWALS_B, RENEWALS_B, RENEWALS_A],
      Extrapolation.CLAMP,
    );
    return { text: String(Math.round(val)) } as any;
  });

  // Grid cross-fades with numbers
  const gridAStyle = useAnimatedStyle(() => {
    const p = phase.value;
    return {
      opacity: interpolate(p, [0.43, 0.50, 0.93, 1.0], [1, 0, 0, 1], Extrapolation.CLAMP),
    };
  });

  const gridBStyle = useAnimatedStyle(() => {
    const p = phase.value;
    return {
      opacity: interpolate(p, [0.43, 0.50, 0.93, 1.0], [0, 1, 1, 0], Extrapolation.CLAMP),
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
              <Animated.Text
                style={[styles.monthName, { color: colors.textPrimary }, nameAStyle]}
              >
                {MONTH_A.name}
              </Animated.Text>
              <Animated.Text
                style={[styles.monthName, styles.abs, { color: colors.textPrimary }, nameBStyle]}
              >
                {MONTH_B.name}
              </Animated.Text>
            </View>
            <View style={styles.subRow}>
              <AnimatedTextInput
                editable={false}
                defaultValue={TOTAL_A.toFixed(2).replace('.', ',') + '€'}
                animatedProps={totalTextProps}
                style={[styles.subNumber, { color: colors.textSecondary }]}
                pointerEvents="none"
                underlineColorAndroid="transparent"
              />
              <Text style={[styles.subLabel, { color: colors.textSecondary }]}>
                {' total'}
              </Text>
              <View style={[styles.subDot, { backgroundColor: colors.textMuted }]} />
              <AnimatedTextInput
                editable={false}
                defaultValue={String(RENEWALS_A)}
                animatedProps={renewalTextProps}
                style={[styles.subNumberNarrow, { color: colors.textSecondary }]}
                pointerEvents="none"
                underlineColorAndroid="transparent"
              />
              <Text style={[styles.subLabel, { color: colors.textSecondary }]}>
                {' renovaciones'}
              </Text>
            </View>
          </View>
          <View style={styles.navBtns}>
            <View style={[styles.navBtn, { backgroundColor: colors.borderLight }]}>
              <ChevronLeft size={16} color={colors.textSecondary} strokeWidth={2.2} />
            </View>
            <View style={[styles.navBtn, { backgroundColor: colors.borderLight }]}>
              <ChevronRight size={16} color={colors.textSecondary} strokeWidth={2.2} />
            </View>
          </View>
        </View>

        {/* Weekday labels */}
        <View style={styles.weekRow}>
          {WEEKDAYS.map((w) => (
            <View key={w} style={styles.weekCell}>
              <Text style={[styles.weekday, { color: colors.textMuted }]}>{w}</Text>
            </View>
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
  const renewalsByDay = new Map<number, { domain: string }>();
  month.renewals.forEach((r) => renewalsByDay.set(r.day, r));
  const cells = buildCells(month);

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  return (
    <View style={styles.grid}>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.gridRow}>
          {row.map((d, ci) => {
            const isToday = d !== null && d === month.today;
            const renewal = d !== null ? renewalsByDay.get(d) : undefined;
            return (
              <View
                key={ci}
                style={[
                  styles.cell,
                  {
                    backgroundColor:
                      d !== null ? colors.borderLight : 'rgba(0,0,0,0.025)',
                  },
                  isToday && styles.todayCell,
                ]}
              >
                {d !== null && (
                  <>
                    <Text
                      style={[
                        styles.dayNumber,
                        { color: colors.textMuted },
                        isToday && {
                          color: colors.textPrimary,
                          ...fontFamily.bold,
                        },
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
                      </View>
                    )}
                  </>
                )}
              </View>
            );
          })}
        </View>
      ))}
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
    paddingTop: 20,
    ...shadows.cardMd,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  monthNameWrap: {
    position: 'relative',
    height: 34,
    overflow: 'hidden',
  },
  monthName: {
    ...fontFamily.semibold,
    fontSize: 28,
    letterSpacing: -0.3,
  },
  abs: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  subNumber: {
    ...fontFamily.medium,
    fontSize: 19,
    padding: 0,
    margin: 0,
    height: 24,
  },
  subNumberNarrow: {
    ...fontFamily.medium,
    fontSize: 19,
    padding: 0,
    margin: 0,
    height: 24,
    minWidth: 18,
  },
  subLabel: {
    ...fontFamily.medium,
    fontSize: 19,
  },
  subDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 8,
  },
  navBtns: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    gap: COL_GAP,
    marginBottom: 4,
  },
  weekCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekday: {
    ...fontFamily.medium,
    fontSize: 11,
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
    gap: ROW_GAP,
  },
  gridRow: {
    flexDirection: 'row',
    gap: COL_GAP,
  },
  cell: {
    flex: 1,
    height: CELL_H,
    borderRadius: 20,
    padding: 6,
  },
  todayCell: {
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  dayNumber: {
    ...fontFamily.medium,
    fontSize: 11,
  },
  logoWrap: {
    marginTop: 'auto',
    alignItems: 'center',
  },
  logoImg: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: 6,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius['2xl'],
  },
});
