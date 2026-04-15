// SubscriptionCreatedCelebration — shown after a new subscription is
// created. A compact card materialises in the middle of the screen
// with logo + name + price + period, holds for a beat, then falls
// away (translate down + opacity fade + slight scale shrink).
//
// Rendered as its own <Modal> at the app root via _layout.tsx so it
// stacks above any content that happens to be underneath.

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';

import { useSubscriptionCelebrationStore } from './useSubscriptionCelebrationStore';
import { fontFamily, fontSize } from '../../design/typography';

const ENTER_MS = 320;
const HOLD_MS = 1000;
const EXIT_MS = 420;

export function SubscriptionCreatedCelebration() {
  const visible = useSubscriptionCelebrationStore((s) => s.visible);
  const data = useSubscriptionCelebrationStore((s) => s.data);
  const hide = useSubscriptionCelebrationStore((s) => s.hide);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.86)).current;
  const cardTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    // Reset values each time the celebration fires.
    backdropOpacity.setValue(0);
    cardOpacity.setValue(0);
    cardScale.setValue(0.86);
    cardTranslateY.setValue(0);

    // Enter — card appears in place.
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: ENTER_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: ENTER_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        damping: 16,
        stiffness: 220,
        mass: 0.9,
        useNativeDriver: true,
      }),
    ]).start();

    // Hold, then exit — card falls away fast with ease-in-out.
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(cardTranslateY, {
          toValue: 600,
          duration: EXIT_MS,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 0,
          duration: EXIT_MS,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(cardScale, {
          toValue: 0.7,
          duration: EXIT_MS,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: EXIT_MS,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) hide();
      });
    }, ENTER_MS + HOLD_MS);

    return () => clearTimeout(timer);
  }, [visible, backdropOpacity, cardOpacity, cardScale, cardTranslateY, hide]);

  if (!visible || !data) return null;

  const formattedPrice = data.price
    ? `${data.price.replace(',', '.')}${data.currency}`
    : `—${data.currency}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      {/* Blurred/dimmed backdrop fades in with the card and out again. */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, { opacity: backdropOpacity }]}
      >
        <BlurView
          intensity={24}
          tint="dark"
          style={StyleSheet.absoluteFillObject}
        />
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: 'rgba(0,0,0,0.2)' },
          ]}
        />
      </Animated.View>

      <View style={styles.centerWrap} pointerEvents="none">
        <Animated.View
          style={[
            styles.card,
            {
              opacity: cardOpacity,
              transform: [
                { scale: cardScale },
                { translateY: cardTranslateY },
              ],
            },
          ]}
        >
          <View style={styles.logoWrap}>
            {data.logoUrl ? (
              <Image
                source={{ uri: data.logoUrl }}
                style={styles.logoImg}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.logoFallback}>
                <Text style={styles.logoFallbackText}>
                  {data.name.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.name} numberOfLines={1}>
            {data.name}
          </Text>
          <Text style={styles.price}>{formattedPrice}</Text>
          <Text style={styles.period}>{data.billingPeriod}</Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centerWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 28,
    alignItems: 'center',
    gap: 10,
    minWidth: 240,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 16 },
    elevation: 14,
  },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 6,
  },
  logoImg: {
    width: 56,
    height: 56,
  },
  logoFallback: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoFallbackText: {
    ...fontFamily.bold,
    fontSize: fontSize[32],
    color: '#8E8E93',
  },
  name: {
    ...fontFamily.bold,
    fontSize: fontSize[20],
    color: '#000000',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  price: {
    ...fontFamily.bold,
    fontSize: fontSize[24],
    color: '#000000',
    letterSpacing: -0.4,
  },
  period: {
    ...fontFamily.regular,
    fontSize: fontSize[14],
    color: '#8E8E93',
    letterSpacing: -0.1,
  },
});
