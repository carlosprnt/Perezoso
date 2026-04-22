// PaywallSheet — premium paywall bottom sheet.
//
// Opened via usePaywallStore.open(trigger). Structured for maximum
// conversion clarity: branding → headline → benefits → plans → CTA.
// Annual plan is visually promoted as the default.

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
import { radius } from '../../design/radius';
import { haptic } from '../../lib/haptics';
import { usePaywallStore } from './usePaywallStore';
import { PAYWALL_BENEFITS, PAYWALL_COPY } from './paywallTriggers';
import {
  getCurrentOffering,
  purchasePackage,
  type RCOffering,
  type RCPackage,
} from '../../services/purchases';

const LOGO = require('../../../assets/logo.png');
const { height: SCREEN_H } = Dimensions.get('window');

function formatPerMonth(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

const ENTER_MS = 320;
const EXIT_MS = 240;

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
  const translateY = useSharedValue(SCREEN_H);
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    getCurrentOffering().then((o) => { if (!cancelled) setOffering(o); });
    return () => { cancelled = true; };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      setPlan('annual');
      translateY.value = SCREEN_H;
      translateY.value = withTiming(0, { duration: ENTER_MS });
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: ENTER_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else if (mounted) {
      translateY.value = withTiming(SCREEN_H, { duration: EXIT_MS }, (fin) => {
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
      translateY.value = e.translationY > 0
        ? e.translationY
        : e.translationY * 0.12;
    })
    .onEnd((e) => {
      'worklet';
      if (e.translationY > 120 || e.velocityY > 700) {
        translateY.value = withTiming(SCREEN_H, { duration: EXIT_MS });
        runOnJS(close)();
      } else {
        translateY.value = withTiming(0, { duration: 200 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!mounted) return null;

  // ── Pricing data (RC or fallback) ────────────────────────────────
  const annualPkg  = offering?.annual;
  const monthlyPkg = offering?.monthly;

  const annualPrice  = annualPkg?.product.priceString  ?? '19,99 €';
  const monthlyPrice = monthlyPkg?.product.priceString ?? '2,99 €';

  const annualPerMonth = annualPkg?.product.price
    ? formatPerMonth(annualPkg.product.price / 12, annualPkg.product.currencyCode)
    : '1,67 €';

  const savingsPercent = (() => {
    if (annualPkg?.product.price && monthlyPkg?.product.price) {
      const yearly = monthlyPkg.product.price * 12;
      return Math.round((1 - annualPkg.product.price / yearly) * 100);
    }
    return 44;
  })();

  // ── Purchase handler ─────────────────────────────────────────────
  const handlePurchase = async () => {
    const pkg: RCPackage | undefined = plan === 'annual' ? annualPkg : monthlyPkg;
    if (!pkg) {
      Alert.alert(
        'No disponible',
        'Los planes de suscripción aún no están configurados. Inténtalo más tarde.',
      );
      return;
    }
    haptic.light();
    setPurchasing(true);
    const res = await purchasePackage(pkg);
    setPurchasing(false);
    if (res.cancelled) return;
    if (!res.ok) {
      Alert.alert('No se pudo completar la compra', res.error ?? 'Inténtalo de nuevo');
      return;
    }
    haptic.success();
    close();
  };

  const ctaLabel = purchasing
    ? 'Procesando...'
    : plan === 'annual'
      ? 'Elegir plan anual'
      : 'Elegir plan mensual';

  return (
    <Modal
      visible={mounted}
      transparent
      statusBarTranslucent
      presentationStyle="overFullScreen"
      animationType="none"
      onRequestClose={close}
    >
      {/* Backdrop */}
      <Animated.View
        style={[StyleSheet.absoluteFillObject, styles.backdrop, { opacity: backdropOpacity }]}
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
            { paddingBottom: Math.max(insets.bottom, 20) + 8 },
            sheetStyle,
          ]}
        >
          {/* ── Handle + close ──────────────────────────────── */}
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
                  <X size={14} color="#3C3C43" strokeWidth={2.5} />
                </Pressable>
              </View>
            </View>
          </GestureDetector>

          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 4 }}
          >
            {/* ── 1. Branding ─────────────────────────────────── */}
            <View style={styles.brandingSection}>
              <View style={styles.logoContainer}>
                <Image source={LOGO} style={styles.logoImg} resizeMode="cover" />
              </View>
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>
            </View>

            {/* ── 2. Headline ─────────────────────────────────── */}
            <View style={styles.headlineSection}>
              <Text style={[styles.headline, !copy.subheadline && { marginBottom: 0 }]}>{copy.headline}</Text>
              {copy.subheadline ? (
                <Text style={styles.subheadline}>{copy.subheadline}</Text>
              ) : null}
            </View>

            {/* ── 3. Benefits ─────────────────────────────────── */}
            <View style={styles.benefitsSection}>
              {PAYWALL_BENEFITS.map((b, idx) => (
                <View key={b.id} style={styles.benefitRow}>
                  <View style={styles.benefitCheck}>
                    <Check size={10} color="#FFFFFF" strokeWidth={3} />
                  </View>
                  <View style={styles.benefitContent}>
                    <Text style={styles.benefitTitle}>{b.title}</Text>
                    <Text style={styles.benefitSubtitle}>{b.subtitle}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* ── 4. Plans ────────────────────────────────────── */}
            <View style={styles.plansSection}>
              {/* Annual — recommended */}
              <Pressable
                onPress={() => { haptic.selection(); setPlan('annual'); }}
                style={[
                  styles.planCard,
                  plan === 'annual' ? styles.planActive : styles.planIdle,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: plan === 'annual' }}
                accessibilityLabel="Plan anual"
              >
                <View style={styles.planHeader}>
                  <View style={styles.planRadio}>
                    {plan === 'annual' && <View style={styles.planRadioDot} />}
                  </View>
                  <View style={styles.planInfo}>
                    <View style={styles.planLabelRow}>
                      <Text style={[styles.planLabel, plan === 'annual' && styles.planLabelActive]}>
                        Anual
                      </Text>
                      <View style={styles.popularBadge}>
                        <Text style={styles.popularBadgeText}>Más popular</Text>
                      </View>
                    </View>
                    <Text style={[styles.planPrice, plan === 'annual' && styles.planPriceActive]}>
                      {annualPrice} / año
                    </Text>
                  </View>
                </View>

                <View style={styles.planFooter}>
                  <Text style={styles.planPerMonth}>
                    {annualPerMonth}/mes
                  </Text>
                  <View style={styles.savingsBadge}>
                    <Text style={styles.savingsBadgeText}>
                      Ahorra {savingsPercent}%
                    </Text>
                  </View>
                </View>
              </Pressable>

              {/* Monthly */}
              <Pressable
                onPress={() => { haptic.selection(); setPlan('monthly'); }}
                style={[
                  styles.planCard,
                  plan === 'monthly' ? styles.planActive : styles.planIdle,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: plan === 'monthly' }}
                accessibilityLabel="Plan mensual"
              >
                <View style={styles.planHeader}>
                  <View style={styles.planRadio}>
                    {plan === 'monthly' && <View style={styles.planRadioDot} />}
                  </View>
                  <View style={styles.planInfo}>
                    <Text style={[styles.planLabel, plan === 'monthly' && styles.planLabelActive]}>
                      Mensual
                    </Text>
                    <Text style={[styles.planPrice, plan === 'monthly' && styles.planPriceActive]}>
                      {monthlyPrice} / mes
                    </Text>
                  </View>
                </View>
              </Pressable>
            </View>

            {/* ── 5. CTA ──────────────────────────────────────── */}
            <Pressable
              onPress={handlePurchase}
              disabled={purchasing}
              style={({ pressed }) => [
                styles.ctaBtn,
                (pressed || purchasing) && { opacity: 0.88 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={ctaLabel}
            >
              <Text style={styles.ctaText}>{ctaLabel}</Text>
            </Pressable>

            {/* ── 6. Trust microcopy ──────────────────────────── */}
            <Text style={styles.trustText}>
              Cancela cuando quieras desde Ajustes
            </Text>
          </ScrollView>
        </Reanimated.View>
      </View>
    </Modal>
  );
}

// ── Styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: SCREEN_H * 0.92,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: -10 },
    elevation: 32,
  },

  // Handle + close
  handleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: radius.full,
    backgroundColor: '#D8D8DC',
  },
  closeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 2,
    paddingBottom: 0,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 1. Branding
  brandingSection: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F2F2F7',
    marginBottom: 8,
  },
  logoImg: {
    width: 56,
    height: 56,
  },
  proBadge: {
    backgroundColor: '#000000',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  proBadgeText: {
    ...fontFamily.bold,
    fontSize: 11,
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },

  // 2. Headline
  headlineSection: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 4,
  },
  headline: {
    ...fontFamily.bold,
    fontSize: fontSize[24],
    color: '#000000',
    textAlign: 'center',
    letterSpacing: -0.4,
    lineHeight: fontSize[24] * 1.2,
    marginBottom: 10,
  },
  subheadline: {
    ...fontFamily.regular,
    fontSize: fontSize[15],
    color: '#6B6B6B',
    textAlign: 'center',
    lineHeight: fontSize[15] * 1.45,
    letterSpacing: -0.1,
    paddingHorizontal: 4,
  },

  // 3. Benefits
  benefitsSection: {
    gap: 14,
    paddingBottom: 24,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  benefitCheck: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    ...fontFamily.semibold,
    fontSize: fontSize[15],
    color: '#1A1A1A',
    letterSpacing: -0.1,
  },
  benefitSubtitle: {
    ...fontFamily.regular,
    fontSize: fontSize[13],
    color: '#8E8E93',
    marginTop: 2,
  },

  // 4. Plans
  plansSection: {
    gap: 10,
    paddingBottom: 20,
  },
  planCard: {
    borderRadius: 16,
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  planActive: {
    borderColor: '#000000',
    backgroundColor: '#FAFAFA',
  },
  planIdle: {
    borderColor: '#E8E8E8',
    backgroundColor: '#FFFFFF',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  planRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D4D4D4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planRadioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#000000',
  },
  planInfo: {
    flex: 1,
  },
  planLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planLabel: {
    ...fontFamily.semibold,
    fontSize: fontSize[16],
    color: '#8E8E93',
    letterSpacing: -0.1,
  },
  planLabelActive: {
    color: '#000000',
  },
  planPrice: {
    ...fontFamily.regular,
    fontSize: fontSize[14],
    color: '#8E8E93',
    marginTop: 2,
  },
  planPriceActive: {
    color: '#4A4A4A',
  },

  popularBadge: {
    backgroundColor: '#000000',
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  popularBadgeText: {
    ...fontFamily.semibold,
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  planFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E8E8E8',
    marginLeft: 34,
  },
  planPerMonth: {
    ...fontFamily.regular,
    fontSize: fontSize[13],
    color: '#6B6B6B',
  },
  savingsBadge: {
    backgroundColor: '#ECFDF5',
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  savingsBadgeText: {
    ...fontFamily.semibold,
    fontSize: 11,
    color: '#16A34A',
    letterSpacing: 0.1,
  },

  // 5. CTA
  ctaBtn: {
    height: 54,
    borderRadius: radius.full,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    ...fontFamily.semibold,
    fontSize: fontSize[16],
    color: '#FFFFFF',
    letterSpacing: -0.15,
  },

  // 6. Trust
  trustText: {
    ...fontFamily.regular,
    fontSize: 12,
    color: '#AEAEB2',
    textAlign: 'center',
    marginTop: 12,
  },
});
