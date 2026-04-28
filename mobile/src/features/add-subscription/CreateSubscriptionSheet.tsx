// CreateSubscriptionSheet — native iOS pageSheet.
//
// Behaviour:
//  · Opens via RN <Modal presentationStyle="pageSheet"> — UIKit owns the
//    presentation curve, the rounded top corners, the dimmed backdrop,
//    AND the pan-down-to-dismiss gesture. No custom PanResponder, no
//    custom translateY animation: the sheet behaves exactly like Apple's
//    own Mail/Calendar/Wallet modals.
//  · Dropdowns via native @react-native-picker/picker (iOS UIMenu style)
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
  Dimensions,
  InputAccessoryView,
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
import { AlertCircle, ChevronsUpDown, ChevronDown, Minus, Plus, X } from 'lucide-react-native';

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
import { useTagsStore, usePreferencesStore } from '../settings/useSettingsStore';
import { currencyCodeFromLabel } from '../../lib/formatting';
import { usePaywallStore } from '../paywall/usePaywallStore';
import { haptic } from '../../lib/haptics';
import { formatDate } from '../../lib/formatting';
import { PLATFORMS, logoUrlFromDomain } from '../../lib/constants/platforms';
import * as Clipboard from 'expo-clipboard';
import { useT } from '../../lib/i18n/LocaleProvider';
import type {
  BillingPeriod as SubBillingPeriod,
  Category as SubCategory,
  Subscription,
  SubscriptionStatus,
} from '../subscriptions/types';

// ─── Logo matching ──────────────────────────────────────────────────
function matchPlatformLogo(name: string): string {
  const q = name.trim().toLowerCase();
  if (!q) return '';
  for (const p of PLATFORMS) {
    if (p.name.toLowerCase() === q) return logoUrlFromDomain(p.domain);
    if (p.aliases?.some((a) => a.toLowerCase() === q)) return logoUrlFromDomain(p.domain);
  }
  for (const p of PLATFORMS) {
    if (p.name.toLowerCase().includes(q) || q.includes(p.name.toLowerCase())) return logoUrlFromDomain(p.domain);
    if (p.aliases?.some((a) => a.toLowerCase().includes(q) || q.includes(a.toLowerCase()))) return logoUrlFromDomain(p.domain);
  }
  return '';
}

const PRICE_ACCESSORY_ID = 'price-input-hide-bar';

// ─── Label → store-key mappings ──────────────────────────────────────
// The form now keeps normalized lowercase keys internally;
// display labels come from i18n via t().
const BILLING_KEY: Record<string, SubBillingPeriod> = {
  monthly: 'monthly',
  yearly: 'yearly',
  quarterly: 'quarterly',
  weekly: 'weekly',
  custom: 'monthly',
};

// Display-key maps: internal key → i18n translation key
const BILLING_DISPLAY_KEYS: Record<string, string> = {
  monthly: 'form.billing.monthly',
  yearly: 'form.billing.yearly',
  quarterly: 'form.billing.quarterly',
  weekly: 'form.billing.weekly',
  custom: 'form.billing.custom',
};
const STATUS_DISPLAY_KEYS: Record<string, string> = {
  active: 'form.status.active',
  paused: 'form.status.paused',
  cancelled: 'form.status.cancelled',
  ended: 'form.status.ended',
};
const CATEGORY_DISPLAY_KEYS: Record<string, string> = {
  streaming: 'category.streaming',
  music: 'category.music',
  productivity: 'category.productivity',
  cloud: 'category.cloud',
  ai: 'category.ai',
  gaming: 'category.gaming',
  other: 'category.other',
};
const REMINDER_DISPLAY_KEYS: Record<string, string> = {
  '1': 'form.reminder.1day',
  '3': 'form.reminder.3days',
  '7': 'form.reminder.7days',
};

// Convert the form price + billing period into a normalized monthly
// equivalent (EUR/etc per month). Matches how preset-seeded subs are
// computed — downstream dashboard math assumes this field is correct.
function monthlyEquivalent(priceAmount: number, billingKey: SubBillingPeriod, intervalCount = 1): number {
  switch (billingKey) {
    case 'yearly':    return priceAmount / (12 * intervalCount);
    case 'quarterly': return priceAmount / (3 * intervalCount);
    case 'weekly':    return (priceAmount * 52) / (12 * intervalCount);
    case 'monthly':
    default:          return priceAmount / intervalCount;
  }
}

function customUnitToSubBilling(unit: CustomUnit): SubBillingPeriod {
  switch (unit) {
    case 'day':   return 'weekly';
    case 'week':  return 'weekly';
    case 'month': return 'monthly';
    case 'year':  return 'yearly';
  }
}

function customToIntervalCount(count: number, unit: CustomUnit): number {
  if (unit === 'day') return count;
  return count;
}

function customMonthlyEquivalent(price: number, count: number, unit: CustomUnit): number {
  switch (unit) {
    case 'day':   return (price / count) * 30.44;
    case 'week':  return (price / count) * (52 / 12);
    case 'month': return price / count;
    case 'year':  return price / (count * 12);
  }
}

// ─── Types ───────────────────────────────────────────────────────────
type BillingPeriod = 'monthly' | 'yearly' | 'quarterly' | 'weekly' | 'custom';
type Status = 'active' | 'paused' | 'cancelled' | 'ended';
type ReminderDays = '1' | '3' | '7';
type DateKey = 'start' | 'next' | 'end' | null;
type PickerKey = 'billing' | 'category' | 'status' | 'reminder' | null;

type CustomUnit = 'day' | 'week' | 'month' | 'year';

interface FormState {
  name: string;
  currency: string;
  price: string;
  startDate: Date;
  nextPaymentDate: Date;
  billingPeriod: BillingPeriod;
  customCount: number;
  customUnit: CustomUnit;
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
const BILLING_PERIODS: BillingPeriod[] = ['monthly', 'yearly', 'quarterly', 'weekly', 'custom'];
const BASE_CATEGORIES = [
  'streaming', 'music', 'productivity', 'cloud', 'ai', 'gaming', 'other',
];
const STATUSES: Status[] = ['active', 'paused', 'cancelled', 'ended'];
const REMINDER_OPTIONS: ReminderDays[] = ['1', '3', '7'];
function nextMonth(d: Date): Date {
  const n = new Date(d);
  n.setMonth(n.getMonth() + 1);
  return n;
}
function makeInitialForm(prefill: { name?: string; logoUrl?: string; category?: string } | null, defaultCurrency = 'EUR'): FormState {
  const today = new Date();
  return {
    name: prefill?.name ?? '',
    currency: defaultCurrency,
    price: '',
    startDate: today,
    nextPaymentDate: nextMonth(today),
    billingPeriod: 'monthly',
    customCount: 1,
    customUnit: 'month',
    endEnabled: false,
    endDate: new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()),
    category: prefill?.category ?? 'other',
    status: 'active',
    reminderEnabled: false,
    reminderDays: '1',
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
    a.customCount === b.customCount &&
    a.customUnit === b.customUnit &&
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
      <ChevronsUpDown size={14} color="#8E8E93" strokeWidth={2.5} />
    </Pressable>
  );
}

// ─── Renewal period toggle with vertical slide animation ────────────
const TOGGLE_H = 28;

function RenewalToggle({ isMonthly, onToggle, compact }: { isMonthly: boolean; onToggle: () => void; compact?: boolean }) {
  const t = useT();
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const containerScale = useSharedValue(1);
  // displayLabel is no longer used — we derive the text from isMonthly + t()
  const [displayKey, setDisplayKey] = useState(isMonthly);

  const updateLabel = useCallback((monthly: boolean) => {
    setDisplayKey(monthly);
  }, []);

  const animateToggle = useCallback(() => {
    haptic.selection();
    const nextIsMonthly = !isMonthly;
    containerScale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
    setTimeout(() => {
      containerScale.value = withSpring(1, { damping: 10, stiffness: 200 });
    }, 120);
    translateY.value = withTiming(TOGGLE_H, { duration: 150, easing: Easing.in(Easing.quad) });
    opacity.value = withTiming(0, { duration: 150 }, () => {
      runOnJS(updateLabel)(nextIsMonthly);
      translateY.value = -TOGGLE_H;
      opacity.value = 0;
      translateY.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.quad) });
      opacity.value = withTiming(1, { duration: 200 });
    });
    onToggle();
  }, [isMonthly, onToggle, translateY, opacity, containerScale, updateLabel]);

  const labelAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const containerAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: containerScale.value }],
  }));

  const h = compact ? 20 : TOGGLE_H;

  return (
    <Pressable onPress={animateToggle}>
      <Animated.View style={[styles.renewalRow, compact && { marginTop: 10, paddingVertical: 10 }, containerAnimStyle]}>
        <Text style={[styles.renewalRowLabel, compact && { fontSize: fontSize[14] }]}>{t('form.renewal')}</Text>
        <View style={[styles.renewalValueWrap, { height: h }]}>
          <Animated.Text style={[styles.renewalValue, compact && { fontSize: fontSize[16] }, labelAnimStyle]}>
            {displayKey ? t('form.renewalMonth') : t('form.renewalYear')}
          </Animated.Text>
        </View>
      </Animated.View>
    </Pressable>
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
  const globalCurrencyLabel = usePreferencesStore((s) => s.currency);
  const defaultCurrency = currencyCodeFromLabel(globalCurrencyLabel);
  const t = useT();
  const allCategoryKeys = [...BASE_CATEGORIES, ...tags.map((tg) => tg.name)];

  // Translated option arrays for FloatingOptionMenu
  const billingOptions = BILLING_PERIODS.map((k) => t(BILLING_DISPLAY_KEYS[k] ?? k));
  const billingLabelToKey = Object.fromEntries(
    BILLING_PERIODS.map((k) => [t(BILLING_DISPLAY_KEYS[k] ?? k), k]),
  ) as Record<string, BillingPeriod>;

  const categoryOptions = allCategoryKeys.map((k) =>
    CATEGORY_DISPLAY_KEYS[k] ? t(CATEGORY_DISPLAY_KEYS[k]) : k,
  );
  const categoryLabelToKey = Object.fromEntries(
    allCategoryKeys.map((k) => [CATEGORY_DISPLAY_KEYS[k] ? t(CATEGORY_DISPLAY_KEYS[k]) : k, k]),
  ) as Record<string, string>;

  const statusOptions = STATUSES.map((k) => t(STATUS_DISPLAY_KEYS[k] ?? k));
  const statusLabelToKey = Object.fromEntries(
    STATUSES.map((k) => [t(STATUS_DISPLAY_KEYS[k] ?? k), k]),
  ) as Record<string, Status>;

  const reminderOptions = REMINDER_OPTIONS.map((k) => t(REMINDER_DISPLAY_KEYS[k] ?? k));
  const reminderLabelToKey = Object.fromEntries(
    REMINDER_OPTIONS.map((k) => [t(REMINDER_DISPLAY_KEYS[k] ?? k), k]),
  ) as Record<string, ReminderDays>;

  const [step, setStep] = useState<1 | 2>(1);
  const [renewalDate, setRenewalDate] = useState<Date>(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setMonth(d.getMonth() + 1); return d;
  });
  const [form, setForm] = useState<FormState>(() => makeInitialForm(null, defaultCurrency));
  const initialFormRef = useRef<FormState>(makeInitialForm(null, defaultCurrency));

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
  const step2TranslateY = useSharedValue(0);

  const step1AnimStyle = useAnimatedStyle(() => ({
    opacity: step1Opacity.value,
  }));

  const step2AnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: step2TranslateY.value }],
  }));

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
      const fresh = makeInitialForm(prefill, defaultCurrency);
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
      step2TranslateY.value = 0;
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
        t('form.discardChanges'),
        t('form.discardBody'),
        [
          { text: t('form.keepEditing'), style: 'cancel' },
          { text: t('form.discard'), style: 'destructive', onPress: closeStore },
        ],
      );
    } else {
      closeStore();
    }
  }, [isDirty, closeStore, t]);

  // ── Native sheet dismissal sync ───────────────────────────────────
  // Fires after the user swipes the iOS pageSheet down. The store must
  // be updated because React is otherwise unaware the Modal closed.
  const handleNativeDismiss = useCallback(() => {
    if (isOpen) closeStore();
  }, [isOpen, closeStore]);

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
      setError(t('form.nameRequired'));
      return;
    }
    const priceNum = parseFloat(f.price.replace(',', '.'));
    if (!f.price.trim() || isNaN(priceNum) || priceNum <= 0) {
      setError(t('form.invalidPrice'));
      return;
    }
    setError(null);
    haptic.light();
    setIsSubmitting(true);
    try {
      const isCustom = f.billingPeriod === 'custom';
      const billingKey = isCustom
        ? customUnitToSubBilling(f.customUnit)
        : (BILLING_KEY[f.billingPeriod] ?? 'monthly');
      const intervalCount = isCustom ? customToIntervalCount(f.customCount, f.customUnit) : 1;
      const monthly = isCustom
        ? customMonthlyEquivalent(priceNum, f.customCount, f.customUnit)
        : monthlyEquivalent(priceNum, billingKey);
      const myMonthly = f.shared && f.sharedCount > 1
        ? monthly / f.sharedCount
        : monthly;
      const nowISO = new Date().toISOString();
      const newSub: Subscription = {
        id: `local-${Date.now()}`,
        name: f.name.trim(),
        logo_url: f.logoUrl || null,
        category: f.category,
        price_amount: priceNum,
        currency: f.currency,
        billing_period: billingKey,
        billing_interval_count: intervalCount,
        next_billing_date: f.nextPaymentDate.toISOString().split('T')[0],
        status: f.status,
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
          billingPeriod: t(BILLING_DISPLAY_KEYS[f.billingPeriod] ?? 'form.billing.monthly'),
          category: f.category ? t(CATEGORY_DISPLAY_KEYS[f.category] ?? f.category) : undefined,
          logoUrl: f.logoUrl || undefined,
        });
      }, 380);
    } catch {
      setIsSubmitting(false);
      setError(t('form.createError'));
    }
  }, [closeStore, t]);

  const handleSubmit = useCallback(() => doSubmit(form), [form, doSubmit]);

  const handleQuickSave = useCallback(() => {
    doSubmit({ ...form, nextPaymentDate: renewalDate });
  }, [form, renewalDate, doSubmit]);

  const enterStep2 = useCallback(() => {
    const screenH = Dimensions.get('window').height;
    step2TranslateY.value = screenH;
    setStep(2);
    step2TranslateY.value = withTiming(0, { duration: 420, easing: Easing.bezierFn(0.2, 0.9, 0.3, 1) });
    step1Opacity.value = 1;
  }, [step1Opacity, step2TranslateY]);

  const goToMoreOptions = useCallback(() => {
    setForm((f) => ({ ...f, nextPaymentDate: renewalDate }));
    Keyboard.dismiss();
    step1Opacity.value = withTiming(0, { duration: 1000, easing: Easing.bezierFn(0.2, 0, 0.8, 1) });
    setTimeout(() => enterStep2(), 800);
  }, [renewalDate, step1Opacity, enterStep2]);

  // ─────────────────────────────────────────────────────────────────
  return (
    <>
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
            <Animated.View style={[{ flex: 1 }, kbHeight > 0 && { paddingBottom: kbHeight - insets.bottom + 16 }, step1AnimStyle]}>
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
                    onChangeText={(t) => {
                      const logo = matchPlatformLogo(t);
                      setForm((f) => ({ ...f, name: t, logoUrl: logo }));
                    }}
                    placeholder={t('form.subscriptionPlaceholder')}
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
                      inputAccessoryViewID={PRICE_ACCESSORY_ID}
                    />
                  </View>
                </View>

                {/* ── Billing period ── */}
                <RenewalToggle
                  isMonthly={form.billingPeriod === 'monthly'}
                  onToggle={() => setForm((f) => ({
                    ...f,
                    billingPeriod: f.billingPeriod === 'monthly' ? 'yearly' : 'monthly',
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
                  <Text style={styles.cancelBtnText}>{t('form.moreOptions')}</Text>
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
                    : <Text style={styles.createBtnText}>{t('common.save')}</Text>
                  }
                </Pressable>
              </View>
            </Animated.View>
          ) : (
            <Animated.View style={[{ flex: 1, backgroundColor: '#FFFFFF' }, step2AnimStyle]}>
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
          {/* ── iOS-style drag handle + header (title + X) ── */}
            <View style={styles.handleWrap}>
              <View style={styles.handle} />
            </View>
            <View style={styles.header}>
              <Text style={styles.title}>{t('form.createTitle')}</Text>
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
                  onChangeText={(t) => {
                    const logo = matchPlatformLogo(t);
                    setForm((f) => ({ ...f, name: t, logoUrl: logo }));
                  }}
                  placeholder={t('form.namePlaceholder')}
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
                  <Text style={styles.rowLabel}>{t('form.startDate')}</Text>
                  <DatePillBtn date={form.startDate} onPress={() => setOpenDate('start')} />
                </View>
                <FormDivider />
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>{t('form.nextPayment')}</Text>
                  <DatePillBtn date={form.nextPaymentDate} onPress={() => setOpenDate('next')} />
                </View>
                <FormDivider />
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>{t('form.billingPeriod')}</Text>
                  <View ref={billingRef} collapsable={false}>
                    <DropdownBtn
                      value={t(BILLING_DISPLAY_KEYS[form.billingPeriod] ?? 'form.billing.monthly')}
                      onPress={() => openPickerAt(billingRef, 'billing')}
                    />
                  </View>
                </View>
                {form.billingPeriod === 'custom' && (
                  <>
                    <FormDivider />
                    <View style={styles.row}>
                      <Text style={[styles.rowLabel, styles.rowLabelMuted]}>{t('form.every')}</Text>
                      <View style={styles.customIntervalRow}>
                        <View style={styles.stepper}>
                          <Pressable
                            onPress={() => setForm((f) => ({ ...f, customCount: Math.max(1, f.customCount - 1) }))}
                            hitSlop={6}
                            disabled={form.customCount <= 1}
                            style={({ pressed }) => [
                              styles.stepperBtn,
                              form.customCount <= 1 && styles.stepperBtnDisabled,
                              pressed && { opacity: 0.6 },
                            ]}
                          >
                            <Minus size={14} color="#000000" strokeWidth={2.5} />
                          </Pressable>
                          <Text style={styles.stepperValue}>{form.customCount}</Text>
                          <Pressable
                            onPress={() => setForm((f) => ({ ...f, customCount: Math.min(99, f.customCount + 1) }))}
                            hitSlop={6}
                            disabled={form.customCount >= 99}
                            style={({ pressed }) => [
                              styles.stepperBtn,
                              form.customCount >= 99 && styles.stepperBtnDisabled,
                              pressed && { opacity: 0.6 },
                            ]}
                          >
                            <Plus size={14} color="#000000" strokeWidth={2.5} />
                          </Pressable>
                        </View>
                        <View style={styles.customUnitRow}>
                          {(['day', 'week', 'month', 'year'] as CustomUnit[]).map((u) => (
                            <Pressable
                              key={u}
                              onPress={() => setForm((f) => ({ ...f, customUnit: u }))}
                              style={[
                                styles.customUnitPill,
                                form.customUnit === u && styles.customUnitPillActive,
                              ]}
                            >
                              <Text style={[
                                styles.customUnitText,
                                form.customUnit === u && styles.customUnitTextActive,
                              ]}>
                                {t(`form.unit.${u}` as any)}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    </View>
                  </>
                )}
                <FormDivider />
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>{t('form.endSubscription')}</Text>
                  <Switch
                    value={form.endEnabled}
                    onValueChange={(v) => setForm((f) => ({ ...f, endEnabled: v }))}
                    trackColor={{ false: '#E5E5EA', true: '#30D158' }}
                  />
                </View>
                {form.endEnabled && (
                  <>
                    <FormDivider />
                    <View style={styles.row}>
                      <Text style={[styles.rowLabel, styles.rowLabelMuted]}>{t('form.endDateLabel')}</Text>
                      <DatePillBtn date={form.endDate} onPress={() => setOpenDate('end')} />
                    </View>
                  </>
                )}
              </View>

              {/* Category */}
              <View style={styles.group}>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>{t('form.category')}</Text>
                  <View ref={categoryRef} collapsable={false}>
                    <DropdownBtn
                      value={CATEGORY_DISPLAY_KEYS[form.category] ? t(CATEGORY_DISPLAY_KEYS[form.category]) : form.category}
                      onPress={() => openPickerAt(categoryRef, 'category')}
                    />
                  </View>
                </View>
              </View>

              {/* Reminder */}
              <View style={styles.group}>
                <View style={styles.row}>
                  <View style={styles.rowLabelWithBadge}>
                    <Text style={styles.rowLabel}>{t('form.enableReminder')}</Text>
                    {!isPlusActive && (
                      <View style={styles.proBadge}>
                        <Text style={styles.proBadgeText}>Pro</Text>
                      </View>
                    )}
                  </View>
                  <Switch
                    value={form.reminderEnabled}
                    onValueChange={(v) => {
                      if (!isPlusActive) return;
                      setForm((f) => ({ ...f, reminderEnabled: v }));
                    }}
                    disabled={!isPlusActive}
                    trackColor={{ false: '#E5E5EA', true: '#30D158' }}
                  />
                </View>
                {form.reminderEnabled && (
                  <>
                    <FormDivider />
                    <View style={styles.row}>
                      <Text style={[styles.rowLabel, styles.rowLabelMuted]}>{t('form.notifyMe')}</Text>
                      <View ref={reminderRef} collapsable={false}>
                        <DropdownBtn
                          value={t(REMINDER_DISPLAY_KEYS[form.reminderDays] ?? 'form.reminder.1day')}
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
                  <Text style={styles.rowLabel}>{t('form.sharedSubscription')}</Text>
                  <Switch
                    value={form.shared}
                    onValueChange={(v) => setForm((f) => ({ ...f, shared: v }))}
                    trackColor={{ false: '#E5E5EA', true: '#30D158' }}
                  />
                </View>
                {form.shared && (
                  <>
                    <FormDivider />
                    <View style={styles.row}>
                      <Text style={[styles.rowLabel, styles.rowLabelMuted]}>{t('form.totalPeople')}</Text>
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
                  <Text style={styles.rowLabel}>{t('form.paymentMethod')}</Text>
                  <TextInput
                    style={styles.inlineInput}
                    value={form.paymentMethod}
                    onChangeText={(t) => setForm((f) => ({ ...f, paymentMethod: t }))}
                    placeholder={t('form.paymentPlaceholder')}
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
                  <Text style={styles.rowLabel}>{t('form.logoUrl')}</Text>
                  <View style={styles.urlRow}>
                    {form.logoUrl.length === 0 ? (
                      <Pressable
                        onPress={async () => {
                          const clip = await Clipboard.getStringAsync();
                          if (clip) setForm((f) => ({ ...f, logoUrl: clip.trim() }));
                        }}
                        hitSlop={8}
                      >
                        <Text style={styles.pasteLink}>{t('form.pasteUrl')}</Text>
                      </Pressable>
                    ) : (
                      <>
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
                        <Pressable
                          onPress={() => setForm((f) => ({ ...f, logoUrl: '' }))}
                          hitSlop={8}
                          style={styles.urlClear}
                        >
                          <X size={12} color="#8E8E93" strokeWidth={2.5} />
                        </Pressable>
                      </>
                    )}
                  </View>
                </View>
              </View>

              {/* Status + Notes (bottom block) */}
              <View style={styles.group}>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>{t('form.status')}</Text>
                  <View ref={statusRef} collapsable={false}>
                    <DropdownBtn
                      value={t(STATUS_DISPLAY_KEYS[form.status] ?? 'form.status.active')}
                      onPress={() => openPickerAt(statusRef, 'status')}
                    />
                  </View>
                </View>
                <FormDivider />
                <View style={styles.notesRow}>
                  <Text style={styles.rowLabel}>{t('form.notes')}</Text>
                  <TextInput
                    style={styles.notesInput}
                    value={form.notes}
                    onChangeText={(t) => setForm((f) => ({ ...f, notes: t }))}
                    placeholder={t('form.notesPlaceholder')}
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
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
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
                  : <Text style={styles.createBtnText}>{t('form.createSubscription')}</Text>
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
        title={t('form.startDate')}
        onChange={(d) => setForm((f) => ({ ...f, startDate: d }))}
        onClose={() => setOpenDate(null)}
      />
      <NativeDatePickerSheet
        visible={openDate === 'next'}
        value={form.nextPaymentDate}
        title={t('form.nextPayment')}
        minimumDate={form.startDate}
        onChange={(d) => setForm((f) => ({ ...f, nextPaymentDate: d }))}
        onClose={() => setOpenDate(null)}
      />
      <NativeDatePickerSheet
        visible={openDate === 'end'}
        value={form.endDate}
        title={t('form.endDateLabel')}
        minimumDate={form.startDate}
        onChange={(d) => setForm((f) => ({ ...f, endDate: d }))}
        onClose={() => setOpenDate(null)}
      />

      {/* ── Renewal date picker (quick-add label tap) ── */}
      <NativeDatePickerSheet
        visible={renewalDatePickerOpen}
        value={renewalDate}
        title={t('form.nextRenewal')}
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
        options={billingOptions}
        selected={t(BILLING_DISPLAY_KEYS[form.billingPeriod] ?? 'form.billing.monthly')}
        onSelect={(v) => setForm((f) => ({ ...f, billingPeriod: billingLabelToKey[v] ?? 'monthly' }))}
        onClose={() => setOpenPicker(null)}
      />
      <FloatingOptionMenu
        visible={openPicker === 'category'}
        anchor={pickerAnchor}
        options={categoryOptions}
        selected={CATEGORY_DISPLAY_KEYS[form.category] ? t(CATEGORY_DISPLAY_KEYS[form.category]) : form.category}
        onSelect={(v) => setForm((f) => ({ ...f, category: categoryLabelToKey[v] ?? v }))}
        onClose={() => setOpenPicker(null)}
      />
      <FloatingOptionMenu
        visible={openPicker === 'status'}
        anchor={pickerAnchor}
        options={statusOptions}
        selected={t(STATUS_DISPLAY_KEYS[form.status] ?? 'form.status.active')}
        onSelect={(v) => setForm((f) => ({ ...f, status: statusLabelToKey[v] ?? 'active' }))}
        onClose={() => setOpenPicker(null)}
      />
      <FloatingOptionMenu
        visible={openPicker === 'reminder'}
        anchor={pickerAnchor}
        options={reminderOptions}
        selected={t(REMINDER_DISPLAY_KEYS[form.reminderDays] ?? 'form.reminder.1day')}
        onSelect={(v) => setForm((f) => ({ ...f, reminderDays: reminderLabelToKey[v] ?? '1' }))}
        onClose={() => setOpenPicker(null)}
      />
    </Modal>

    {Platform.OS === 'ios' && (
      <InputAccessoryView nativeID={PRICE_ACCESSORY_ID}>
        <View style={{ height: 0 }} />
      </InputAccessoryView>
    )}
    </>
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
    ...fontFamily.medium,
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
    ...fontFamily.medium,
    fontSize: fontSize[20],
    color: '#000000',
    letterSpacing: -0.2,
  },
  quickPriceInput: {
    ...fontFamily.medium,
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
    ...fontFamily.medium,
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
    ...fontFamily.medium,
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
    ...fontFamily.medium,
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
    ...fontFamily.medium,
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
  rowLabelWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
    paddingRight: 12,
  },
  proBadge: {
    backgroundColor: '#000000',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  proBadgeText: {
    ...fontFamily.medium,
    fontSize: fontSize[11],
    color: '#FFFFFF',
    letterSpacing: 0.2,
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
    ...fontFamily.medium,
    fontSize: fontSize[16],
    color: '#000000',
    minWidth: 22,
    textAlign: 'center',
    letterSpacing: -0.2,
  },

  customIntervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customUnitRow: {
    flexDirection: 'row',
    gap: 4,
  },
  customUnitPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  customUnitPillActive: {
    backgroundColor: '#000000',
  },
  customUnitText: {
    ...fontFamily.medium,
    fontSize: fontSize[13],
    color: '#8E8E93',
  },
  customUnitTextActive: {
    color: '#FFFFFF',
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
  pasteLink: {
    ...fontFamily.medium,
    fontSize: fontSize[15],
    color: '#007AFF',
    letterSpacing: -0.1,
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
    ...fontFamily.medium,
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
    ...fontFamily.medium,
    fontSize: fontSize[16],
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
});
