// PerezosoProCard — the Perezoso Pro "subscription" rendered inside
// the Suscripciones list when the user has the entitlement.
//
// Footprint matches WalletCard (radius 32, padding 20, gap 16) but the
// background is a holographic foil composed of four absolutely-
// positioned layers that move with the device's gyroscope to produce
// a parallax, "metallic sticker" effect:
//
//   layer 0  silver metallic base       (light, static)
//   layer 1  pastel iridescent foil     (translates at 0.4× tilt)
//   layer 2  bright specular highlight  (translates at 1.0× tilt)
//   layer 3  cool sheen veil            (depth + temperature)
//   content  WalletCard rows, dark text on the pastel background
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

  // Iridescent foil: slow parallax + slight rotation.
  const iridescenceStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tiltX.value * 40 },
      { translateY: tiltY.value * 26 },
      { rotate: `${tiltX.value * 5}deg` },
    ],
  }));

  // Bright specular sweep: faster parallax + brightens with magnitude.
  const specularStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tiltX.value * 75 },
      { translateY: tiltY.value * 50 },
    ],
    opacity: interpolate(
      Math.abs(tiltX.value) + Math.abs(tiltY.value),
      [0, 2],
      [0.55, 0.95],
      Extrapolation.CLAMP,
    ),
  }));

  // Cool sheen veil: subtle counter-translate so the warm and cool
  // halves of the foil swap as the device tilts.
  const sheenStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tiltX.value * -20 },
      { translateY: tiltY.value * -14 },
    ],
  }));

  return (
    <Pressable
      onPress={() => {
        haptic.selection();
        onPress?.();
      }}
      style={[styles.card, shadows.cardSm]}
    >
      {/* Layer 0 — silver metallic base (static). */}
      <LinearGradient
        colors={['#F5F4FF', '#E6E5F2', '#F8F6FF']}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Layer 1 — pastel iridescent foil (slow parallax). */}
      <Animated.View style={[styles.foilWrap, iridescenceStyle]}>
        <LinearGradient
          colors={[
            '#FFD1E8', // soft pink
            '#E0CCFF', // lavender
            '#C5E8FF', // sky
            '#C8F5DC', // mint
            '#FFF1B5', // butter
            '#FFD1E8', // soft pink (loop)
          ]}
          locations={[0, 0.22, 0.44, 0.66, 0.85, 1]}
          start={{ x: 0, y: 0.1 }}
          end={{ x: 1, y: 0.9 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Layer 2 — bright specular sweep (fast parallax). */}
      <Animated.View style={[styles.specularWrap, specularStyle]}>
        <LinearGradient
          colors={[
            'rgba(255,255,255,0)',
            'rgba(255,255,255,0.85)',
            'rgba(255,255,255,0)',
          ]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          locations={[0.35, 0.5, 0.65]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Layer 3 — cool sheen veil (counter-translates). */}
      <Animated.View style={[styles.sheenWrap, sheenStyle]} pointerEvents="none">
        <LinearGradient
          colors={[
            'rgba(255,255,255,0.4)',
            'rgba(255,255,255,0)',
            'rgba(196,217,255,0.35)',
          ]}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

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

const TEXT_PRIMARY = '#1F1B36';
const TEXT_MUTED = 'rgba(31,27,54,0.62)';

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card, // 32px
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    overflow: 'hidden',
    backgroundColor: '#F2F0FA',
  },
  // Foil layer is oversized so parallax translation never exposes
  // bare base at the card edges.
  foilWrap: {
    position: 'absolute',
    top: '-50%',
    left: '-50%',
    width: '200%',
    height: '200%',
    opacity: 0.92,
  },
  specularWrap: {
    position: 'absolute',
    top: '-50%',
    left: '-50%',
    width: '200%',
    height: '200%',
  },
  sheenWrap: {
    position: 'absolute',
    top: '-50%',
    left: '-50%',
    width: '200%',
    height: '200%',
    opacity: 0.5,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
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
    color: TEXT_PRIMARY,
  },
  category: {
    ...fontFamily.semiBold,
    fontSize: fontSize[15],
    lineHeight: fontSize[15] * lineHeight.snug,
    color: TEXT_MUTED,
  },
  priceBlock: {
    alignItems: 'flex-end',
  },
  price: {
    ...fontFamily.semiBold,
    fontSize: fontSize[15],
    lineHeight: fontSize[15] * lineHeight.tight,
    color: TEXT_PRIMARY,
  },
  period: {
    ...fontFamily.semiBold,
    fontSize: fontSize[15],
    lineHeight: fontSize[15] * lineHeight.snug,
    color: TEXT_MUTED,
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
    color: TEXT_MUTED,
  },
  renewalDays: {
    ...fontFamily.semiBold,
    fontSize: fontSize[13],
    lineHeight: fontSize[13] * lineHeight.snug,
    color: TEXT_PRIMARY,
  },
});
