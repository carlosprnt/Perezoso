// Slide 5 hero — dashboard preview that loads from a skeleton.
// Skeleton bars fade out, real content fades in, and the big
// total numbers count up from 0 to their final values.
// Only animates while the slide is visible.

import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { TextInput } from 'react-native';

import { useTheme } from '../../../design/useTheme';
import { fontFamily } from '../../../design/typography';
import { radius } from '../../../design/radius';
import { shadows } from '../../../design/shadows';

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
const ACTIVE_COUNT = 11;

const SKELETON_DUR = 800;
const COUNT_DUR = 1200;
const COUNT_DELAY = 600;

interface Props {
  parallax: SharedValue<number>;
}

export function DashboardPreviewHero({ parallax }: Props) {
  const skeleton = useSharedValue(1);
  const countProgress = useSharedValue(0);

  useAnimatedReaction(
    () => Math.abs(parallax.value) < 0.5,
    (active, wasActive) => {
      if (active && !wasActive) {
        skeleton.value = 1;
        countProgress.value = 0;

        skeleton.value = withTiming(0, {
          duration: SKELETON_DUR,
          easing: Easing.out(Easing.cubic),
        });
        countProgress.value = withDelay(
          COUNT_DELAY,
          withTiming(1, {
            duration: COUNT_DUR,
            easing: Easing.out(Easing.cubic),
          }),
        );
      } else if (!active && wasActive) {
        skeleton.value = 1;
        countProgress.value = 0;
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
    return { text: val.toFixed(2).replace('.', ',') + '€' } as any;
  });

  const yearlyProps = useAnimatedProps(() => {
    const val = countProgress.value * YEARLY;
    const formatted = val.toFixed(2).replace('.', ',');
    const parts = formatted.split(',');
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return { text: intPart + ',' + parts[1] + '€' } as any;
  });

  const countProps = useAnimatedProps(() => {
    const val = Math.round(countProgress.value * ACTIVE_COUNT);
    return { text: String(val) } as any;
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
        {/* Skeleton layer */}
        <Animated.View style={[styles.skeletonLayer, skeletonStyle]}>
          <View style={[styles.skelBar, styles.skelGreeting, { backgroundColor: colors.borderLight }]} />
          <View style={[styles.skelBar, styles.skelLabel, { backgroundColor: colors.borderLight }]} />
          <View style={[styles.skelBar, styles.skelBigNum, { backgroundColor: colors.borderLight }]} />
          <View style={[styles.skelBar, styles.skelLabel, { backgroundColor: colors.borderLight, marginTop: 28 }]} />
          <View style={[styles.skelBar, styles.skelBigNum, { backgroundColor: colors.borderLight }]} />
          <View style={styles.skelRow}>
            <View style={[styles.skelBar, styles.skelStat, { backgroundColor: colors.borderLight }]} />
            <View style={[styles.skelBar, styles.skelStat, { backgroundColor: colors.borderLight }]} />
          </View>
          <View style={styles.skelRow}>
            <View style={[styles.skelBar, styles.skelStat, { backgroundColor: colors.borderLight }]} />
            <View style={[styles.skelBar, styles.skelStat, { backgroundColor: colors.borderLight }]} />
          </View>
        </Animated.View>

        {/* Real content layer */}
        <Animated.View style={[styles.contentLayer, contentStyle]}>
          <Text style={[styles.greeting, { color: colors.textPrimary }]}>
            Hola, Carlos.
          </Text>

          <Text style={[styles.label, { color: colors.textMuted }]}>
            Al mes gastas
          </Text>
          <AnimatedTextInput
            editable={false}
            defaultValue="0,00€"
            animatedProps={monthlyProps}
            style={[styles.bigNumber, { color: colors.textPrimary }]}
            pointerEvents="none"
            underlineColorAndroid="transparent"
          />

          <Text style={[styles.label, styles.labelSecond, { color: colors.textMuted }]}>
            Eso al año es
          </Text>
          <AnimatedTextInput
            editable={false}
            defaultValue="0,00€"
            animatedProps={yearlyProps}
            style={[styles.bigNumber, { color: colors.textPrimary }]}
            pointerEvents="none"
            underlineColorAndroid="transparent"
          />

          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: 'rgba(0,0,0,0.03)' }]}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                Suscripciones activas
              </Text>
              <AnimatedTextInput
                editable={false}
                defaultValue="0"
                animatedProps={countProps}
                style={[styles.statValue, { color: colors.textPrimary }]}
                pointerEvents="none"
                underlineColorAndroid="transparent"
              />
            </View>
            <View style={[styles.statCard, { backgroundColor: 'rgba(0,0,0,0.03)' }]}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                Próxima renovación
              </Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                Notion
              </Text>
              <Text style={[styles.statSub, { color: colors.textMuted }]}>
                En 3 días · 20,00€
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: 'rgba(0,0,0,0.03)' }]}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                Mayor gasto
              </Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                Amazon Prime
              </Text>
              <Text style={[styles.statSub, { color: colors.textMuted }]}>
                30,00€/mes
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: 'rgba(0,0,0,0.03)' }]}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                Planes compartidos
              </Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                1 plan
              </Text>
              <Text style={[styles.statSub, { color: colors.textMuted }]}>
                Ahorrando 8,33€/mes
              </Text>
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
    paddingHorizontal: 18,
    paddingTop: 24,
    ...shadows.cardMd,
  },
  skeletonLayer: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 18,
    paddingTop: 24,
  },
  contentLayer: {
    flex: 1,
  },
  skelBar: {
    borderRadius: 6,
  },
  skelGreeting: {
    width: 120,
    height: 20,
    marginBottom: 20,
  },
  skelLabel: {
    width: 90,
    height: 14,
    marginBottom: 8,
  },
  skelBigNum: {
    width: 160,
    height: 32,
    marginBottom: 4,
  },
  skelRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  skelStat: {
    flex: 1,
    height: 70,
    borderRadius: 12,
  },
  greeting: {
    ...fontFamily.bold,
    fontSize: 20,
    marginBottom: 20,
  },
  label: {
    ...fontFamily.regular,
    fontSize: 13,
    marginBottom: 4,
  },
  labelSecond: {
    marginTop: 24,
  },
  bigNumber: {
    ...fontFamily.extrabold,
    fontSize: 34,
    letterSpacing: -1,
    padding: 0,
    margin: 0,
    height: 42,
    width: '100%',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 24,
  },
  statCard: {
    width: '48%',
    borderRadius: 14,
    padding: 12,
    flexGrow: 1,
  },
  statLabel: {
    ...fontFamily.regular,
    fontSize: 10,
    marginBottom: 4,
  },
  statValue: {
    ...fontFamily.bold,
    fontSize: 15,
    padding: 0,
    margin: 0,
  },
  statSub: {
    ...fontFamily.regular,
    fontSize: 9,
    marginTop: 2,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius['2xl'] * 2,
  },
});
