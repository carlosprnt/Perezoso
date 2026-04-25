// Empty state for DashboardScreen when there are 0 subscriptions.
//
// Layout:
//   · Hero — gradient card with slowly drifting light (organic breath)
//     · Title "Empieza a ver tus gastos" (25px extrabold)
//     · Body 18px regular
//     · Plain pill CTA "Añadir suscripción" (no icon)
//   · Section title "Sugerencia de suscripciones"
//   · SuggestionsList (vertical list with dividers + cascade fade)
//
// As the user scrolls, the hero card tilts, shrinks, fades, and a blur
// veil fades over it — same visual language as a WalletCard exiting
// the top of the SubscriptionsScreen list.

import React, { useEffect } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

import { useTheme } from '../../design/useTheme';
import { fontFamily, fontSize, lineHeight } from '../../design/typography';
import { radius } from '../../design/radius';
import { haptic } from '../../lib/haptics';
import { useCreateSubscriptionStore } from '../add-subscription/useCreateSubscriptionStore';
import { SuggestionsList } from '../add-subscription/SuggestionsList';
import { useT } from '../../lib/i18n/LocaleProvider';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

interface Props {
  /** Parent ScrollView scroll offset. Drives both the hero's tilt/fade
   *  exit and the SuggestionsList's viewport cascade. */
  scrollY: SharedValue<number>;
}

export function DashboardEmptyState({ scrollY }: Props) {
  const { colors, isDark } = useTheme();
  const t = useT();

  const heroGradient: [string, string, string] = isDark
    ? ['#1C1C1E', '#141416', '#0A0A0A']
    : ['#F5F5F5', '#F0F0F0', '#EDEDED'];

  // ── Organic gradient drift ────────────────────────────────────────
  // Two offset axes loop at different periods so the highlight never
  // repeats at the same screen position — reads as gentle breathing
  // instead of a mechanical cycle. The gradient layer is oversized
  // (inset -50px on each axis) so the drift never exposes the card
  // background beneath.
  const driftX = useSharedValue(0);
  const driftY = useSharedValue(0);
  useEffect(() => {
    driftX.value = withRepeat(
      withSequence(
        withTiming( 36, { duration: 5200, easing: Easing.inOut(Easing.sin) }),
        withTiming(-36, { duration: 5200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    driftY.value = withRepeat(
      withSequence(
        withTiming( 24, { duration: 7400, easing: Easing.inOut(Easing.sin) }),
        withTiming(-24, { duration: 7400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [driftX, driftY]);

  const driftStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: driftX.value },
      { translateY: driftY.value },
    ],
  }));

  // ── Hero exit (tilt + fade + blur) ────────────────────────────────
  // Scroll ∈ [40, 220] px drives the exit. The hero tilts slightly
  // (8°) from its bottom edge, shrinks, fades; a BlurView inside the
  // same wrapper fades in so the card dissolves into a blurry veil
  // rather than just vanishing.
  const heroExitStyle = useAnimatedStyle(() => {
    const p = interpolate(scrollY.value, [40, 220], [0, 1], Extrapolation.CLAMP);
    return {
      opacity: interpolate(p, [0, 0.8], [1, 0], Extrapolation.CLAMP),
      transform: [
        { scale: interpolate(p, [0, 1], [1, 0.9], Extrapolation.CLAMP) },
        { rotate: `${interpolate(p, [0, 1], [0, 8], Extrapolation.CLAMP)}deg` },
      ],
    };
  });

  const heroBlurStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [60, 200],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  const handleManual = () => {
    haptic.medium();
    useCreateSubscriptionStore.getState().open();
  };

  return (
    <View style={styles.root}>
      {/* Hero — tilts + fades + blurs as scroll progresses. */}
      <Animated.View
        style={[heroExitStyle, { transformOrigin: 'center bottom' } as any]}
      >
        <View style={styles.hero}>
          {/* Gradient layer — oversized wrapper drifts so the highlight
              moves without exposing the card's edges. */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { left: -50, right: -50, top: -40, bottom: -40 },
              driftStyle,
            ]}
            pointerEvents="none"
          >
            <LinearGradient
              colors={heroGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ flex: 1 }}
            />
          </Animated.View>

          {/* Content sits above the gradient layer. */}
          <View style={styles.heroContent}>
            <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
              {t('dashboard.empty.title')}
            </Text>
            <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
              {t('dashboard.empty.subtitle')}
            </Text>

            <Pressable
              onPress={handleManual}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: colors.textPrimary },
                pressed && { opacity: 0.85 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('dashboard.empty.cta')}
            >
              <Text style={[styles.primaryBtnText, { color: colors.background }]}>
                {t('dashboard.empty.cta')}
              </Text>
            </Pressable>
          </View>

          {/* Blur veil — fades in as the card exits. */}
          <AnimatedBlurView
            tint={isDark ? 'dark' : 'light'}
            intensity={60}
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              heroBlurStyle,
              { borderRadius: radius.card },
            ]}
          />
        </View>
      </Animated.View>

      {/* Section heading + suggestions. */}
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        {t('dashboard.empty.suggestions')}
      </Text>
      <SuggestionsList scrollY={scrollY} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  hero: {
    borderRadius: radius.card,
    marginBottom: 32,
    overflow: 'hidden',
  },
  heroContent: {
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'flex-start',
  },
  heroTitle: {
    ...fontFamily.semibold,
    fontSize: 25,
    lineHeight: 25 * lineHeight.tight,
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  heroSubtitle: {
    ...fontFamily.regular,
    fontSize: 18,
    lineHeight: 18 * 1.45,
    marginBottom: 22,
  },
  primaryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radius.full,
  },
  primaryBtnText: {
    ...fontFamily.semibold,
    fontSize: fontSize[15],
    letterSpacing: -0.1,
  },
  sectionTitle: {
    ...fontFamily.semibold,
    fontSize: fontSize[18],
    letterSpacing: -0.2,
    marginBottom: 4,
  },
});
