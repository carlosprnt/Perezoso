// AddSubscriptionOverlay — white iOS form sheet morphing from the FloatingNav `+` button.
//
// Animation technique
// ───────────────────
// Three sibling layers driven by `progress` (0 = closed → 1 = open):
//   1. Backdrop — full-screen translucent dimmer (opacity 0 → 0.4)
//   2. Morph layer — absolutely-positioned white rounded rect whose
//      left/top/width/height/borderRadius interpolate from the `+` trigger
//      rect to the final sheet dimensions. overflow:hidden clips content
//      during expansion — the pill IS the sheet growing into place.
//   3. Content — handle, header, form, footer. Fades in over the last
//      40% of the open morph so it never shows outside the shape bounds.
//
// Open: spring (no overshoot) — iOS-y, fast deceleration.
// Close: timing with ease-in-out, slightly shorter — snappy exit.
// Swipe-to-dismiss: Pan gesture on the handle area (activeOffsetY 10px).

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  runOnJS,
  interpolate,
  interpolateColor,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ChevronUp, ChevronDown } from 'lucide-react-native';

import { useAddSubscriptionStore } from './useAddSubscriptionStore';
import { fontFamily, fontSize } from '../../design/typography';
import { zIndex } from '../../design/zIndex';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ─── Animation config ─────────────────────────────────────────────────
const OPEN_SPRING = {
  damping: 32,
  stiffness: 300,
  mass: 0.9,
  overshootClamping: true,
} as const;

const CLOSE_TIMING = {
  duration: 260,
  easing: Easing.bezier(0.32, 0.72, 0, 1),
} as const;

// ─── Sheet geometry ───────────────────────────────────────────────────
const SHEET_MARGIN_H = 0;   // flush with sides
const SHEET_RADIUS_TOP = 32;
const SHEET_BOTTOM_MARGIN = 0; // flush with screen bottom

// ─── Swipe-to-dismiss ─────────────────────────────────────────────────
const DISMISS_DISTANCE = 100;
const DISMISS_VELOCITY = 600;

// ─── Form types ───────────────────────────────────────────────────────
type BillingPeriod = 'Monthly' | 'Yearly' | 'Weekly';
type Category = 'Streaming' | 'Música' | 'Productividad' | 'Cloud' | 'IA' | 'Gaming' | 'Otros';

interface FormState {
  name: string;
  currency: string;
  price: string;
  startDate: Date;
  nextPaymentDate: Date;
  billingPeriod: BillingPeriod;
  endEnabled: boolean;
  endDate: Date;
  category: Category;
  shared: boolean;
  logoUrl: string;
  notes: string;
}

const CURRENCIES = ['€', '$', '£', 'US$'];
const BILLING_PERIODS: BillingPeriod[] = ['Monthly', 'Yearly', 'Weekly'];
const CATEGORIES: Category[] = ['Streaming', 'Música', 'Productividad', 'Cloud', 'IA', 'Gaming', 'Otros'];

const MONTHS_ES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

function formatDate(d: Date): string {
  return `${d.getDate()} ${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`;
}

function nextMonth(d: Date): Date {
  const n = new Date(d);
  n.setMonth(n.getMonth() + 1);
  return n;
}

function initialForm(): FormState {
  const today = new Date();
  return {
    name: '',
    currency: '€',
    price: '',
    startDate: today,
    nextPaymentDate: nextMonth(today),
    billingPeriod: 'Monthly',
    endEnabled: false,
    endDate: new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()),
    category: 'Streaming',
    shared: false,
    logoUrl: '',
    notes: '',
  };
}

// ─── Sub-components ───────────────────────────────────────────────────

function FormDivider() {
  return <View style={styles.divider} />;
}

function DatePill({ date }: { date: Date }) {
  return (
    <View style={styles.datePill}>
      <Text style={styles.datePillText}>{formatDate(date)}</Text>
    </View>
  );
}

function SelectorValue({
  value,
  onCycle,
}: {
  value: string;
  onCycle: () => void;
}) {
  return (
    <Pressable style={styles.selectorRow} onPress={onCycle} hitSlop={8}>
      <Text style={styles.selectorText}>{value}</Text>
      <View style={styles.selectorChevrons}>
        <ChevronUp size={10} color="#8E8E93" strokeWidth={2.5} />
        <ChevronDown size={10} color="#8E8E93" strokeWidth={2.5} />
      </View>
    </Pressable>
  );
}

// ─── Main component ───────────────────────────────────────────────────

export function AddSubscriptionOverlay() {
  const insets = useSafeAreaInsets();
  const isOpen = useAddSubscriptionStore((s) => s.isOpen);
  const triggerRect = useAddSubscriptionStore((s) => s.triggerRect);
  const close = useAddSubscriptionStore((s) => s.close);

  const [mounted, setMounted] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);

  const progress = useSharedValue(0);
  const swipeY = useSharedValue(0);

  const { width: screenW, height: screenH } = Dimensions.get('window');
  const sheetW = screenW - SHEET_MARGIN_H * 2;
  const sheetX = SHEET_MARGIN_H;
  const sheetH = screenH; // full height — footer + safe area handle padding inside
  const sheetY = SHEET_BOTTOM_MARGIN;

  // Snapshot trigger primitives for worklet closures
  const rx = triggerRect?.x ?? 0;
  const ry = triggerRect?.y ?? 0;
  const rw = triggerRect?.width ?? 0;
  const rh = triggerRect?.height ?? 0;
  const rr = triggerRect?.borderRadius ?? 0;

  // Mount when store opens
  useEffect(() => {
    if (isOpen && triggerRect && !mounted) {
      setForm(initialForm());
      setMounted(true);
    }
  }, [isOpen, triggerRect, mounted]);

  // Drive animation
  useEffect(() => {
    if (!mounted) return;
    if (isOpen) {
      progress.value = withSpring(1, OPEN_SPRING, (finished) => {
        if (finished) runOnJS(setInteractive)(true);
      });
    } else {
      setInteractive(false);
      progress.value = withTiming(0, CLOSE_TIMING, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
  }, [mounted, isOpen, progress]);

  // ─── Animated styles ──────────────────────────────────────────────
  const morphStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      left: interpolate(p, [0, 1], [rx, sheetX], Extrapolation.CLAMP),
      top: interpolate(p, [0, 1], [ry, sheetY], Extrapolation.CLAMP) + swipeY.value,
      width: interpolate(p, [0, 1], [rw, sheetW], Extrapolation.CLAMP),
      height: interpolate(p, [0, 1], [rh, sheetH], Extrapolation.CLAMP),
      borderTopLeftRadius: interpolate(p, [0, 1], [rr, SHEET_RADIUS_TOP], Extrapolation.CLAMP),
      borderTopRightRadius: interpolate(p, [0, 1], [rr, SHEET_RADIUS_TOP], Extrapolation.CLAMP),
      borderBottomLeftRadius: interpolate(p, [0, 1], [rr, 0], Extrapolation.CLAMP),
      borderBottomRightRadius: interpolate(p, [0, 1], [rr, 0], Extrapolation.CLAMP),
      // Morph bg from the button's color (#000) to white so the growing
      // pill reads as a continuous surface with the trigger
      backgroundColor: interpolateColor(p, [0, 0.25], ['#000000', '#FFFFFF']),
    };
  });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
  }));

  // Content fades + slides in over the last 35% of the open morph
  const contentStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, [0.65, 1], [0, 1], Extrapolation.CLAMP),
      transform: [
        { translateY: interpolate(p, [0.65, 1], [20, 0], Extrapolation.CLAMP) },
      ],
    };
  });

  const handleBackdropPress = useCallback(() => {
    if (interactive) close();
  }, [interactive, close]);

  // Swipe-to-dismiss attached to the handle + header region
  const panGesture = Gesture.Pan()
    .activeOffsetY(10)
    .failOffsetY(-10)
    .onUpdate((e) => {
      'worklet';
      if (e.translationY > 0) swipeY.value = e.translationY;
    })
    .onEnd((e) => {
      'worklet';
      if (e.translationY > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY) {
        runOnJS(close)();
      }
      swipeY.value = withTiming(0, { duration: 240 });
    });

  // ─── Form field helpers ───────────────────────────────────────────
  const cycleCurrency = useCallback(() => {
    setForm((f) => {
      const idx = CURRENCIES.indexOf(f.currency);
      return { ...f, currency: CURRENCIES[(idx + 1) % CURRENCIES.length] };
    });
  }, []);

  const cycleBilling = useCallback(() => {
    setForm((f) => {
      const idx = BILLING_PERIODS.indexOf(f.billingPeriod);
      return { ...f, billingPeriod: BILLING_PERIODS[(idx + 1) % BILLING_PERIODS.length] };
    });
  }, []);

  const cycleCategory = useCallback(() => {
    setForm((f) => {
      const idx = CATEGORIES.indexOf(f.category);
      return { ...f, category: CATEGORIES[(idx + 1) % CATEGORIES.length] };
    });
  }, []);

  if (!mounted || !triggerRect) return null;

  const footerPb = Math.max(insets.bottom, 20);

  return (
    <View style={styles.root} pointerEvents="box-none">
      {/* Backdrop */}
      <AnimatedPressable
        style={[styles.backdrop, backdropStyle]}
        onPress={handleBackdropPress}
      />

      {/* Morph layer — white pill expanding into the sheet */}
      <Animated.View
        style={[styles.morph, morphStyle]}
        pointerEvents={interactive ? 'auto' : 'none'}
      >
        {/* Fixed content slot sized to final sheet dimensions */}
        <View style={{ width: sheetW, height: sheetH }}>
          <Animated.View style={[{ flex: 1 }, contentStyle]}>
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={0}
            >
              {/* ── Handle + swipe-to-dismiss zone ─────────────── */}
              <GestureDetector gesture={panGesture}>
                <View style={styles.handleZone}>
                  <View style={styles.handle} />
                </View>
              </GestureDetector>

              {/* ── Header ─────────────────────────────────────── */}
              <View style={styles.header}>
                <Text style={styles.title}>Crear nueva suscripción</Text>
                <Pressable
                  style={styles.closeBtn}
                  onPress={close}
                  hitSlop={10}
                  accessibilityLabel="Cerrar"
                >
                  <X size={15} color="#3C3C43" strokeWidth={2.5} />
                </Pressable>
              </View>

              {/* ── Scrollable form ─────────────────────────────── */}
              <ScrollView
                style={styles.scroll}
                contentContainerStyle={[
                  styles.scrollContent,
                  { paddingBottom: footerPb + 80 },
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
              >
                {/* ── Platform card ─────────────────────────────── */}
                <View style={styles.platformCard}>
                  <TextInput
                    style={styles.platformName}
                    value={form.name}
                    onChangeText={(t) => setForm((f) => ({ ...f, name: t }))}
                    placeholder="Nombre de la suscripción"
                    placeholderTextColor="#C7C7CC"
                    returnKeyType="done"
                    autoCorrect={false}
                  />
                  <View style={styles.priceRow}>
                    <Pressable
                      style={styles.currencyPill}
                      onPress={cycleCurrency}
                      hitSlop={8}
                    >
                      <Text style={styles.currencyText}>{form.currency}</Text>
                      <View style={styles.currencyChevrons}>
                        <ChevronUp size={9} color="#8E8E93" strokeWidth={2.5} />
                        <ChevronDown size={9} color="#8E8E93" strokeWidth={2.5} />
                      </View>
                    </Pressable>
                    <TextInput
                      style={styles.priceInput}
                      value={form.price}
                      onChangeText={(t) => setForm((f) => ({ ...f, price: t }))}
                      placeholder="0.00"
                      placeholderTextColor="#C7C7CC"
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                    />
                  </View>
                </View>

                {/* ── Grouped list: dates + billing ─────────────── */}
                <View style={styles.group}>
                  {/* Inicio de suscripción */}
                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>Inicio de suscripción</Text>
                    <DatePill date={form.startDate} />
                  </View>

                  <FormDivider />

                  {/* Próxima fecha de pago */}
                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>Próxima fecha de pago</Text>
                    <DatePill date={form.nextPaymentDate} />
                  </View>

                  <FormDivider />

                  {/* Importe / billing period */}
                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>Importe</Text>
                    <SelectorValue value={form.billingPeriod} onCycle={cycleBilling} />
                  </View>

                  <FormDivider />

                  {/* Fin de la suscripción */}
                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>Fin de la suscripción</Text>
                    <Switch
                      value={form.endEnabled}
                      onValueChange={(v) => setForm((f) => ({ ...f, endEnabled: v }))}
                      trackColor={{ false: '#E5E5EA', true: '#34C759' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  {/* End date row — revealed when switch is on */}
                  {form.endEnabled && (
                    <>
                      <FormDivider />
                      <View style={styles.row}>
                        <Text style={[styles.rowLabel, styles.rowLabelIndented]}>
                          Fecha de fin
                        </Text>
                        <DatePill date={form.endDate} />
                      </View>
                    </>
                  )}
                </View>

                {/* ── Categoría ─────────────────────────────────── */}
                <View style={styles.group}>
                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>Categoría</Text>
                    <SelectorValue value={form.category} onCycle={cycleCategory} />
                  </View>
                </View>

                {/* ── Suscripción compartida ─────────────────────── */}
                <View style={styles.group}>
                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>Suscripción compartida</Text>
                    <Switch
                      value={form.shared}
                      onValueChange={(v) => setForm((f) => ({ ...f, shared: v }))}
                      trackColor={{ false: '#E5E5EA', true: '#34C759' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                </View>

                {/* ── URL del logo + Notas ───────────────────────── */}
                <View style={styles.group}>
                  {/* URL del logo */}
                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>URL del logo</Text>
                    <View style={styles.urlRow}>
                      <TextInput
                        style={styles.urlInput}
                        value={form.logoUrl}
                        onChangeText={(t) => setForm((f) => ({ ...f, logoUrl: t }))}
                        placeholder="https://..."
                        placeholderTextColor="#C7C7CC"
                        keyboardType="url"
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="done"
                        numberOfLines={1}
                      />
                      {form.logoUrl.length > 0 && (
                        <Pressable
                          onPress={() => setForm((f) => ({ ...f, logoUrl: '' }))}
                          hitSlop={8}
                          style={styles.urlClear}
                        >
                          <X size={12} color="#8E8E93" strokeWidth={2.5} />
                        </Pressable>
                      )}
                    </View>
                  </View>

                  <FormDivider />

                  {/* Notas */}
                  <View style={styles.notesRow}>
                    <Text style={styles.rowLabel}>Notas</Text>
                    <TextInput
                      style={styles.notesInput}
                      value={form.notes}
                      onChangeText={(t) => setForm((f) => ({ ...f, notes: t }))}
                      placeholder="Añade una nota..."
                      placeholderTextColor="#C7C7CC"
                      multiline
                      textAlignVertical="top"
                      returnKeyType="default"
                    />
                  </View>
                </View>
              </ScrollView>

              {/* ── Footer ──────────────────────────────────────── */}
              <View style={[styles.footer, { paddingBottom: footerPb }]}>
                <Pressable
                  style={({ pressed }) => [
                    styles.cancelBtn,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={close}
                >
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.createBtn,
                    pressed && { opacity: 0.85 },
                  ]}
                  onPress={() => {
                    // TODO: validate + persist form.
                    close();
                  }}
                >
                  <Text style={styles.createBtnText}>Crear suscripción</Text>
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: zIndex.sheetBackdrop,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  morph: {
    position: 'absolute',
    overflow: 'hidden',
  },

  // ── Handle ──────────────────────────────────────────────────────
  handleZone: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 6,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D1D6',
  },

  // ── Header ──────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    ...fontFamily.bold,
    fontSize: fontSize[20],
    color: '#000000',
    letterSpacing: -0.4,
    flexShrink: 1,
    paddingRight: 12,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EBEBF0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Scroll ──────────────────────────────────────────────────────
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },

  // ── Platform card ────────────────────────────────────────────────
  platformCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  platformName: {
    ...fontFamily.bold,
    fontSize: fontSize[20],
    color: '#000000',
    letterSpacing: -0.3,
    marginBottom: 10,
    padding: 0,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  currencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  currencyText: {
    ...fontFamily.semibold,
    fontSize: fontSize[15],
    color: '#000000',
    letterSpacing: -0.1,
  },
  currencyChevrons: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  priceInput: {
    ...fontFamily.regular,
    fontSize: fontSize[18],
    color: '#C7C7CC',
    letterSpacing: -0.2,
    padding: 0,
    flex: 1,
  },

  // ── Grouped list ─────────────────────────────────────────────────
  group: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA',
    overflow: 'hidden',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E5EA',
    marginLeft: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
  },
  rowLabel: {
    ...fontFamily.regular,
    fontSize: fontSize[16],
    color: '#000000',
    letterSpacing: -0.1,
    flexShrink: 1,
    paddingRight: 12,
  },
  rowLabelIndented: {
    color: '#8E8E93',
    fontSize: fontSize[15],
  },

  // ── Date pill ────────────────────────────────────────────────────
  datePill: {
    backgroundColor: '#F2F2F7',
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  datePillText: {
    ...fontFamily.regular,
    fontSize: fontSize[15],
    color: '#000000',
    letterSpacing: -0.1,
  },

  // ── Selector value ───────────────────────────────────────────────
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectorText: {
    ...fontFamily.regular,
    fontSize: fontSize[16],
    color: '#8E8E93',
    letterSpacing: -0.1,
  },
  selectorChevrons: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },

  // ── URL + notes ──────────────────────────────────────────────────
  urlRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    minWidth: 0,
  },
  urlInput: {
    ...fontFamily.regular,
    fontSize: fontSize[15],
    color: '#8E8E93',
    letterSpacing: -0.1,
    flex: 1,
    textAlign: 'right',
    padding: 0,
  },
  urlClear: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  notesInput: {
    ...fontFamily.regular,
    fontSize: fontSize[15],
    color: '#000000',
    letterSpacing: -0.1,
    marginTop: 8,
    minHeight: 60,
    padding: 0,
  },

  // ── Footer ───────────────────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    ...fontFamily.semibold,
    fontSize: fontSize[16],
    color: '#000000',
    letterSpacing: -0.2,
  },
  createBtn: {
    flex: 2,
    height: 52,
    borderRadius: 9999,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtnText: {
    ...fontFamily.semibold,
    fontSize: fontSize[16],
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
});
