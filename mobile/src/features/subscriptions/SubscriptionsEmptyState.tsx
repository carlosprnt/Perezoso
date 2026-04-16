// Empty-state body for SubscriptionsScreen. Rendered beneath the
// "Mis suscripciones" header when the user has 0 subscriptions.
//
// Layout:
//   · Short subtitle ("Todavía no añades ninguna")
//   · Section heading "Sugerencia de suscripciones"
//   · Shared vertical SuggestionsList (logo · name · + icon, dividers)
//
// The screen's existing ProgressiveBlurView at the top edge softens
// content entering the viewport as the user scrolls, and the
// FloatingNav's BlurView softens content leaving at the bottom — so
// the viewport fade-in / fade-out is handled by surrounding chrome.

import React from 'react';
import Animated, { useAnimatedStyle, interpolate, Extrapolation, type SharedValue } from 'react-native-reanimated';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../design/useTheme';
import { fontFamily, fontSize } from '../../design/typography';
import { SuggestionsList } from '../add-subscription/SuggestionsList';

interface Props {
  /** Parent ScrollView scroll offset — used to fade the subtitle + heading
   *  block in sync with the existing header fade (so the whole "intro"
   *  area dissolves together at 120px of scroll). */
  scrollY: SharedValue<number>;
}

export function SubscriptionsEmptyState({ scrollY }: Props) {
  const { colors } = useTheme();

  // Fade the intro (subtitle + section heading) in sync with the
  // header's fade curve (0 → 120 px).
  const introFadeStyle = useAnimatedStyle(() => {
    const p = interpolate(scrollY.value, [0, 120], [0, 1], Extrapolation.CLAMP);
    return { opacity: 1 - p };
  });

  return (
    <View style={styles.root}>
      <Animated.View style={introFadeStyle}>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Todavía no tienes ninguna. Añade la primera para empezar a ver
          tu gasto mensual.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Sugerencia de suscripciones
        </Text>
      </Animated.View>

      <SuggestionsList />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  subtitle: {
    ...fontFamily.regular,
    fontSize: 15,
    lineHeight: 15 * 1.5,
    marginBottom: 24,
  },
  sectionTitle: {
    ...fontFamily.bold,
    fontSize: fontSize[18],
    letterSpacing: -0.2,
    marginBottom: 4,
  },
});
