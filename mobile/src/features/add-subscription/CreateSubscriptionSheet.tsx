// CreateSubscriptionSheet — native iOS pageSheet.
//
// Behaviour:
//  · Opens via RN <Modal presentationStyle="pageSheet"> — UIKit owns the
//    presentation curve, the rounded top corners, the dimmed backdrop,
//    AND the pan-down-to-dismiss gesture. No custom PanResponder, no
//    custom translateY animation: the sheet behaves exactly like Apple's
//    own Mail/Calendar/Wallet modals.
//  · Dropdowns via FloatingOptionMenu (anchored light pull-down, iOS UIMenu)
//  · Date fields via NativeDatePickerSheet (iOS inline calendar, floating)
//  · Dirty-form protection: the explicit Cancel / X button fires an Alert.
//    Swipe-to-dismiss is a native iOS gesture and can't be cancelled from
//    JS — we sync state via `onDismiss` so the store matches the visual
//    state, matching the convention users expect from Apple's own apps.
//  · Validation: name + price required; inline error banner above scroll
//  · Submit: spinner → celebration card (fired 380ms after Modal closes)

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, ChevronDown, Minus, Plus, X } from 'lucide-react-native';

import { useCreateSubscriptionStore } from './useCreateSubscriptionStore';
import { NativeDatePickerSheet } from './pickers/NativeDatePickerSheet';
import { DayRulerPicker } from './pickers/DayRulerPicker';
import { FloatingOptionMenu, MenuAnchor } from '../../components/FloatingOptionMenu';
import { CurrencySheet, currencySymbol } from '../settings/CurrencySheet';
import type { Currency } from '../settings/CurrencySheet';
import { useSubscriptionCelebrationStore } from './useSubscriptionCelebrationStore';
import { fontFamily, fontSize } from '../../design/typography';
import { radius } from '../../design/radius';
import { useSubscriptionsStore } from '../../stores/subscriptionsStore';
import { useTagsStore } from '../settings/useSettingsStore';
import { usePaywallStore } from '../paywall/usePaywallStore';
import { haptic } from '../../lib/haptics';
import { formatDate } from '../../lib/formatting';
import type {
  BillingPeriod as SubBillingPeriod,
  Category as SubCategory,
  Subscription,
  SubscriptionStatus,
} from '../subscriptions/types';

// ─── Label → store-key mappings ──────────────────────────────────────
// The form exposes localized / title-case labels for UX; the store
// keeps normalized lowercase keys (matches what presets + web use).
const BILLING_KEY: Record<string, SubBillingPeriod> = {
  Monthly: 'monthly',
  Yearly: 'yearly',
  Quarterly: 'quarterly',
  Weekly: 'weekly',
  Custom: 'monthly',
};
const CATEGORY_KEY: Record<string, SubCategory> = {
  Streaming: 'streaming',
  'Música': 'music',
  Productividad: 'productivity',
  Cloud: 'cloud',
  IA: 'ai',
  Gaming: 'gaming',
  Otros: 'other',
};
const STATUS_KEY: Record<string, SubscriptionStatus> = {
  Activa: 'active',
  Pausada: 'paused',
  Cancelada: 'cancelled',
  Finalizado: 'ended',
};

// Convert the form price + billing period into a normalized monthly
// equivalent (EUR/etc per month). Matches how preset-seeded subs are
// computed — downstream dashboard math assumes this field is correct.
function monthlyEquivalent(priceAmount: number, billingKey: SubBillingPeriod): number {
  switch (billingKey) {
    case 'yearly':    return priceAmount / 12;
    case 'quarterly': return priceAmount / 3;
    case 'weekly':    return (priceAmount * 52) / 12;
    case 'monthly':
    default:          return priceAmount;
  }
}

// ─── Types ───────────────────────────────────────────────────────────
type BillingPeriod = 'Monthly' | 'Yearly' | 'Quarterly' | 'Weekly' | 'Custom';
type Status = 'Activa' | 'Pausada' | 'Cancelada' | 'Finalizado';
type ReminderDays = '1 día antes' | '3 días antes' | '7 días antes';
type DateKey = 'start' | 'next' | 'end' | null;
type PickerKey = 'billing' | 'category' | 'status' | 'reminder' | null;

interface FormState {
  name: string;
  currency: string;
  price: string;
  startDate: Date;
  nextPaymentDate: Date;
  billingPeriod: BillingPeriod;
  endEnabled: boolean;
  endDate: Date;
  category: string;
  status: Status;
  reminderEnabled: boolean;
  reminderDays: ReminderDays;
  shared: boolean;
  sharedCount: number;
  paymentMethod: string;
  logoUrl: string;
  notes: string;
}

// ─── Constants ───────────────────────────────────────────────────────
const BILLING_PERIODS: BillingPeriod[] = ['Monthly', 'Yearly', 'Quarterly', 'Weekly', 'Custom'];
const BASE_CATEGORIES = [
  'Streaming', 'Música', 'Productividad', 'Cloud', 'IA', 'Gaming', 'Otros',
];
const STATUSES: Status[] = ['Activa', 'Pausada', 'Cancelada', 'Finalizado'];
const REMINDER_OPTIONS: ReminderDays[] = ['1 día antes', '3 días antes', '7 días antes'];
function nextMonth(d: Date): Date {
  const n = new Date(d);
  n.setMonth(n.getMonth() + 1);
  return n;
}
function makeInitialForm(prefill: { name?: string; logoUrl?: string; category?: string } | null): FormState {
  const today = new Date();
  return {
    name: prefill?.name ?? '',
    currency: 'EUR',
    price: '',
    startDate: today,
    nextPaymentDate: nextMonth(today),
    billingPeriod: 'Monthly',
    endEnabled: false,
    endDate: new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()),
    category: prefill?.category ?? 'Streaming',
    status: 'Activa',
    reminderEnabled: false,
    reminderDays: '1 día antes',
    shared: false,
    sharedCount: 2,
    paymentMethod: '',
    logoUrl: prefill?.logoUrl ?? '',
    notes: '',
  };
}
function formIsEqual(a: FormState, b: FormState): boolean {
  return (
    a.name === b.name &&
    a.currency === b.currency &&
    a.price === b.price &&
    a.startDate.getTime() === b.startDate.getTime() &&
    a.nextPaymentDate.getTime() === b.nextPaymentDate.getTime() &&
    a.billingPeriod === b.billingPeriod &&
    a.endEnabled === b.endEnabled &&
    a.endDate.getTime() === b.endDate.getTime() &&
    a.category === b.category &&
    a.status === b.status &&
    a.reminderEnabled === b.reminderEnabled &&
    a.reminderDays === b.reminderDays &&
    a.shared === b.shared &&
    a.sharedCount === b.sharedCount &&
    a.paymentMethod === b.paymentMethod &&
    a.logoUrl === b.logoUrl &&
    a.notes === b.notes
  );
}

// ─── Sub-components ──────────────────────────────────────────────────
function FormDivider() { return <View style={styles.divider} />; }

function DatePillBtn({ date, onPress }: { date: Date; onPress: () => void }) {
  return (
    <Pressable style={styles.datePill} onPress={onPress} hitSlop={8}>
      <Text style={styles.datePillText}>{formatDate(date)}</Text>
    </Pressable>
  );
}

function DropdownBtn({ value, onPress }: { value: string; onPress: () => void }) {
  return (
    <Pressable style={styles.dropdownRow} onPress={onPress} hitSlop={8}>
      <Text style={styles.dropdownText}>{value}</Text>
      <ChevronDown size={14} color="#8E8E93" strokeWidth={2.5} />
    </Pressable>
  );
}

// ─── Renewal period toggle with vertical slide animation ────────────
const TOGGLE_H = 28;

function RenewalToggle({ isMonthly, onToggle, compact }: { isMonthly: boolean; onToggle: () => void; compact?: boolean }) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const [displayLabel, setDisplayLabel] = useState(isMonthly ? 'Mes' : 'Año');

  const updateLabel = useCallback((monthly: boolean) => {
    setDisplayLabel(monthly ? 'Mes' : 'Año');
  }, []);

  const animateToggle = useCallback(() => {
    haptic.selection();
    const nextIsMonthly = !isMonthly;
    translateY.value = withTiming(TOGGLE_H, { duration: 150, easing: Easing.in(Easing.quad) });
    opacity.value = withTiming(0, { duration: 150 }, () => {
      runOnJS(updateLabel)(nextIsMonthly);
      translateY.value = -TOGGLE_H;
      opacity.value = 0;
      translateY.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.quad) });
      opacity.value = withTiming(1, { duration: 200 });
    });
    onToggle();
  }, [isMonthly, onToggle, translateY, opacity, updateLabel]);

  const labelAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const h = compact ? 20 : TOGGLE_H;

  return (
    <View style={[styles.renewalRow, compact && { marginTop: 10, paddingVertical: 10 }]}>
      <Text style={[styles.renewalRowLabel, compact && { fontSize: fontSize[14] }]}>Renovación</Text>
      <Pressable onPress={animateToggle} hitSlop={12}>
        <View style={[styles.renewalValueWrap, { height: h }]}>
          <Animated.Text style={[styles.renewalValue, compact && { fontSize: fontSize[16] }, labelAnimStyle]}>
            {displayLabel}
          </Animated.Text>
        </View>
      </Pressable>
    </View>
  );
}

// ─── Main component ──────────────────────────────────────────────────
export function CreateSubscriptionSheet() {
  const isOpen = useCreateSubscriptionStore((s) => s.isOpen);
  const prefill = useCreateSubscriptionStore((s) => s.prefill);
  const closeStore = useCreateSubscriptionStore((s) => s.close);
  const insets = useSafeAreaInsets();
  const tags = useTagsStore((s) => s.tags);
  const isPlusActive = useSubscriptionsStore((s) => s.isPlusActive);
  const allCategories = [...BASE_CATEGORIES, ...tags.map((t) => t.name)];

  const [step, setStep] = useState<1 | 2>(1);
  const [renewalDate, setRenewalDate] = useState<Date>(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setMonth(d.getMonth() + 1); return d;
  });
  const [form, setForm] = useState<FormState>(() => makeInitialForm(null));
  const initialFormRef = useRef<FormState>(makeInitialForm(null));

  const [openDate, setOpenDate] = useState<DateKey>(null);
  const [openPicker, setOpenPicker] = useState<PickerKey>(null);
  const [pickerAnchor, setPickerAnchor] = useState<MenuAnchor | null>(null);
  const [currencySheetOpen, setCurrencySheetOpen] = useState(false);
  const [renewalDatePickerOpen, setRenewalDatePickerOpen] = useState(false);
  const [kbHeight, setKbHeight] = useState(0);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Step transition animation ─────────────────────────────────────
  const step1Opacity = useSharedValue(1);
  const step1TranslateY = useSharedValue(0);
  const step1Scale = useSharedValue(1);
  const step2Opacity = useSharedValue(1);
  const step2Scale = useSharedValue(1);

  const step1AnimStyle = useAnimatedStyle(() => ({
    opacity: step1Opacity.value,
    transform: [
      { translateY: step1TranslateY.value },
      { scale: step1Scale.value },
    ],
  }));

  const step2AnimStyle = useAnimatedStyle(() => ({
    opacity: step2Opacity.value,
    transform: [{ scale: step2Scale.value }],
  }));

  // Refs for each dropdown trigger — used for measureInWindow to anchor the menu.
  const billingRef = useRef<View>(null);
  const categoryRef = useRef<View>(null);
  const statusRef = useRef<View>(null);
  const reminderRef = useRef<View>(null);

  const isDirty = useCallback(
    () => !formIsEqual(form, initialFormRef.current),
    [form],
  );

  // ── Reset form whenever the sheet re-opens ────────────────────────
  // No custom animation — native iOS pageSheet owns the slide-up.
  useEffect(() => {
    if (isOpen) {
      const fresh = makeInitialForm(prefill);
      initialFormRef.current = fresh;
      setForm(fresh);
      setStep(1);
      const nextMonth = new Date(); nextMonth.setHours(0, 0, 0, 0); nextMonth.setMonth(nextMonth.getMonth() + 1);
      setRenewalDate(nextMonth);
      setError(null);
      setCurrencySheetOpen(false);
      setRenewalDatePickerOpen(false);
      setKbHeight(0);
      setIsSubmitting(false);
      setOpenDate(null);
      setOpenPicker(null);
      step1Opacity.value = 1;
      step1TranslateY.value = 0;
      step1Scale.value = 1;
      step2Opacity.value = 1;
      step2Scale.value = 1;
    }
  }, [isOpen, prefill]);

  // ── Keyboard tracking (step 1 — pageSheet needs manual handling) ──
  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', (e) => {
      LayoutAnimation.configureNext(LayoutAnimation.create(e.duration, LayoutAnimation.Types.keyboard, LayoutAnimation.Properties.opacity));
      setKbHeight(e.endCoordinates.height);
    });
    const hide = Keyboard.addListener('keyboardWillHide', (e) => {
      LayoutAnimation.configureNext(LayoutAnimation.create(e.duration, LayoutAnimation.Types.keyboard, LayoutAnimation.Properties.opacity));
      setKbHeight(0);
    });
    return () => { show.remove(); hide.remove(); };
  }, []);

  // ── Confirm + close ───────────────────────────────────────────────
  const requestClose = useCallback(() => {
    if (isDirty()) {
      Alert.alert(
        'Descartar cambios',
        '¿Seguro que quieres salir? Perderás los datos introducidos.',
        [
          { text: 'Seguir editando', style: 'cancel' },
          { text: 'Descartar', style: 'destructive', onPress: closeStore },
        ],
      );
    } else {
      closeStore();
    }
  }, [isDirty, closeStore]);

  // ── Native sheet dismissal sync ───────────────────────────────────
  // Fires after the user swipes the iOS pageSheet down. The store must
  // be updated because React is otherwise unaware the Modal closed.
  const handleNativeDismiss = useCallback(() => {
    if (isOpen) closeStore();
  }, [isOpen, closeStore]);

  // ── Anchor measurement helpers ────────────────────────────────────
  const openPickerAt = useCallback(
    (ref: React.RefObject<View | null>, key: Exclude<PickerKey, null>) => {
      const node = ref.current;
      if (node) {
        node.measureInWindow((x, y, width, height) => {
          setPickerAnchor({ x, y, width, height });
          setOpenPicker(key);
        });
      }
    },
    [],
  );

  // ── Steppers ─────────────────────────────────────────────────────
  const decShared = useCallback(() =>
    setForm((f) => ({ ...f, sharedCount: Math.max(2, f.sharedCount - 1) })), []);
  const incShared = useCallback(() =>
    setForm((f) => ({ ...f, sharedCount: Math.min(10, f.sharedCount + 1) })), []);

  // ── Submit (shared) ────────────────────────────────────────────────
  const doSubmit = useCallback(async (f: FormState) => {
    if (!f.name.trim()) {
      setError('El nombre de la suscripción es obligatorio.');
      return;
    }
    const priceNum = parseFloat(f.price.replace(',', '.'));
    if (!f.price.trim() || isNaN(priceNum) || priceNum <= 0) {
      setError('Introduce un precio válido.');
      return;
    }
    setError(null);
    haptic.light();
    setIsSubmitting(true);
    try {
      const billingKey = BILLING_KEY[f.billingPeriod] ?? 'monthly';
      const monthly = monthlyEquivalent(priceNum, billingKey);
      const myMonthly = f.shared && f.sharedCount > 1
        ? monthly / f.sharedCount
        : monthly;
      const nowISO = new Date().toISOString();
      const newSub: Subscription = {
        id: `local-${Date.now()}`,
        name: f.name.trim(),
        logo_url: f.logoUrl || null,
        category: CATEGORY_KEY[f.category] ?? f.category,
        price_amount: priceNum,
        currency: f.currency,
        billing_period: billingKey,
        billing_interval_count: 1,
        next_billing_date: f.nextPaymentDate.toISOString().split('T')[0],
        status: STATUS_KEY[f.status] ?? 'active',
        is_shared: f.shared,
        shared_with_count: f.shared ? f.sharedCount : 0,
        card_color: null,
        created_at: nowISO,
        updated_at: nowISO,
        monthly_equivalent_cost: Number(monthly.toFixed(2)),
        my_monthly_cost: Number(myMonthly.toFixed(2)),
        reminderEnabled: f.reminderEnabled,
        reminderDays: f.reminderDays,
        notes: f.notes || undefined,
        start_date: f.startDate.toISOString().split('T')[0],
        end_date: f.endEnabled
          ? f.endDate.toISOString().split('T')[0]
          : undefined,
        payment_method: f.paymentMethod || undefined,
      };
      await useSubscriptionsStore.getState().addSubscription(newSub);

      setIsSubmitting(false);
      closeStore();
      setTimeout(() => {
        useSubscriptionCelebrationStore.getState().show({
          name: f.name,
          price: f.price,
          currency: currencySymbol(f.currency),
          billingPeriod: f.billingPeriod,
          category: f.category,
          logoUrl: f.logoUrl || undefined,
        });
      }, 380);
    } catch {
      setIsSubmitting(false);
      setError('No se pudo crear la suscripción. Inténtalo de nuevo.');
    }
  }, [closeStore]);

  const handleSubmit = useCallback(() => doSubmit(form), [form, doSubmit]);

  const handleQuickSave = useCallback(() => {
    doSubmit({ ...form, nextPaymentDate: renewalDate });
  }, [form, renewalDate, doSubmit]);

  const enterStep2 = useCallback(() => {
    step2Opacity.value = 0;
    step2Scale.value = 0.99;
    setStep(2);
    step2Opacity.value = withTiming(1, { duration: 500, easing: Easing.bezierFn(0.25, 0.1, 0.25, 1) });
    step2Scale.value = withTiming(1, { duration: 500, easing: Easing.bezierFn(0.25, 0.1, 0.25, 1) });
    step1Opacity.value = 1;
    step1TranslateY.value = 0;
    step1Scale.value = 1;
  }, [step1Opacity, step1TranslateY, step1Scale, step2Opacity, step2Scale]);

  const goToMoreOptions = useCallback(() => {
    setForm((f) => ({ ...f, nextPaymentDate: renewalDate }));
    Keyboard.dismiss();
    step1Opacity.value = withTiming(0, { duration: 260, easing: Easing.bezierFn(0.4, 0, 1, 1) });
    step1TranslateY.value = withTiming(-20, { duration: 260, easing: Easing.bezierFn(0.4, 0, 1, 1) });
    step1Scale.value = withTiming(0.98, { duration: 260, easing: Easing.bezierFn(0.4, 0, 1, 1) }, (finished) => {
      if (finished) runOnJS(enterStep2)();
    });
  }, [renewalDate, step1Opacity, step1TranslateY, step1Scale, enterStep2]);

  // ─────────────────────────────────────────────────────────────────
  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={requestClose}
      onDismiss={handleNativeDismiss}
    >
      <View
        style={[
          styles.sheet,
          { paddingBottom: insets.bottom > 0 ? 14 : 10 },
        ]}
      >
          {step === 1 ? (
            <Animated.View style={[{ flex: 1 }, kbHeight > 0 && { paddingBottom: kbHeight - insets.bottom }, step1AnimStyle]}>
              {/* ── Step 1: Quick Add ── */}
              <View style={styles.handleWrap}>
                <View style={styles.handle} />
              </View>
              <View style={styles.quickHeader}>
                <Pressable style={styles.closeBtn} onPress={requestClose} hitSlop={10}>
                  <X size={15} color="#3C3C43" strokeWidth={2.5} />
                </Pressable>
              </View>

              {error && (
                <View style={styles.errorBanner}>
                  <AlertCircle size={16} color="#B91C1C" strokeWidth={2.5} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <ScrollView
                style={styles.quickBody}
                contentContainerStyle={styles.quickBodyContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.quickInputCard}>
                  <TextInput
                    style={styles.quickNameInput}
                    value={form.name}
                    onChangeText={(t) => setForm((f) => ({ ...f, name: t }))}
                    placeholder="Suscripción"
                    placeholderTextColor="#C7C7CC"
                    returnKeyType="done"
                    autoCorrect={false}
                    autoFocus
                  />
                  <View style={styles.quickPriceRow}>
                    <Pressable
                      style={styles.quickCurrencyPill}
                      onPress={() => setCurrencySheetOpen(true)}
                      hitSlop={8}
                    >
                      <Text style={styles.quickCurrencyText}>{currencySymbol(form.currency)}</Text>
                      <ChevronDown size={14} color="#8E8E93" strokeWidth={2.5} />
                    </Pressable>
                    <TextInput
                      style={styles.quickPriceInput}
                      value={form.price}
                      onChangeText={(t) => setForm((f) => ({ ...f, price: t }))}
                      placeholder="0.00"
                      placeholderTextColor="#C7C7CC"
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                    />
                  </View>
                </View>

                {/* ── Billing period ── */}
                <RenewalToggle
                  isMonthly={form.billingPeriod === 'Monthly'}
                  onToggle={() => setForm((f) => ({
                    ...f,
                    billingPeriod: f.billingPeriod === 'Monthly' ? 'Yearly' : 'Monthly',
                  }))}
                  compact={kbHeight > 0}
                />

                <View style={{ flex: 1 }} />

                <DayRulerPicker
                  value={renewalDate}
                  onChange={setRenewalDate}
                  onTapLabel={() => setRenewalDatePickerOpen(true)}
                  compact={kbHeight > 0}
                />
              </ScrollView>

              <View style={styles.footer}>
                <Pressable
                  style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
                  onPress={goToMoreOptions}
                  disabled={isSubmitting}
                >
                  <Text style={styles.cancelBtnText}>Más opciones</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.createBtn,
                    { flex: 1 },
                    (pressed || isSubmitting) && { opacity: 0.85 },
                  ]}
                  onPress={handleQuickSave}
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? <ActivityIndicator color="#FFFFFF" size="small" />
                    : <Text style={styles.createBtnText}>Guardar</Text>
                  }
                </Pressable>
              </View>
            </Animated.View>
          ) : (
            <Animated.View style={[{ flex: 1 }, step2AnimStyle]}>
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
          {/* ── iOS-style drag handle + header (title + X) ── */}
            <View style={styles.handleWrap}>
              <View style={styles.handle} />
            </View>
            <View style={styles.header}>
              <Text style={styles.title}>Crear nueva suscripción</Text>
              <Pressable style={styles.closeBtn} onPress={requestClose} hitSlop={10}>
                <X size={15} color="#3C3C43" strokeWidth={2.5} />
              </Pressable>
            </View>

            {/* ── Error banner (no stroke) ── */}
            {error && (
              <View style={styles.errorBanner}>
                <AlertCircle size={16} color="#B91C1C" strokeWidth={2.5} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* ── Form ── */}
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              {/* Platform card */}
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
                    onPress={() => setCurrencySheetOpen(true)}
                    hitSlop={8}
                  >
                    <Text style={styles.currencyText}>{currencySymbol(form.currency)}</Text>
                    <ChevronDown size={12} color="#8E8E93" strokeWidth={2.5} />
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

              {/* Dates + billing */}
              <View style={styles.group}>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Inicio de suscripción</Text>
                  <DatePillBtn date={form.startDate} onPress={() => setOpenDate('start')} />
                </View>
                <FormDivider />
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Próxima fecha de pago</Text>
                  <DatePillBtn date={form.nextPaymentDate} onPress={() => setOpenDate('next')} />
                </View>
                <FormDivider />
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Periodo de cobro</Text>
                  <View ref={billingRef} collapsable={false}>
                    <DropdownBtn
                      value={form.billingPeriod}
                      onPress={() => openPickerAt(billingRef, 'billing')}
                    />
                  </View>
                </View>
                <FormDivider />
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Fin de la suscripción</Text>
                  <Switch
                    value={form.endEnabled}
                    onValueChange={(v) => setForm((f) => ({ ...f, endEnabled: v }))}
                    trackColor={{ false: '#E5E5EA', true: '#34C759' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
                {form.endEnabled && (
                  <>
                    <FormDivider />
                    <View style={styles.row}>
                      <Text style={[styles.rowLabel, styles.rowLabelMuted]}>Fecha de fin</Text>
                      <DatePillBtn date={form.endDate} onPress={() => setOpenDate('end')} />
                    </View>
                  </>
                )}
              </View>

              {/* Category */}
              <View style={styles.group}>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Categoría</Text>
                  <View ref={categoryRef} collapsable={false}>
                    <DropdownBtn
                      value={form.category}
                      onPress={() => openPickerAt(categoryRef, 'category')}
                    />
                  </View>
                </View>
              </View>

              {/* Reminder */}
              <View style={styles.group}>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Activar recordatorio de pago</Text>
                  <Switch
                    value={form.reminderEnabled}
                    onValueChange={(v) => {
                      if (v && !isPlusActive) {
                        closeStore();
                        setTimeout(() => usePaywallStore.getState().open('renewal_reminders'), 400);
                        return;
                      }
                      setForm((f) => ({ ...f, reminderEnabled: v }));
                    }}
                    trackColor={{ false: '#E5E5EA', true: '#34C759' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
                {form.reminderEnabled && (
                  <>
                    <FormDivider />
                    <View style={styles.row}>
                      <Text style={[styles.rowLabel, styles.rowLabelMuted]}>Avisarme</Text>
                      <View ref={reminderRef} collapsable={false}>
                        <DropdownBtn
                          value={form.reminderDays}
                          onPress={() => openPickerAt(reminderRef, 'reminder')}
                        />
                      </View>
                    </View>
                  </>
                )}
              </View>

              {/* Shared */}
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
                {form.shared && (
                  <>
                    <FormDivider />
                    <View style={styles.row}>
                      <Text style={[styles.rowLabel, styles.rowLabelMuted]}>Total personas</Text>
                      <View style={styles.stepper}>
                        <Pressable
                          onPress={decShared}
                          hitSlop={6}
                          disabled={form.sharedCount <= 2}
                          style={({ pressed }) => [
                            styles.stepperBtn,
                            form.sharedCount <= 2 && styles.stepperBtnDisabled,
                            pressed && { opacity: 0.6 },
                          ]}
                        >
                          <Minus size={14} color="#000000" strokeWidth={2.5} />
                        </Pressable>
                        <Text style={styles.stepperValue}>{form.sharedCount}</Text>
                        <Pressable
                          onPress={incShared}
                          hitSlop={6}
                          disabled={form.sharedCount >= 10}
                          style={({ pressed }) => [
                            styles.stepperBtn,
                            form.sharedCount >= 10 && styles.stepperBtnDisabled,
                            pressed && { opacity: 0.6 },
                          ]}
                        >
                          <Plus size={14} color="#000000" strokeWidth={2.5} />
                        </Pressable>
                      </View>
                    </View>
                  </>
                )}
              </View>

              {/* Payment method */}
              <View style={styles.group}>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Método de pago</Text>
                  <TextInput
                    style={styles.inlineInput}
                    value={form.paymentMethod}
                    onChangeText={(t) => setForm((f) => ({ ...f, paymentMethod: t }))}
                    placeholder="Visa, PayPal..."
                    placeholderTextColor="#C7C7CC"
                    returnKeyType="done"
                    autoCorrect={false}
                    textAlign="right"
                  />
                </View>
              </View>

              {/* Logo URL */}
              <View style={styles.group}>
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
              </View>

              {/* Status + Notes (bottom block) */}
              <View style={styles.group}>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Estado</Text>
                  <View ref={statusRef} collapsable={false}>
                    <DropdownBtn
                      value={form.status}
                      onPress={() => openPickerAt(statusRef, 'status')}
                    />
                  </View>
                </View>
                <FormDivider />
                <View style={styles.notesRow}>
                  <Text style={styles.rowLabel}>Notas</Text>
                  <TextInput
                    style={styles.notesInput}
                    value={form.notes}
                    onChangeText={(t) => setForm((f) => ({ ...f, notes: t }))}
                    placeholder="Añadir opcional"
                    placeholderTextColor="#C7C7CC"
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              </View>
            </ScrollView>

            {/* ── Footer ── */}
            <View style={styles.footer}>
              <Pressable
                style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
                onPress={requestClose}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.createBtn,
                  pressed && !isSubmitting && { opacity: 0.85 },
                ]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? <ActivityIndicator color="#FFFFFF" size="small" />
                  : <Text style={styles.createBtnText}>Crear suscripción</Text>
                }
              </Pressable>
            </View>
            </KeyboardAvoidingView>
            </Animated.View>
          )}
      </View>

      {/* ── Nested date pickers ── */}
      <NativeDatePickerSheet
        visible={openDate === 'start'}
        value={form.startDate}
        title="Inicio de suscripción"
        onChange={(d) => setForm((f) => ({ ...f, startDate: d }))}
        onClose={() => setOpenDate(null)}
      />
      <NativeDatePickerSheet
        visible={openDate === 'next'}
        value={form.nextPaymentDate}
        title="Próxima fecha de pago"
        minimumDate={form.startDate}
        onChange={(d) => setForm((f) => ({ ...f, nextPaymentDate: d }))}
        onClose={() => setOpenDate(null)}
      />
      <NativeDatePickerSheet
        visible={openDate === 'end'}
        value={form.endDate}
        title="Fecha de fin"
        minimumDate={form.startDate}
        onChange={(d) => setForm((f) => ({ ...f, endDate: d }))}
        onClose={() => setOpenDate(null)}
      />

      {/* ── Renewal date picker (quick-add label tap) ── */}
      <NativeDatePickerSheet
        visible={renewalDatePickerOpen}
        value={renewalDate}
        title="Próxima renovación"
        onChange={(d) => setRenewalDate(d)}
        onClose={() => setRenewalDatePickerOpen(false)}
      />

      {/* ── Currency sheet (shared for step 1 + step 2) ── */}
      <CurrencySheet
        visible={currencySheetOpen}
        onClose={() => setCurrencySheetOpen(false)}
        selectedCode={form.currency}
        onSelectCurrency={(c) => setForm((f) => ({ ...f, currency: c.code }))}
      />

      {/* ── Anchored pull-down menus ── */}
      <FloatingOptionMenu
        visible={openPicker === 'billing'}
        anchor={pickerAnchor}
        options={BILLING_PERIODS}
        selected={form.billingPeriod}
        onSelect={(v) => setForm((f) => ({ ...f, billingPeriod: v as BillingPeriod }))}
        onClose={() => setOpenPicker(null)}
      />
      <FloatingOptionMenu
        visible={openPicker === 'category'}
        anchor={pickerAnchor}
        options={allCategories}
        selected={form.category}
        onSelect={(v) => setForm((f) => ({ ...f, category: v }))}
        onClose={() => setOpenPicker(null)}
      />
      <FloatingOptionMenu
        visible={openPicker === 'status'}
        anchor={pickerAnchor}
        options={STATUSES}
        selected={form.status}
        onSelect={(v) => setForm((f) => ({ ...f, status: v as Status }))}
        onClose={() => setOpenPicker(null)}
      />
      <FloatingOptionMenu
        visible={openPicker === 'reminder'}
        anchor={pickerAnchor}
        options={REMINDER_OPTIONS}
        selected={form.reminderDays}
        onSelect={(v) => setForm((f) => ({ ...f, reminderDays: v as ReminderDays }))}
        onClose={() => setOpenPicker(null)}
      />
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Native iOS pageSheet provides: rounded top corners, dimmed backdrop,
  // and the inset-from-top offset. We only fill the sheet's content area.
  sheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 6,
  },

  // Step 1: Quick Add
  quickHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  quickBody: {
    flex: 1,
    paddingHorizontal: 16,
  },
  quickBodyContent: {
    flexGrow: 1,
  },
  quickInputCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 22,
  },
  quickNameInput: {
    ...fontFamily.bold,
    fontSize: fontSize[32],
    color: '#000000',
    letterSpacing: -0.6,
    marginBottom: 14,
    padding: 0,
  },
  quickPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quickCurrencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E5E5EA',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  quickCurrencyText: {
    ...fontFamily.semibold,
    fontSize: fontSize[20],
    color: '#000000',
    letterSpacing: -0.2,
  },
  quickPriceInput: {
    ...fontFamily.semibold,
    fontSize: fontSize[32],
    color: '#000000',
    letterSpacing: -0.6,
    padding: 0,
    flex: 1,
  },

  // Renewal toggle row
  renewalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  renewalRowLabel: {
    ...fontFamily.medium,
    fontSize: fontSize[16],
    color: '#8E8E93',
    letterSpacing: -0.2,
  },
  renewalValueWrap: {
    height: TOGGLE_H,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  renewalValue: {
    ...fontFamily.bold,
    fontSize: fontSize[20],
    color: '#000000',
    letterSpacing: -0.4,
  },

  // iOS-style drag handle — small gray pill anchored to the top of the sheet.
  handleWrap: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 10,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: radius.full,
    backgroundColor: '#D4D4D4',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
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

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: {
    ...fontFamily.regular,
    fontSize: fontSize[16],
    color: '#B91C1C',
    flex: 1,
    letterSpacing: -0.1,
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },

  platformCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 13,
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
    gap: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  currencyText: {
    ...fontFamily.semibold,
    fontSize: fontSize[15],
    color: '#000000',
    letterSpacing: -0.1,
  },
  priceInput: {
    ...fontFamily.regular,
    fontSize: fontSize[18],
    color: '#000000',
    letterSpacing: -0.2,
    padding: 0,
    flex: 1,
  },

  group: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DCDCE0',
    overflow: 'hidden',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#DCDCE0',
    marginLeft: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  rowLabel: {
    ...fontFamily.regular,
    fontSize: fontSize[16],
    color: '#000000',
    letterSpacing: -0.1,
    flexShrink: 1,
    paddingRight: 12,
  },
  rowLabelMuted: {
    color: '#8E8E93',
    fontSize: fontSize[15],
  },

  datePill: {
    backgroundColor: '#F2F2F7',
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  datePillText: {
    ...fontFamily.regular,
    fontSize: fontSize[15],
    color: '#000000',
    letterSpacing: -0.1,
  },

  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dropdownText: {
    ...fontFamily.regular,
    fontSize: fontSize[16],
    color: '#000000',
    letterSpacing: -0.1,
  },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnDisabled: { opacity: 0.35 },
  stepperValue: {
    ...fontFamily.semibold,
    fontSize: fontSize[16],
    color: '#000000',
    minWidth: 22,
    textAlign: 'center',
    letterSpacing: -0.2,
  },

  inlineInput: {
    ...fontFamily.regular,
    fontSize: fontSize[16],
    color: '#000000',
    letterSpacing: -0.1,
    flex: 1,
    textAlign: 'right',
    padding: 0,
  },

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
    color: '#000000',
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
    paddingTop: 10,
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

  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#DCDCE0',
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: radius.full,
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
    borderRadius: radius.full,
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
