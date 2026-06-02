// Slide 4 hero — savings insight cards that stagger-reveal one by one
// from bottom to top, each scaling 0.95→1. The card container slides
// upward as items appear. Only animates while the slide is visible.

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
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { X, HandCoins } from 'lucide-react-native';

import { useTheme } from '../../../design/useTheme';
import { useT } from '../../../lib/i18n/LocaleProvider';
import { fontFamily, fontSize } from '../../../design/typography';
import { radius } from '../../../design/radius';
import { shadows } from '../../../design/shadows';
import { logoUrlFromDomain } from '../../../lib/constants/platforms';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

const { width: SCREEN_W } = Dimensions.get('window');
const SIDE_MARGIN = 20;
const CARD_W = SCREEN_W - SIDE_MARGIN * 2;
const CARD_H = 480;

const MAX_ROT_DEG = 22;
const MAX_BLUR_INTENSITY = 38;

const CYCLE_MS = 6000;
const STAGGER = 400;
const CARD_APPEAR_START = 600;

const INSIGHTS = [
  {
    domain: 'apple.com/apple-tv-plus',
    amount: '120,00€',
    bodyKey: 'onboarding.hero.savingsBody1',
  },
  {
    domain: '__bundle__',
    amount: '94,20€',
    bodyKey: 'onboarding.hero.savingsBody2',
  },
  {
    domain: 'apple.com/apple-music',
    amount: '66,00€',
    bodyKey: 'onboarding.hero.savingsBody3',
  },
];

interface Props {
  parallax: SharedValue<number>;
}

export function SavingsInsightsHero({ parallax }: Props) {
  const clock = useSharedValue(0);
  const containerY = useSharedValue(60);
  const cardScales = INSIGHTS.map(() => useSharedValue(0));

  const runCycle = () => {
    'worklet';
    for (const s of cardScales) s.value = 0;
    containerY.value = 60;

    containerY.value = withDelay(
      CARD_APPEAR_START,
      withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }),
    );

    for (let i = 0; i < cardScales.length; i++) {
      const delay = CARD_APPEAR_START + i * STAGGER;
      cardScales[i].value = withDelay(
        delay,
        withSpring(1, { damping: 14, stiffness: 200 }),
      );
    }
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
        for (const s of cardScales) s.value = 0;
        containerY.value = 60;
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

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: containerY.value }],
  }));

  const t = useT();
  const { colors } = useTheme();

  return (
    <Animated.View style={[styles.root, wrapStyle]}>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.borderLight },
        ]}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('onboarding.hero.savingsTitle')}
          </Text>
          <View style={[styles.closeBtn, { backgroundColor: 'rgba(0,0,0,0.04)' }]}>
            <X size={12} color={colors.textMuted} strokeWidth={2.4} />
          </View>
        </View>

        <Animated.View style={[styles.cardsContainer, containerStyle]}>
          {INSIGHTS.map((insight, i) => (
            <InsightCard
              key={i}
              insight={insight}
              scale={cardScales[i]}
              colors={colors}
            />
          ))}
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

function InsightCard({
  insight,
  scale,
  colors,
}: {
  insight: (typeof INSIGHTS)[number];
  scale: SharedValue<number>;
  colors: Record<string, string>;
}) {
  const t = useT();
  const isBundle = insight.domain === '__bundle__';

  const style = useAnimatedStyle(() => ({
    opacity: scale.value,
    transform: [
      { scale: interpolate(scale.value, [0, 1], [0.95, 1], Extrapolation.CLAMP) },
      { translateY: interpolate(scale.value, [0, 1], [16, 0], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.insightCard,
        { backgroundColor: 'rgba(0,0,0,0.035)' },
        style,
      ]}
    >
      <View style={styles.insightRow}>
        <View
          style={[
            styles.logoBox,
            { backgroundColor: colors.surface },
            isBundle && { backgroundColor: '#FEF3C7' },
          ]}
        >
          {isBundle ? (
            <HandCoins size={20} color="#D97706" strokeWidth={2} />
          ) : (
            <Image
              source={{ uri: logoUrlFromDomain(insight.domain) }}
              style={styles.logoImg}
              resizeMode="contain"
            />
          )}
        </View>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          {t('onboarding.hero.savingsUpTo')}{' '}
          <Text style={[styles.bodyBold, { color: colors.textPrimary }]}>
            {insight.amount}
          </Text>{' '}
          {t('onboarding.hero.savingsPerYear')} {t(insight.bodyKey)}
        </Text>
      </View>
      <View style={[styles.ctaPill, { backgroundColor: colors.surface }]}>
        <Text style={[styles.ctaText, { color: colors.textPrimary }]}>{t('onboarding.hero.seeMore')}</Text>
      </View>
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
    paddingHorizontal: 16,
    paddingTop: 18,
    ...shadows.cardMd,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    ...fontFamily.semiBold,
    fontSize: 16,
  },
  closeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardsContainer: {
    gap: 10,
  },
  insightCard: {
    borderRadius: 16,
    padding: 14,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  logoBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImg: {
    width: 24,
    height: 24,
  },
  body: {
    flex: 1,
    ...fontFamily.medium,
    fontSize: 13,
    lineHeight: 13 * 1.45,
  },
  bodyBold: {
    ...fontFamily.semiBold,
  },
  ctaPill: {
    borderRadius: radius.full,
    paddingVertical: 10,
    alignItems: 'center',
  },
  ctaText: {
    ...fontFamily.semiBold,
    fontSize: 13,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius['2xl'] * 2,
  },
});
