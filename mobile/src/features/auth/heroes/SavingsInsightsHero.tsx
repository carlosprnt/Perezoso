// Slide 4 hero — savings suggestions list inside a phone frame.
// Each row has a logo chip, savings copy, and a pill "Ver más" CTA.

import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { X, HandCoins } from 'lucide-react-native';

import { fontFamily } from '../../../design/typography';
import { radius } from '../../../design/radius';
import { logoUrlFromDomain } from '../../../lib/constants/platforms';
import { MOCK_SAVINGS } from '../constants';
import { PhoneFrame } from './PhoneFrame';

interface Props {
  parallax: SharedValue<number>;
}

export function SavingsInsightsHero({ parallax }: Props) {
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

  return (
    <Animated.View style={[styles.root, heroStyle]}>
      <PhoneFrame>
        {/* Header ─────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.title}>Sugerencias de ahorro</Text>
          <View style={styles.closeBtn}>
            <X size={12} color="#737373" strokeWidth={2.4} />
          </View>
        </View>

        {/* Cards ─────────────────────── */}
        <View style={{ gap: 10 }}>
          {MOCK_SAVINGS.map((s, i) => (
            <SavingsCard
              key={i}
              domain={s.domain}
              amount={s.amount}
              body={s.body}
            />
          ))}
        </View>
      </PhoneFrame>
    </Animated.View>
  );
}

function SavingsCard({
  domain,
  amount,
  body,
}: {
  domain: string;
  amount: string;
  body: string;
}) {
  const isBundle = domain === '__bundle__';
  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={[styles.logoBox, isBundle && { backgroundColor: '#FEF3C7' }]}>
          {isBundle ? (
            <HandCoins size={18} color="#D97706" strokeWidth={2.2} />
          ) : (
            <Image
              source={{ uri: logoUrlFromDomain(domain) }}
              style={styles.logoImg}
              resizeMode="contain"
            />
          )}
        </View>
        <Text style={styles.body}>
          Podrías ahorrar hasta <Text style={styles.bodyBold}>{amount}</Text> al año {body}
        </Text>
      </View>
      <View style={styles.ctaPill}>
        <Text style={styles.ctaText}>Ver más</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 2,
  },
  title: {
    ...fontFamily.bold,
    fontSize: 13,
    color: '#0F172A',
  },
  closeBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#F7F7F9',
    borderRadius: 14,
    padding: 10,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  logoBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImg: {
    width: 20,
    height: 20,
  },
  body: {
    flex: 1,
    ...fontFamily.regular,
    fontSize: 10.5,
    lineHeight: 10.5 * 1.4,
    color: '#1F2937',
  },
  bodyBold: {
    ...fontFamily.bold,
    color: '#0F172A',
  },
  ctaPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.full,
    paddingVertical: 7,
    alignItems: 'center',
  },
  ctaText: {
    ...fontFamily.semibold,
    fontSize: 10.5,
    color: '#0F172A',
  },
});
