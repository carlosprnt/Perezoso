// PerezosoProCard — the Perezoso Pro "subscription" rendered at the
// top of the Suscripciones list when the user has the entitlement.
//
// Same footprint as WalletCard (radius 32, padding 20, gap 16) but the
// background is built from four absolutely-positioned layers that
// produce a holographic, parallax effect driven by the device's
// gyroscope:
//
//   layer 0  static dark base       (anchors contrast)
//   layer 1  iridescent rainbow     (translates at 0.4× tilt — slow)
//   layer 2  specular highlight     (translates at 1.0× tilt — fast)
//   layer 3  subtle white stripes   (depth / anti-banding)
//   content  same rows as WalletCard, white-tinted text
//
// All animated transforms come from a single pair of SharedValues
// (tiltX / tiltY ∈ [-1, 1]) so the JS thread does no per-frame work.

import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { useT } from '../../lib/i18n/LocaleProvider';
import { fontFamily, fontSize, lineHeight } from '../../design/typography';
import { radius } from '../../design/radius';
import { shadows } from '../../design/shadows';
import { Pressable } from '../../components/Pressable';
import { haptic } from '../../lib/haptics';
import {
  formatPrice,
  billingLabel,
  daysUntilDate,
  renewalText,
  formatBillingDate,
} from '../../lib/formatting';
import { effectiveNextBillingDate } from '../../lib/calculations/renewals';
import { useTilt } from '../../motion/useTilt';
import type { Subscription } from './types';

interface PerezosoProCardProps {
  subscription: Subscription;
  onPress?: () => void;
}

export function PerezosoProCard({ subscription: sub, onPress }: PerezosoProCardProps) {
  const t = useT();
  const { tiltX, tiltY } = useTilt();
  const effectiveDate = effectiveNextBillingDate(sub);
  const days = daysUntilDate(effectiveDate);

  // Iridescence (slow parallax): translates and rotates gently.
  const iridescenceStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tiltX.value * 30 },
      { translateY: tiltY.value * 20 },
      { rotate: `${tiltX.value * 6}deg` },
    ],
  }));

  // Specular highlight (fast parallax): translates further and brightens
  // as the device tilts more in either direction.
  const specularStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tiltX.value * 60 },
      { translateY: tiltY.value * 40 },
    ],
    opacity: interpolate(
      Math.abs(tiltX.value) + Math.abs(tiltY.value),
      [0, 2],
      [0.2, 0.6],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <Pressable
      onPress={() => {
        haptic.selection();
        onPress?.();
      }}
      style={[styles.card, shadows.cardSm]}
    >
      {/* Layer 0 — dark base (static). */}
      <LinearGradient
        colors={['#1a1530', '#2a1f4a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Layer 1 — iridescent rainbow (slow parallax). */}
      <Animated.View style={[styles.iridescenceWrap, iridescenceStyle]}>
        <LinearGradient
          colors={[
            '#FF6FD8',
            '#A78BFA',
            '#6EE7F0',
            '#FFD66E',
            '#FF6FD8',
            '#A78BFA',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Layer 2 — specular highlight (fast parallax). */}
      <Animated.View style={[styles.specularWrap, specularStyle]}>
        <LinearGradient
          colors={[
            'rgba(255,255,255,0)',
            'rgba(255,255,255,0.55)',
            'rgba(255,255,255,0)',
          ]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          locations={[0.35, 0.5, 0.65]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Layer 3 — fine diagonal stripes for depth. */}
      <LinearGradient
        colors={[
          'rgba(255,255,255,0)',
          'rgba(255,255,255,0.04)',
          'rgba(255,255,255,0)',
          'rgba(255,255,255,0.04)',
          'rgba(255,255,255,0)',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Content layer. */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.logoWrap}>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
              {t('pro.cardTitle')}
            </Text>
            <Text style={styles.category}>
              {t('category.other', { defaultValue: 'Otros' })}
            </Text>
          </View>

          <View style={styles.priceBlock}>
            <Text style={styles.price}>
              {formatPrice(sub.price_amount, sub.currency)}
            </Text>
            <Text style={styles.period}>
              {billingLabel(sub.billing_period)}
            </Text>
          </View>
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.progressSection}>
            <View style={styles.renewalRow}>
              <Text style={styles.renewalLabel}>{t('wallet.nextCharge')}</Text>
              <Text style={styles.renewalLabel}>{formatBillingDate(effectiveDate)}</Text>
            </View>
            <Text style={styles.renewalDays}>{renewalText(days)}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card, // 32px
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
    backgroundColor: '#1a1530',
  },
  // The iridescent layer is oversized so the parallax translation never
  // exposes the dark base at the edges of the card.
  iridescenceWrap: {
    position: 'absolute',
    top: '-50%',
    left: '-50%',
    width: '200%',
    height: '200%',
    opacity: 0.55,
  },
  specularWrap: {
    position: 'absolute',
    top: '-50%',
    left: '-50%',
    width: '200%',
    height: '200%',
  },
  content: {
    gap: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: 40,
    height: 40,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...fontFamily.semiBold,
    fontSize: fontSize[15],
    lineHeight: fontSize[15] * lineHeight.tight,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowRadius: 4,
  },
  category: {
    ...fontFamily.semiBold,
    fontSize: fontSize[15],
    lineHeight: fontSize[15] * lineHeight.snug,
    color: 'rgba(255,255,255,0.78)',
  },
  priceBlock: {
    alignItems: 'flex-end',
  },
  price: {
    ...fontFamily.semiBold,
    fontSize: fontSize[15],
    lineHeight: fontSize[15] * lineHeight.tight,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowRadius: 4,
  },
  period: {
    ...fontFamily.semiBold,
    fontSize: fontSize[15],
    lineHeight: fontSize[15] * lineHeight.snug,
    color: 'rgba(255,255,255,0.78)',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  progressSection: {
    flex: 1,
    gap: 4,
  },
  renewalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  renewalLabel: {
    ...fontFamily.semiBold,
    fontSize: fontSize[13],
    lineHeight: fontSize[13] * lineHeight.snug,
    color: 'rgba(255,255,255,0.85)',
  },
  renewalDays: {
    ...fontFamily.semiBold,
    fontSize: fontSize[13],
    lineHeight: fontSize[13] * lineHeight.snug,
    color: 'rgba(255,255,255,0.9)',
  },
});

