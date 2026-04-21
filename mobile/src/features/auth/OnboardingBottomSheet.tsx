// Fixed bottom sheet for the onboarding/login flow. Sits pinned to the
// bottom of the screen with a generous top radius. Title + body fade
// + slide up slightly per slide transition; the sheet itself stays put.
//
// The actions area is a render prop so each slide can plug in its own
// controls (continue/skip row on onboarding slides; social auth buttons
// on the final slide).

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolate,
  Extrapolation,
  runOnJS,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../design/useTheme';
import { fontFamily, fontSize, lineHeight } from '../../design/typography';
import { radius } from '../../design/radius';

import { PaginationDots } from './PaginationDots';
import { LEGAL } from './constants';

interface Props {
  title: string;
  body: string;
  index: number;
  page: SharedValue<number>;
  count: number;
  children: React.ReactNode;
  showLegal?: boolean;
  onPressTerms?: () => void;
  onPressPrivacy?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export function OnboardingBottomSheet({
  title,
  body,
  index,
  page,
  count,
  children,
  showLegal,
  onPressTerms,
  onPressPrivacy,
  onSwipeLeft,
  onSwipeRight,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const textStyle = useAnimatedStyle(() => {
    const distance = Math.abs(page.value - index);
    const t = Math.min(distance, 1);
    return {
      opacity: interpolate(t, [0, 1], [1, 0], Extrapolation.CLAMP),
      transform: [
        { translateY: interpolate(t, [0, 1], [0, 12], Extrapolation.CLAMP) },
      ],
    };
  });

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-30, 30])
    .failOffsetY([-15, 15])
    .onEnd((e) => {
      'worklet';
      if (e.velocityX < -400 || e.translationX < -60) {
        if (onSwipeLeft) runOnJS(onSwipeLeft)();
      } else if (e.velocityX > 400 || e.translationX > 60) {
        if (onSwipeRight) runOnJS(onSwipeRight)();
      }
    });

  return (
    <GestureDetector gesture={swipeGesture}>
    <View
      style={[
        styles.sheet,
        {
          backgroundColor: colors.surface,
          paddingBottom: Math.max(insets.bottom, 18) + 10,
        },
      ]}
    >
      {/* Texts (anchored to top) ───────────────────────── */}
      <Animated.View style={[styles.texts, textStyle]}>
        <Text
          style={[styles.title, { color: colors.textPrimary }]}
          accessibilityRole="header"
        >
          {title}
        </Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          {body}
        </Text>
      </Animated.View>

      {/* Dots + actions + legal (anchored to bottom) ───── */}
      <View style={styles.bottomGroup}>
        <View style={styles.dotsRow}>
          <PaginationDots
            page={page}
            count={count}
            activeColor={colors.textPrimary}
            inactiveColor={colors.borderLight}
          />
        </View>

        <View style={styles.actions}>{children}</View>

        {showLegal && (
          <Text style={[styles.legal, { color: colors.textMuted }]}>
            {LEGAL.prefix}
            <Text
              style={[styles.legalLink, { color: colors.textSecondary }]}
              onPress={onPressTerms}
            >
              {LEGAL.terms}
            </Text>
            {LEGAL.middle}
            <Text
              style={[styles.legalLink, { color: colors.textSecondary }]}
              onPress={onPressPrivacy}
            >
              {LEGAL.privacy}
            </Text>
            {LEGAL.suffix}
          </Text>
        )}
      </View>
    </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    paddingTop: 28,
    paddingHorizontal: 24,
    minHeight: 330,
    justifyContent: 'space-between',
  },
  texts: {},
  bottomGroup: {},
  title: {
    ...fontFamily.extrabold,
    fontSize: 28,
    lineHeight: 28 * lineHeight.compact,
    letterSpacing: -0.4,
  },
  body: {
    ...fontFamily.regular,
    fontSize: fontSize[15],
    lineHeight: fontSize[15] * lineHeight.normal,
    marginTop: 10,
  },
  dotsRow: {
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  legal: {
    ...fontFamily.regular,
    fontSize: fontSize[11],
    lineHeight: fontSize[11] * lineHeight.normal,
    marginTop: 14,
    textAlign: 'center',
  },
  legalLink: {
    ...fontFamily.semibold,
    textDecorationLine: 'underline',
  },
});
