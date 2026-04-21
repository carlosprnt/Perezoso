// Slide 1 hero — a fake subscription list that auto-scrolls slowly
// up and down, showcasing 10 popular services. Positioned identically
// to ScreenshotHero so the slide transition feels uniform. Parallax
// drives 3D rotation + BlurView, matching the other screenshot slides.

import React, { useEffect } from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

import { useTheme } from '../../../design/useTheme';
import { fontFamily, fontSize, lineHeight } from '../../../design/typography';
import { radius } from '../../../design/radius';
import { shadows } from '../../../design/shadows';
import { logoUrlFromDomain } from '../../../lib/constants/platforms';
import { MOCK_SUBSCRIPTIONS } from '../constants';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

const { width: SCREEN_W } = Dimensions.get('window');
const SIDE_MARGIN = 20;
const CARD_W = SCREEN_W - SIDE_MARGIN * 2;
const CARD_H = 480;

const ROW_H = 68;
const HEADER_H = 56;
const LIST_CONTENT_H = HEADER_H + MOCK_SUBSCRIPTIONS.length * ROW_H;
const SCROLL_OVERFLOW = LIST_CONTENT_H - CARD_H + 24;

const MAX_ROT_DEG = 22;
const MAX_BLUR_INTENSITY = 38;

interface Props {
  parallax: SharedValue<number>;
}

export function SubscriptionListHero({ parallax }: Props) {
  const scrollY = useSharedValue(0);

  useEffect(() => {
    const dur = 4200;
    scrollY.value = withRepeat(
      withSequence(
        withTiming(-SCROLL_OVERFLOW, { duration: dur, easing: Easing.inOut(Easing.cubic) }),
        withTiming(0, { duration: dur, easing: Easing.inOut(Easing.cubic) }),
      ),
      -1,
      false,
    );
  }, [scrollY]);

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

  const innerScrollStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scrollY.value }],
  }));

  const blurAnimatedProps = useAnimatedProps(() => ({
    intensity: Math.abs(parallax.value) * MAX_BLUR_INTENSITY,
  }));

  const { colors } = useTheme();

  return (
    <Animated.View style={[styles.root, wrapStyle]}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderLight,
          },
        ]}
      >
        <Animated.View style={innerScrollStyle}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              Suscripciones
            </Text>
            <Text style={[styles.headerAmount, { color: colors.textSecondary }]}>
              111,92€/mes
            </Text>
          </View>

          {/* Rows */}
          {MOCK_SUBSCRIPTIONS.map((sub) => (
            <View key={sub.domain} style={[styles.row, { borderBottomColor: colors.borderLight }]}>
              <Image
                source={{ uri: logoUrlFromDomain(sub.domain) }}
                style={styles.logo}
                resizeMode="contain"
              />
              <View style={styles.rowText}>
                <Text style={[styles.rowName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {sub.name}
                </Text>
                <Text style={[styles.rowSub, { color: colors.textMuted }]} numberOfLines={1}>
                  Renueva en {sub.renewsIn}
                </Text>
              </View>
              <Text style={[styles.rowPrice, { color: colors.textPrimary }]}>
                {sub.price}
              </Text>
            </View>
          ))}
        </Animated.View>
      </View>

      <AnimatedBlurView
        tint="default"
        intensity={0}
        animatedProps={blurAnimatedProps}
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
    borderRadius: radius['2xl'],
    overflow: 'hidden',
  },
  card: {
    flex: 1,
    borderRadius: radius['2xl'],
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    paddingHorizontal: 16,
    ...shadows.cardMd,
  },
  header: {
    height: HEADER_H,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    ...fontFamily.bold,
    fontSize: fontSize[18],
  },
  headerAmount: {
    ...fontFamily.semibold,
    fontSize: fontSize[14],
  },
  row: {
    height: ROW_H,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: '#F0F0F0',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    ...fontFamily.semibold,
    fontSize: fontSize[15],
    lineHeight: fontSize[15] * lineHeight.compact,
  },
  rowSub: {
    ...fontFamily.regular,
    fontSize: fontSize[13],
    lineHeight: fontSize[13] * lineHeight.normal,
  },
  rowPrice: {
    ...fontFamily.bold,
    fontSize: fontSize[15],
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius['2xl'],
  },
});
