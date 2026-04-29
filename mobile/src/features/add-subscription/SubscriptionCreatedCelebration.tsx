// SubscriptionCreatedCelebration — shown after a new subscription is
// created. A compact card materialises in the middle of the screen:
//   [Logo]  Name             Price
//           Category         Period
// Holds for a beat, then falls away (translate down + opacity fade +
// slight scale shrink). Total duration: ~2.5s. Tapping the card skips
// the hold and jumps straight to the exit.
//
// Rendered as its own <Modal> at the app root via _layout.tsx so it
// stacks above any content that happens to be underneath.

import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';

import { useSubscriptionCelebrationStore } from './useSubscriptionCelebrationStore';
import { fontFamily, fontSize } from '../../design/typography';
import { haptic } from '../../lib/haptics';

const ENTER_MS = 200;
const HOLD_MS = 400;
const EXIT_MS = 200;

export function SubscriptionCreatedCelebration() {
  const visible = useSubscriptionCelebrationStore((s) => s.visible);
  const data = useSubscriptionCelebrationStore((s) => s.data);
  const hide = useSubscriptionCelebrationStore((s) => s.hide);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.86)).current;
  const cardTranslateY = useRef(new Animated.Value(0)).current;

  // Timer for the hold → exit transition. Kept in a ref so the tap
  // handler can cancel it and trigger the exit immediately.
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitingRef = useRef(false);

  const startExit = useCallback(() => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    Animated.parallel([
      Animated.timing(cardTranslateY, {
        toValue: 600,
        duration: EXIT_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: EXIT_MS * 0.5,
        easing: Easing.out(Easing.quad),
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
        duration: EXIT_MS * 0.65,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) hide();
    });
  }, [backdropOpacity, cardOpacity, cardScale, cardTranslateY, hide]);

  useEffect(() => {
    if (!visible) return;

    // Reset values each time the celebration fires.
    exitingRef.current = false;
    haptic.success();
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

    // Hold, then exit.
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null;
      startExit();
    }, ENTER_MS + HOLD_MS);

    return () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
    };
  }, [visible, backdropOpacity, cardOpacity, cardScale, cardTranslateY, startExit]);

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

      <View style={styles.centerWrap} pointerEvents="box-none">
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
          {/* Tap anywhere on the card to skip the hold. */}
          <Pressable style={styles.cardInner} onPress={startExit}>
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

            <View style={styles.middleCol}>
              <Text style={styles.name} numberOfLines={1}>
                {data.name}
              </Text>
              {!!data.category && (
                <Text style={styles.category} numberOfLines={1}>
                  {data.category}
                </Text>
              )}
            </View>

            <View style={styles.rightCol}>
              <Text style={styles.price} numberOfLines={1}>
                {formattedPrice}
              </Text>
              <Text style={styles.period} numberOfLines={1}>
                {data.billingPeriod}
              </Text>
            </View>
          </Pressable>
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
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 16 },
    elevation: 14,
    maxWidth: 360,
    width: '100%',
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
  },
  logoWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImg: {
    width: 40,
    height: 40,
  },
  logoFallback: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoFallbackText: {
    ...fontFamily.semiBold,
    fontSize: fontSize[24],
    color: '#8E8E93',
  },
  middleCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 2,
  },
  name: {
    ...fontFamily.semiBold,
    fontSize: fontSize[18],
    color: '#000000',
    letterSpacing: -0.3,
  },
  category: {
    ...fontFamily.medium,
    fontSize: fontSize[13],
    color: '#8E8E93',
    letterSpacing: -0.1,
  },
  rightCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 2,
  },
  price: {
    ...fontFamily.semiBold,
    fontSize: fontSize[18],
    color: '#000000',
    letterSpacing: -0.3,
  },
  period: {
    ...fontFamily.medium,
    fontSize: fontSize[13],
    color: '#8E8E93',
    letterSpacing: -0.1,
  },
});
