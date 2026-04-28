// Slide 5 hero — dashboard preview showing the "Hola, Carlos." greeting,
// big monthly/yearly spend numbers (with accent color on the amounts),
// activity summary text, and a bell-icon reminder banner.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell } from 'lucide-react-native';

import { fontFamily } from '../../../design/typography';
import { shadows } from '../../../design/shadows';
import { useT } from '../../../lib/i18n/LocaleProvider';
import { ACCENT_PRIMARY, MOCK_DASHBOARD } from '../constants';
import { PhoneFrame } from './PhoneFrame';

interface Props {
  parallax: SharedValue<number>;
}

export function FinalLoginHero({ parallax }: Props) {
  const heroStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: parallax.value * 22 },
      {
        scale: interpolate(
          Math.abs(parallax.value),
          [0, 1],
          [1, 0.96],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const t = useT();

  return (
    <Animated.View style={[styles.root, heroStyle]}>
      <PhoneFrame time="13:10">
        {/* Greeting row ────────────────── */}
        <View style={styles.greetRow}>
          <Text style={styles.greet}>{t(MOCK_DASHBOARD.greetingKey)}</Text>
          <View style={styles.avatar} />
        </View>

        {/* Big numbers ────────────────── */}
        <View style={styles.amountsBlock}>
          <Text style={styles.heroLabel}>
            {t(MOCK_DASHBOARD.monthlyLabelKey)}{' '}
            <Text style={styles.heroAmount}>{MOCK_DASHBOARD.monthlyAmount}</Text>.
          </Text>
          <Text style={[styles.heroLabel, { marginTop: 4 }]}>
            {t(MOCK_DASHBOARD.yearlyLabelKey)}{' '}
            <Text style={styles.heroAmount}>{MOCK_DASHBOARD.yearlyAmount}</Text>.
          </Text>
        </View>

        {/* Activity line ────────────────── */}
        <Text style={styles.activity}>
          {t('onboarding.hero.haveSubs')}{' '}
          <Text style={[styles.activityAccent]}>
            {MOCK_DASHBOARD.activeCount} {t('onboarding.hero.subscriptions')}
          </Text>
          {'\n'}
          {t('onboarding.hero.saving')}{' '}
          <Text style={styles.activityAccent}>
            {MOCK_DASHBOARD.shareDiscount} {t('onboarding.hero.perMonthLong')}
          </Text>
          .
        </Text>

        {/* Reminder banner ─────────────── */}
        <View style={styles.reminderCard}>
          <View style={styles.reminderIconWrap}>
            <LinearGradient
              colors={['#E0E7FF', '#C7D2FE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Bell size={16} color="#4F46E5" strokeWidth={2.3} />
          </View>
          <Text style={styles.reminderText}>
            {t('onboarding.hero.reminderBody')}
          </Text>
        </View>
      </PhoneFrame>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  greetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  greet: {
    ...fontFamily.medium,
    fontSize: 12,
    color: '#0F172A',
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F4B29B',
  },

  amountsBlock: {
    marginTop: 4,
    marginBottom: 8,
  },
  heroLabel: {
    ...fontFamily.medium,
    fontSize: 19,
    lineHeight: 22,
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  heroAmount: {
    ...fontFamily.medium,
    color: ACCENT_PRIMARY,
  },

  activity: {
    ...fontFamily.medium,
    fontSize: 10.5,
    lineHeight: 10.5 * 1.5,
    color: '#0F172A',
    marginBottom: 12,
  },
  activityAccent: {
    ...fontFamily.medium,
    color: ACCENT_PRIMARY,
  },

  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    ...shadows.cardSm,
  },
  reminderIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderText: {
    flex: 1,
    ...fontFamily.medium,
    fontSize: 10,
    lineHeight: 10 * 1.4,
    color: '#1F2937',
  },
  reminderBold: {
    ...fontFamily.medium,
    color: '#0F172A',
  },
});
