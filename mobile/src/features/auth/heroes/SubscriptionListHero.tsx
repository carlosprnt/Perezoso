// Slide 1 hero — a fake subscription list that auto-scrolls slowly
// up and down, showcasing 10 popular services. The header stays fixed
// while rows scroll beneath it, each scaling 0.95→1 as they enter the
// visible area for a polished entrance feel.

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
const VISIBLE_LIST_H = CARD_H - HEADER_H;
const TOTAL_ROWS_H = MOCK_SUBSCRIPTIONS.length * ROW_H;
const SCROLL_OVERFLOW = TOTAL_ROWS_H - VISIBLE_LIST_H;

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
        {/* Fixed header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.surface,
              borderBottomColor: colors.borderLight,
            },
          ]}
        >
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Suscripciones
          </Text>
          <Text style={[styles.headerAmount, { color: colors.textSecondary }]}>
            111,92€/mes
          </Text>
        </View>

        {/* Scrolling rows */}
        <View style={styles.listClip}>
          <Animated.View style={innerScrollStyle}>
            {MOCK_SUBSCRIPTIONS.map((sub, i) => (
              <SubscriptionRow
                key={sub.domain}
                sub={sub}
                index={i}
                scrollY={scrollY}
                colors={colors}
              />
            ))}
          </Animated.View>
        </View>
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

interface RowProps {
  sub: (typeof MOCK_SUBSCRIPTIONS)[number];
  index: number;
  scrollY: SharedValue<number>;
  colors: Record<string, string>;
}

function SubscriptionRow({ sub, index, scrollY, colors }: RowProps) {
  const rowStyle = useAnimatedStyle(() => {
    const rowTop = index * ROW_H + scrollY.value;
    const distFromTop = rowTop;

    const s = interpolate(distFromTop, [-ROW_H, 0, ROW_H], [0.92, 0.95, 1], Extrapolation.CLAMP);

    return {
      transform: [{ scale: s }],
      opacity: 1,
    };
  });

  return (
    <Animated.View
      style={[
        styles.row,
        { borderBottomColor: colors.borderLight },
        rowStyle,
      ]}
    >
      <Image
        source={{ uri: logoUrlFromDomain(sub.domain) }}
        style={[styles.logo, { backgroundColor: colors.borderLight }]}
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
    ...shadows.cardMd,
  },
  header: {
    height: HEADER_H,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 1,
  },
  headerTitle: {
    ...fontFamily.semibold,
    fontSize: fontSize[18],
  },
  headerAmount: {
    ...fontFamily.semibold,
    fontSize: fontSize[14],
  },
  listClip: {
    flex: 1,
    overflow: 'hidden',
  },
  row: {
    height: ROW_H,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
    paddingHorizontal: 16,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
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
    ...fontFamily.semibold,
    fontSize: fontSize[15],
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius['2xl'],
  },
});
