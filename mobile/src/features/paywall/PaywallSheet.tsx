// PaywallSheet — mobile port of the web's paywall.
//
// Opened via usePaywallStore.getState().open(trigger). Displays the
// contextual headline + subhead for the trigger, the shared benefits
// list, an annual / monthly plan toggle, and a "Continuar con Pro" CTA.
//
// Purchase integration is stubbed — tapping "Continuar con Pro" shows
// an informational alert. RevenueCat wiring can land later behind the
// same store interface.

import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Reanimated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, X } from 'lucide-react-native';

import { fontFamily, fontSize } from '../../design/typography';
import { usePaywallStore } from './usePaywallStore';
import { PAYWALL_BENEFITS, PAYWALL_COPY } from './paywallTriggers';
import {
  getCurrentOffering,
  purchasePackage,
  type RCOffering,
  type RCPackage,
} from '../../services/purchases';

const LOGO_SOURCE = require('../../../assets/logo.png');

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Derive the "per month" string shown under the annual plan from the
// package's numeric price + currency so it stays correct in any
// storefront. Falls back to a plain two-decimal EUR format if Intl
// fails on the runtime (some older Hermes builds).
function formatMonthly(amount: number, currency: string): string {
  try {
    return `${new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount)}/mes`;
  } catch {
    return `${amount.toFixed(2)}\u00A0${currency}/mes`;
  }
}

const ENTER_MS = 300;
const EXIT_MS = 220;

type Plan = 'annual' | 'monthly';

export function PaywallSheet() {
  const isOpen  = usePaywallStore((s) => s.isOpen);
  const close   = usePaywallStore((s) => s.close);
  const trigger = usePaywallStore((s) => s.trigger);
  const copy    = PAYWALL_COPY[trigger];

  const [plan, setPlan] = useState<Plan>('annual');
  const [mounted, setMounted] = useState(isOpen);
  const [offering, setOffering] = useState<RCOffering | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Fetch the current offering whenever the paywall opens. RC caches
  // internally, so re-opening after the first load is instant.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    getCurrentOffering().then((o) => {
      if (!cancelled) setOffering(o);
    });
    return () => { cancelled = true; };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      setPlan('annual');
      translateY.value = SCREEN_HEIGHT;
      translateY.value = withTiming(0, { duration: ENTER_MS });
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: ENTER_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else if (mounted) {
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: EXIT_MS }, (fin) => {
        if (fin) runOnJS(setMounted)(false);
      });
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: EXIT_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      'worklet';
      if (e.translationY > 0) {
        translateY.value = e.translationY;
      } else {
        translateY.value = e.translationY * 0.12;
      }
    })
    .onEnd((e) => {
      'worklet';
      const shouldDismiss = e.translationY > 120 || e.velocityY > 700;
      if (shouldDismiss) {
        translateY.value = withTiming(SCREEN_HEIGHT, { duration: EXIT_MS });
        runOnJS(close)();
      } else {
        translateY.value = withTiming(0, { duration: 200 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!mounted) return null;

  // Fallback strings used when the RC SDK isn't loaded yet (Expo Go /
  // first render before the offering resolves). Keep them aligned with
  // the dashboard so the layout doesn't jump when real data lands.
  const annualPkg  = offering?.annual;
  const monthlyPkg = offering?.monthly;
  const annualPrice  = annualPkg?.product.priceString  ?? '19,99\u20AC / a\u00F1o';
  const monthlyPrice = monthlyPkg?.product.priceString ?? '2,99\u20AC / mes';
  // Monthly-equivalent for the annual plan, computed so it stays right
  // whatever currency RC returns.
  const annualPerMonth = annualPkg?.product.price
    ? formatMonthly(annualPkg.product.price / 12, annualPkg.product.currencyCode)
    : '1,66\u20AC/mes';

  const handlePurchase = async () => {
    const pkg: RCPackage | undefined = plan === 'annual' ? annualPkg : monthlyPkg;
    if (!pkg) {
      Alert.alert(
        'No disponible',
        'Los planes de suscripci\u00F3n a\u00FAn no est\u00E1n configurados. Int\u00E9ntalo m\u00E1s tarde.',
      );
      return;
    }
    setPurchasing(true);
    const res = await purchasePackage(pkg);
    setPurchasing(false);
    if (res.cancelled) return;
    if (!res.ok) {
      Alert.alert('No se pudo completar la compra', res.error ?? 'Int\u00E9ntalo de nuevo');
      return;
    }
    // The customer-info listener in the subscriptions store flips
    // isPlusActive automatically — we just close the sheet.
    close();
  };

  return (
    <Modal
      visible={mounted}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={close}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          styles.backdrop,
          { opacity: backdropOpacity },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={close}
          accessibilityLabel="Cerrar paywall"
        />
      </Animated.View>

      <View style={styles.sheetWrap} pointerEvents="box-none">
        <Reanimated.View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16) + 12 },
            sheetStyle,
          ]}
        >
          <GestureDetector gesture={panGesture}>
            <View>
              <View style={styles.handleWrap}>
                <View style={styles.handle} />
              </View>

              <View style={styles.closeRow}>
                <Pressable
                  style={styles.closeBtn}
                  onPress={close}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar"
                >
                  <X size={15} color="#3C3C43" strokeWidth={2.5} />
                </Pressable>
              </View>
            </View>
          </GestureDetector>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Logo + headline */}
            <View style={styles.headerRow}>
              <View style={styles.logoBox}>
                <Image source={LOGO_SOURCE} style={styles.logoImg} resizeMode="cover" />
              </View>
              <View style={styles.headerTextCol}>
                <Text style={styles.brand}>Perezoso Pro</Text>
                <Text style={styles.headline} numberOfLines={2}>{copy.headline}</Text>
                <Text style={styles.subheadline} numberOfLines={2}>{copy.subheadline}</Text>
              </View>
            </View>

            {/* Benefits */}
            <View style={styles.benefitsCol}>
              {PAYWALL_BENEFITS.map((b) => (
                <View key={b.id} style={styles.benefitRow}>
                  <View style={styles.benefitDot}>
                    <Check size={11} color="#FFFFFF" strokeWidth={3} />
                  </View>
                  <Text style={styles.benefitText}>{b.text}</Text>
                </View>
              ))}
            </View>

            {/* Plan toggle */}
            <View style={styles.plansRow}>
              <PlanCard
                selected={plan === 'annual'}
                onPress={() => setPlan('annual')}
                label="Anual"
                price={annualPrice}
                badge="M\u00E1s popular"
                perMonth={annualPerMonth}
              />
              <PlanCard
                selected={plan === 'monthly'}
                onPress={() => setPlan('monthly')}
                label="Mensual"
                price={monthlyPrice}
              />
            </View>

            {/* CTA */}
            <Pressable
              onPress={handlePurchase}
              disabled={purchasing}
              style={({ pressed }) => [
                styles.ctaBtn,
                (pressed || purchasing) && { opacity: 0.85 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Continuar con Pro"
            >
              <Text style={styles.ctaText}>
                {purchasing ? 'Procesando...' : 'Continuar con Pro'}
              </Text>
            </Pressable>

            <Text style={styles.footer}>
              Cancela en cualquier momento desde Ajustes
            </Text>
          </ScrollView>
        </Reanimated.View>
      </View>
    </Modal>
  );
}

interface PlanCardProps {
  selected: boolean;
  onPress: () => void;
  label: string;
  price: string;
  badge?: string;
  perMonth?: string;
}

function PlanCard({ selected, onPress, label, price, badge, perMonth }: PlanCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.planCard,
        selected ? styles.planCardSelected : styles.planCardIdle,
        pressed && { opacity: 0.85 },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
    >
      {badge && (
        <View style={styles.planBadge}>
          <Text style={styles.planBadgeText}>{badge}</Text>
        </View>
      )}
      <Text style={styles.planLabel}>{label}</Text>
      <Text style={styles.planPrice}>{price}</Text>
      {perMonth ? <Text style={styles.planPerMonth}>{perMonth}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: SCREEN_HEIGHT * 0.92,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 4,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: -8 },
    elevation: 28,
  },

  handleWrap: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 9999,
    backgroundColor: '#D4D4D4',
  },
  closeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 4,
    paddingBottom: 2,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: { flexGrow: 0 },
  scrollContent: {
    paddingTop: 4,
    paddingBottom: 12,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 22,
  },
  logoBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F2F2F7',
  },
  logoImg: {
    width: 48,
    height: 48,
  },
  headerTextCol: {
    flex: 1,
  },
  brand: {
    ...fontFamily.semibold,
    fontSize: fontSize[13],
    color: '#616161',
    letterSpacing: -0.05,
    marginBottom: 2,
  },
  headline: {
    ...fontFamily.bold,
    fontSize: fontSize[18],
    color: '#000000',
    letterSpacing: -0.2,
    lineHeight: fontSize[18] * 1.2,
  },
  subheadline: {
    ...fontFamily.regular,
    fontSize: fontSize[13],
    color: '#616161',
    letterSpacing: -0.05,
    lineHeight: fontSize[13] * 1.3,
    marginTop: 2,
  },

  benefitsCol: {
    gap: 10,
    marginBottom: 22,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitDot: {
    width: 20,
    height: 20,
    borderRadius: 9999,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    ...fontFamily.regular,
    fontSize: fontSize[15],
    color: '#000000',
    letterSpacing: -0.1,
    flex: 1,
  },

  plansRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  planCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 2,
    padding: 12,
  },
  planCardIdle: {
    borderColor: '#E8E8E8',
    backgroundColor: '#FFFFFF',
  },
  planCardSelected: {
    borderColor: '#000000',
    backgroundColor: '#F5F5F5',
  },
  planBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0F0F0',
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
  },
  planBadgeText: {
    ...fontFamily.semibold,
    fontSize: 10,
    color: '#000000',
    letterSpacing: 0,
  },
  planLabel: {
    ...fontFamily.semibold,
    fontSize: fontSize[13],
    color: '#000000',
  },
  planPrice: {
    ...fontFamily.regular,
    fontSize: fontSize[13],
    color: '#000000',
    marginTop: 2,
  },
  planPerMonth: {
    ...fontFamily.regular,
    fontSize: 11,
    color: '#616161',
    marginTop: 2,
  },

  ctaBtn: {
    height: 52,
    borderRadius: 9999,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  ctaText: {
    ...fontFamily.semibold,
    fontSize: fontSize[16],
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
  footer: {
    ...fontFamily.regular,
    fontSize: 11,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 2,
  },
});
