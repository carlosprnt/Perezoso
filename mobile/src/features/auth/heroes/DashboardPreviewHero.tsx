// Slide 5 hero — dashboard preview that loads from a shimmer skeleton.
// Replicates the real SummaryHero + InsightCards layout.
// Skeleton holds 2s → content fades in with numbers counting up
// over 3s → holds 1s → resets. Loops while visible (6s cycle).

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
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { TrendingUp, Users, Bot } from 'lucide-react-native';

import { useTheme } from '../../../design/useTheme';
import { fontFamily, fontSize, lineHeight, letterSpacing } from '../../../design/typography';
import { radius } from '../../../design/radius';
import { shadows } from '../../../design/shadows';
import { Skeleton } from '../../../components/Skeleton';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const { width: SCREEN_W } = Dimensions.get('window');
const SIDE_MARGIN = 20;
const CARD_W = SCREEN_W - SIDE_MARGIN * 2;
const CARD_H = 480;

const MAX_ROT_DEG = 22;
const MAX_BLUR_INTENSITY = 38;

const MONTHLY = 148.33;
const YEARLY = 1779.96;

const SKELETON_HOLD = 2000;
const SKELETON_FADE = 500;
const COUNT_DUR = 3000;
const HOLD_DUR = 6000;
const CYCLE_MS = SKELETON_HOLD + COUNT_DUR + HOLD_DUR;

function formatEur(val: number): string {
  'worklet';
  const fixed = val.toFixed(2);
  const dotIdx = fixed.indexOf('.');
  const intStr = fixed.substring(0, dotIdx);
  const decStr = fixed.substring(dotIdx + 1);
  let formatted = '';
  for (let i = intStr.length - 1, count = 0; i >= 0; i--, count++) {
    if (count > 0 && count % 3 === 0) formatted = '.' + formatted;
    formatted = intStr[i] + formatted;
  }
  return formatted + ',' + decStr + '€';
}

interface Props {
  parallax: SharedValue<number>;
}

export function DashboardPreviewHero({ parallax }: Props) {
  const skeleton = useSharedValue(1);
  const countProgress = useSharedValue(0);
  const clock = useSharedValue(0);

  const runCycle = () => {
    'worklet';
    skeleton.value = 1;
    countProgress.value = 0;

    skeleton.value = withDelay(
      SKELETON_HOLD,
      withTiming(0, { duration: SKELETON_FADE, easing: Easing.out(Easing.cubic) }),
    );
    countProgress.value = withDelay(
      SKELETON_HOLD,
      withTiming(1, { duration: COUNT_DUR, easing: Easing.out(Easing.cubic) }),
    );
  };

  useAnimatedReaction(
    () => Math.abs(parallax.value) < 0.5,
    (active, wasActive) => {
      if (active && !wasActive) {
        runCycle();
        clock.value = 0;
        clock.value = withRepeat(
          withSequence(
            withTiming(1, { duration: CYCLE_MS }),
            withTiming(0, { duration: 0 }),
          ),
          -1,
          false,
        );
      } else if (!active && wasActive) {
        skeleton.value = 1;
        countProgress.value = 0;
        clock.value = 0;
      }
    },
  );

  useAnimatedReaction(
    () => clock.value,
    (v, prev) => {
      if (prev !== null && prev > 0.5 && v < 0.1) {
        runCycle();
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

  const skeletonStyle = useAnimatedStyle(() => ({
    opacity: skeleton.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: 1 - skeleton.value,
  }));

  const monthlyProps = useAnimatedProps(() => {
    const val = countProgress.value * MONTHLY;
    return { text: formatEur(val) } as any;
  });

  const yearlyProps = useAnimatedProps(() => {
    const val = countProgress.value * YEARLY;
    return { text: formatEur(val) } as any;
  });

  const { colors, isDark } = useTheme();
  const labelColor = isDark ? '#8E8E93' : '#616161';
  const iconBg = isDark ? '#2C2C2E' : '#F5F5F5';
  const iconColor = isDark ? '#F2F2F7' : '#000000';
  const catIconBg = isDark ? '#2C2C2E' : '#DDD6FE';
  const catIconColor = isDark ? '#F2F2F7' : '#4C1D95';

  return (
    <Animated.View style={[styles.root, wrapStyle]}>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.borderLight },
        ]}
      >
        {/* Skeleton layer — uses real Skeleton component with shimmer */}
        <Animated.View style={[styles.absLayer, skeletonStyle]}>
          {/* Greeting row */}
          <View style={styles.skelGreetingRow}>
            <Skeleton style={{ width: 130, height: 20 }} borderRadius={6} />
            <Skeleton style={{ width: 36, height: 36 }} borderRadius={18} />
          </View>
          {/* Label + amount 1 */}
          <Skeleton style={{ width: 110, height: 20, marginBottom: 6 }} borderRadius={6} />
          <Skeleton style={{ width: 200, height: 40, marginBottom: 8 }} borderRadius={8} />
          {/* Label + amount 2 */}
          <Skeleton style={{ width: 110, height: 20, marginBottom: 6 }} borderRadius={6} />
          <Skeleton style={{ width: 230, height: 40, marginBottom: 12 }} borderRadius={8} />
          {/* Supporting text */}
          <Skeleton style={{ width: 180, height: 14, marginBottom: 14 }} borderRadius={6} />
          {/* Insight cards */}
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} style={styles.skelCell} borderRadius={14} />
          ))}
        </Animated.View>

        {/* Real content layer */}
        <Animated.View style={[styles.absLayer, contentStyle]}>
          {/* Greeting + avatar */}
          <View style={styles.greetingRow}>
            <Text style={[styles.greeting, { color: colors.textPrimary }]}>
              Hola, Perezoso.
            </Text>
            <Image
              source={require('../../../../assets/logo.png')}
              style={styles.avatar}
              resizeMode="cover"
            />
          </View>

          {/* Monthly */}
          <Text style={[styles.heroLabel, { color: labelColor }]}>
            Al mes gastas
          </Text>
          <AnimatedTextInput
            editable={false}
            defaultValue="0,00€"
            animatedProps={monthlyProps}
            style={[styles.heroAmount, { color: colors.textPrimary }]}
            pointerEvents="none"
            underlineColorAndroid="transparent"
          />

          {/* Annual */}
          <Text style={[styles.heroLabel, styles.heroLabelSecond, { color: labelColor }]}>
            Eso al año es
          </Text>
          <AnimatedTextInput
            editable={false}
            defaultValue="0,00€"
            animatedProps={yearlyProps}
            style={[styles.heroAmount, { color: colors.textPrimary }]}
            pointerEvents="none"
            underlineColorAndroid="transparent"
          />

          {/* Supporting text */}
          <Text style={[styles.supportText, { color: colors.textPrimary }]}>
            Tienes <Text style={styles.supportBold}>11</Text> suscripciones.
          </Text>

          {/* Insight cards */}
          <View style={styles.insightList}>
            <View style={[styles.insightCell, { backgroundColor: colors.background }]}>
              <View style={[styles.insightIcon, { backgroundColor: colors.surface }]}>
                <TrendingUp size={18} strokeWidth={2} color={iconColor} />
              </View>
              <View style={styles.insightInfo}>
                <Text style={[styles.insightLabel, { color: colors.textMuted }]}>Mayor gasto</Text>
                <Text style={[styles.insightTitle, { color: colors.textPrimary }]}>Amazon Prime</Text>
              </View>
              <View style={styles.insightRight}>
                <Text style={[styles.insightRightTop, { color: colors.textPrimary }]}>30,00€</Text>
                <Text style={[styles.insightRightBot, { color: colors.textMuted }]}>Otros</Text>
              </View>
            </View>

            <View style={[styles.insightCell, { backgroundColor: colors.background }]}>
              <View style={[styles.insightIcon, { backgroundColor: catIconBg }]}>
                <Bot size={18} strokeWidth={2} color={catIconColor} />
              </View>
              <View style={styles.insightInfo}>
                <Text style={[styles.insightLabel, { color: colors.textMuted }]}>Categoría principal</Text>
                <Text style={[styles.insightTitle, { color: colors.textPrimary }]}>Otros</Text>
              </View>
              <View style={styles.insightRight}>
                <Text style={[styles.insightRightTop, { color: colors.textPrimary }]}>53,00€</Text>
                <Text style={[styles.insightRightBot, { color: colors.textMuted }]}>2 suscr.</Text>
              </View>
            </View>

            <View style={[styles.insightCell, { backgroundColor: colors.background }]}>
              <View style={[styles.insightIcon, { backgroundColor: colors.surface }]}>
                <Users size={18} strokeWidth={2} color={iconColor} />
              </View>
              <View style={styles.insightInfo}>
                <Text style={[styles.insightLabel, { color: colors.textMuted }]}>Planes compartidos</Text>
                <Text style={[styles.insightTitle, { color: colors.textPrimary }]}>1 plan</Text>
              </View>
              <View style={styles.insightRight}>
                <Text style={[styles.insightRightTop, { color: colors.textPrimary }]}>8,33€</Text>
                <Text style={[styles.insightRightBot, { color: colors.textMuted }]}>/mes</Text>
              </View>
            </View>
          </View>
        </Animated.View>
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

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 100,
    left: SIDE_MARGIN,
    width: CARD_W,
    height: CARD_H,
    borderRadius: radius['2xl'] * 2,
    overflow: 'hidden',
  },
  card: {
    flex: 1,
    borderRadius: radius['2xl'] * 2,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingTop: 22,
    ...shadows.cardMd,
  },
  absLayer: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 20,
    paddingTop: 22,
  },

  // Skeleton
  skelGreetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  skelCell: {
    height: 52,
    marginBottom: 6,
  },

  // Content
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greeting: {
    ...fontFamily.medium,
    fontSize: fontSize[18],
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  heroLabel: {
    ...fontFamily.medium,
    fontSize: 22,
    lineHeight: 22 * lineHeight.compact,
    letterSpacing: letterSpacing.tight,
  },
  heroLabelSecond: {
    marginTop: 8,
  },
  heroAmount: {
    ...fontFamily.medium,
    fontSize: 42,
    lineHeight: 42 * lineHeight.compact,
    letterSpacing: letterSpacing.tight,
    padding: 0,
    margin: 0,
    height: 50,
    width: '100%',
  },
  supportText: {
    ...fontFamily.medium,
    fontSize: fontSize[15],
    lineHeight: fontSize[15] * lineHeight.normal,
    marginTop: 8,
    marginBottom: 12,
  },
  supportBold: {
    ...fontFamily.medium,
  },

  // Insight cards
  insightList: {
    gap: 6,
  },
  insightCell: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  insightIcon: {
    width: 36,
    height: 36,
    borderRadius: radius['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightInfo: {
    flex: 1,
    minWidth: 0,
  },
  insightLabel: {
    ...fontFamily.regular,
    fontSize: fontSize[11],
    lineHeight: fontSize[11] * lineHeight.snug,
    marginBottom: 1,
  },
  insightTitle: {
    ...fontFamily.medium,
    fontSize: fontSize[15],
    lineHeight: fontSize[15] * lineHeight.snug,
  },
  insightRight: {
    alignItems: 'flex-end',
  },
  insightRightTop: {
    ...fontFamily.medium,
    fontSize: fontSize[13],
    lineHeight: fontSize[13] * lineHeight.snug,
  },
  insightRightBot: {
    ...fontFamily.regular,
    fontSize: fontSize[11],
    lineHeight: fontSize[11] * lineHeight.snug,
    marginTop: 1,
  },

  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius['2xl'] * 2,
  },
});
