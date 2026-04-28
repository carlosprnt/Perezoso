// Google + Apple buttons used on the final onboarding slide.
// Stacked vertically, pill-shaped, with inline brand glyphs.

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
} from 'react-native-reanimated';

import { useTheme } from '../../design/useTheme';
import { fontFamily, fontSize } from '../../design/typography';
import { radius } from '../../design/radius';
import { haptic } from '../../lib/haptics';
import { GoogleGlyph, AppleGlyph } from './icons/BrandGlyphs';
import { useT } from '../../lib/i18n/LocaleProvider';

interface Props {
  onPressGoogle: () => void;
  onPressApple: () => void;
  appleDisabled?: boolean;
}

export function SocialLoginButtons({
  onPressGoogle,
  onPressApple,
  appleDisabled = true,
}: Props) {
  const { colors, isDark } = useTheme();
  const t = useT();

  const primaryBg = colors.surface;
  const primaryBorder = colors.borderLight;
  const primaryText = colors.textPrimary;

  const secondaryBg = 'transparent';
  const secondaryBorder = colors.borderLight;
  const secondaryText = appleDisabled ? colors.textDisabled : colors.textPrimary;

  return (
    <View style={styles.stack}>
      <Animated.View entering={FadeInDown.duration(380).delay(140)}>
        <Pressable
          onPress={() => { haptic.selection(); onPressGoogle(); }}
          style={({ pressed }) => [
            styles.btn,
            {
              backgroundColor: primaryBg,
              borderColor: primaryBorder,
            },
            pressed && { opacity: 0.85 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding.continueGoogle')}
        >
          <View style={styles.glyph}>
            <GoogleGlyph size={20} />
          </View>
          <Text style={[styles.btnText, { color: primaryText }]}>
            {t('onboarding.continueGoogle')}
          </Text>
        </Pressable>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(380).delay(240)}>
        <Pressable
          onPress={() => { if (!appleDisabled) { haptic.selection(); onPressApple(); } }}
          disabled={appleDisabled}
          style={({ pressed }) => [
            styles.btn,
            {
              backgroundColor: secondaryBg,
              borderColor: secondaryBorder,
            },
            pressed && { opacity: 0.85 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding.continueApple')}
        >
          <View style={styles.glyph}>
            <AppleGlyph size={20} color={secondaryText} />
          </View>
          <Text style={[styles.btnText, { color: secondaryText }]}>
            {t('onboarding.continueApple')}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    width: '100%',
    gap: 10,
  },
  btn: {
    height: 52,
    borderRadius: radius.full,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  glyph: {
    marginRight: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    ...fontFamily.semiBold,
    fontSize: fontSize[15],
    letterSpacing: -0.1,
  },
});
