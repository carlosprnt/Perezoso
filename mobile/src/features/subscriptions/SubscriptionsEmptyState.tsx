// Empty-state body for SubscriptionsScreen. Rendered beneath the
// "Mis suscripciones" header when the user has 0 subscriptions.
//
// Layout:
//   · Body paragraph (18px) — sits directly under the title
//   · Section heading "Sugerencia de suscripciones"
//   · Shared vertical SuggestionsList (logo · name · + icon, dividers)
//
// The intro (body + section heading) fades in sync with the screen's
// header fade curve (0 → 120 px). The SuggestionsList drives its own
// per-row viewport cascade from the same scrollY.

import React from 'react';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../design/useTheme';
import { fontFamily, fontSize } from '../../design/typography';
import { SuggestionsList } from '../add-subscription/SuggestionsList';
import { useT } from '../../lib/i18n/LocaleProvider';

interface Props {
  scrollY: SharedValue<number>;
}

export function SubscriptionsEmptyState({ scrollY }: Props) {
  const { colors } = useTheme();
  const t = useT();

  const introFadeStyle = useAnimatedStyle(() => {
    const p = interpolate(scrollY.value, [0, 120], [0, 1], Extrapolation.CLAMP);
    return { opacity: 1 - p };
  });

  return (
    <View style={styles.root}>
      <Animated.View style={introFadeStyle}>
        <Text style={[styles.subtitle, { color: colors.textPrimary }]}>
          {t('subscriptions.empty.subtitle')}
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t('subscriptions.empty.suggestions')}
        </Text>
      </Animated.View>

      <SuggestionsList scrollY={scrollY} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  subtitle: {
    ...fontFamily.medium,
    fontSize: 18,
    lineHeight: 18 * 1.4,
    marginBottom: 22,
  },
  sectionTitle: {
    ...fontFamily.medium,
    fontSize: fontSize[18],
    letterSpacing: -0.2,
    marginBottom: 4,
  },
});
