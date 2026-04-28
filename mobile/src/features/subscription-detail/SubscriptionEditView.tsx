// SubscriptionEditView — edit mode inside the native iOS pageSheet.
// Visual design mirrors CreateSubscriptionSheet exactly:
//   · Header: title left + X close right
//   · Same form cards and field order as CreateSubscriptionSheet
//   · "Eliminar suscripción": destructive card at the end of the scroll
//     (Apple Contacts / Calendar pattern) — visually integrated but
//     clearly separated from the primary Save CTA.
//   · Footer: single "Guardar cambios" primary button pinned at bottom.

import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, ChevronsUpDown, ChevronDown, Minus, Plus, X } from 'lucide-react-native';

import { FloatingOptionMenu, MenuAnchor } from '../../components/FloatingOptionMenu';
import { CurrencySheet, currencySymbol } from '../settings/CurrencySheet';
import { useTheme } from '../../design/useTheme';
import { fontFamily, fontSize } from '../../design/typography';
import type { Subscription, BillingPeriod, Category, SubscriptionStatus } from '../subscriptions/types';
import { CATEGORY_PICKER } from './helpers';
import { formatDate } from '../../lib/formatting';
import { NativeDatePickerSheet } from '../add-subscription/pickers/NativeDatePickerSheet';
import { useTagsStore } from '../settings/useSettingsStore';
import { useSubscriptionsStore } from '../../stores/subscriptionsStore';
import { usePaywallStore } from '../paywall/usePaywallStore';
import { useSubscriptionDetailStore } from './useSubscriptionDetailStore';
import { useT } from '../../lib/i18n/LocaleProvider';

function toMonthly(price: number, period: BillingPeriod): number {
  switch (period) {
    case 'yearly':    return price / 12;
    case 'quarterly': return price / 3;
    case 'weekly':    return price * 4.345;
    case 'monthly':
    default:          return price;
  }
}

// ─── Types ───────────────────────────────────────────────────────────

type ReminderDays = '1' | '3' | '7';
type DateKey = 'start' | 'next' | 'end' | null;
type PickerKey = 'billing' | 'category' | 'status' | 'reminder' | null;

interface EditDraft {
  name: string;
  currency: string;
  price: string;
  startDate: Date;
  nextPaymentDate: Date;
  billingPeriod: BillingPeriod | 'custom';
  customCount: number;
  customUnit: CustomUnit;
  endEnabled: boolean;
  endDate: Date;
  category: Category;
  status: SubscriptionStatus;
  reminderEnabled: boolean;
  reminderDays: ReminderDays;
  shared: boolean;
  sharedCount: number;
  paymentMethod: string;
  logoUrl: string;
  notes: string;
}

// ─── Constants ───────────────────────────────────────────────────────

const BILLING_OPTIONS = ['Monthly', 'Yearly', 'Quarterly', 'Weekly', 'Custom'] as const;
type BillingLabel = typeof BILLING_OPTIONS[number];
const BILLING_LABEL_TO_KEY: Record<BillingLabel, BillingPeriod | 'custom'> = {
  Monthly: 'monthly',
  Yearly: 'yearly',
  Quarterly: 'quarterly',
  Weekly: 'weekly',
  Custom: 'custom' as any,
};
const BILLING_KEY_TO_LABEL: Record<string, BillingLabel> = {
  monthly: 'Monthly',
  yearly: 'Yearly',
  quarterly: 'Quarterly',
  weekly: 'Weekly',
  custom: 'Custom',
};

type CustomUnit = 'day' | 'week' | 'month' | 'year';
const CUSTOM_UNIT_LABELS: Record<CustomUnit, string> = {
  day: 'form.unit.day',
  week: 'form.unit.week',
  month: 'form.unit.month',
  year: 'form.unit.year',
};

function customMonthlyEquivalent(price: number, count: number, unit: CustomUnit): number {
  switch (unit) {
    case 'day':   return (price / count) * 30.44;
    case 'week':  return (price / count) * (52 / 12);
    case 'month': return price / count;
    case 'year':  return price / (count * 12);
  }
}

function customUnitToSubBilling(unit: CustomUnit): BillingPeriod {
  switch (unit) {
    case 'day':   return 'weekly';
    case 'week':  return 'weekly';
    case 'month': return 'monthly';
    case 'year':  return 'yearly';
  }
}

const STATUS_KEYS: Record<string, string> = {
  active: 'form.status.active',
  paused: 'form.status.paused',
  cancelled: 'form.status.cancelled',
  ended: 'form.status.ended',
  trial: 'form.status.trial',
};
const STATUS_VALUES = ['active', 'paused', 'cancelled', 'ended', 'trial'] as const;

const REMINDER_KEYS: Record<string, string> = {
  '1': 'form.reminder.1day',
  '3': 'form.reminder.3days',
  '7': 'form.reminder.7days',
};
const REMINDER_VALUES = ['1', '3', '7'] as const;

function nextYear(d: Date): Date {
  return new Date(d.getFullYear() + 1, d.getMonth(), d.getDate());
}

// ─── Draft helpers ────────────────────────────────────────────────────

function makeDraft(sub: Subscription): EditDraft {
  const today = new Date();
  const isCustom = sub.billing_interval_count > 1;
  return {
    name: sub.name,
    currency: sub.currency,
    price: sub.price_amount.toFixed(2).replace('.', ','),
    startDate: sub.start_date ? new Date(sub.start_date) : new Date(sub.created_at),
    nextPaymentDate: new Date(sub.next_billing_date),
    billingPeriod: isCustom ? 'custom' : sub.billing_period,
    customCount: isCustom ? sub.billing_interval_count : 1,
    customUnit: isCustom ? (sub.billing_period === 'yearly' ? 'year' : sub.billing_period === 'weekly' ? 'week' : 'month') as CustomUnit : 'month',
    endEnabled: !!sub.end_date,
    endDate: sub.end_date ? new Date(sub.end_date) : nextYear(today),
    category: sub.category,
    status: sub.status,
    reminderEnabled: sub.reminderEnabled ?? false,
    reminderDays: sub.reminderDays ?? '1',
    shared: sub.is_shared,
    sharedCount: Math.max(2, sub.shared_with_count),
    paymentMethod: sub.payment_method ?? '',
    logoUrl: sub.logo_url ?? '',
    notes: sub.notes ?? '',
  };
}

function draftEqual(a: EditDraft, b: EditDraft): boolean {
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

function FormDivider({ color }: { color?: string }) {
  return <View style={[styles.divider, color ? { backgroundColor: color } : undefined]} />;
}

function DatePillBtn({ date, onPress, bg, fg }: { date: Date; onPress: () => void; bg?: string; fg?: string }) {
  return (
    <Pressable style={[styles.datePill, bg ? { backgroundColor: bg } : undefined]} onPress={onPress} hitSlop={8}>
      <Text style={[styles.datePillText, fg ? { color: fg } : undefined]}>{formatDate(date)}</Text>
    </Pressable>
  );
}

function DropdownBtn({ value, onPress, fg, iconColor }: { value: string; onPress: () => void; fg?: string; iconColor?: string }) {
  return (
    <Pressable style={styles.dropdownRow} onPress={onPress} hitSlop={8}>
      <Text style={[styles.dropdownText, fg ? { color: fg } : undefined]}>{value}</Text>
      <ChevronsUpDown size={14} color={iconColor ?? '#8E8E93'} strokeWidth={2.5} />
    </Pressable>
  );
}

// ─── Props ───────────────────────────────────────────────────────────

interface Props {
  sub: Subscription;
  onSave: (updated: Subscription) => void;
  onCancel: () => void;
  onDelete: () => void;
}

// ─── Main component ──────────────────────────────────────────────────

export function SubscriptionEditView({ sub, onSave, onCancel, onDelete }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const tags = useTagsStore((s) => s.tags);
  const isPlusActive = useSubscriptionsStore((s) => s.isPlusActive);
  const t = useT();
  const allCategoryOptions = [
    ...CATEGORY_PICKER.map((o) => ({ value: o.value, label: t(o.labelKey) })),
    ...tags.map((tag) => ({ value: tag.name as Category, label: tag.name })),
  ];

  const initialDraft = useRef<EditDraft>(makeDraft(sub));
  const [draft, setDraft] = useState<EditDraft>(() => makeDraft(sub));
  const [error, setError] = useState<string | null>(null);
  const [openDate, setOpenDate] = useState<DateKey>(null);
  const [openPicker, setOpenPicker] = useState<PickerKey>(null);
  const [pickerAnchor, setPickerAnchor] = useState<MenuAnchor | null>(null);
  const [currencySheetOpen, setCurrencySheetOpen] = useState(false);

  const isDirty = useCallback(() => !draftEqual(draft, initialDraft.current), [draft]);

  const billingRef = useRef<View>(null);
  const categoryRef = useRef<View>(null);
  const statusRef = useRef<View>(null);
  const reminderRef = useRef<View>(null);

  const openPickerAt = useCallback(
    (ref: React.RefObject<View | null>, key: Exclude<PickerKey, null>) => {
      ref.current?.measureInWindow((x, y, width, height) => {
        setPickerAnchor({ x, y, width, height });
        setOpenPicker(key);
      });
    },
    [],
  );

  const decShared = useCallback(
    () => setDraft((f) => ({ ...f, sharedCount: Math.max(2, f.sharedCount - 1) })), [],
  );
  const incShared = useCallback(
    () => setDraft((f) => ({ ...f, sharedCount: Math.min(10, f.sharedCount + 1) })), [],
  );

  const handleCancel = useCallback(() => {
    if (isDirty()) {
      Alert.alert(
        t('form.unsavedChanges'),
        t('form.unsavedBody'),
        [
          { text: t('form.keepEditing'), style: 'cancel' },
          { text: t('form.discard'), style: 'destructive', onPress: onCancel },
        ],
      );
    } else {
      onCancel();
    }
  }, [isDirty, onCancel, t]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      t('form.deleteTitle'),
      t('form.deleteBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: onDelete },
      ],
    );
  }, [onDelete, t]);

  const handleSave = useCallback(() => {
    if (!draft.name.trim()) {
      setError(t('form.nameRequired'));
      return;
    }
    const priceNum = parseFloat(draft.price.replace(',', '.'));
    if (!draft.price.trim() || isNaN(priceNum) || priceNum <= 0) {
      setError(t('form.invalidPrice'));
      return;
    }
    setError(null);

    const isCustom = draft.billingPeriod === 'custom';
    const resolvedPeriod: BillingPeriod = isCustom
      ? customUnitToSubBilling(draft.customUnit)
      : draft.billingPeriod as BillingPeriod;
    const intervalCount = isCustom ? draft.customCount : 1;
    const monthly = isCustom
      ? customMonthlyEquivalent(priceNum, draft.customCount, draft.customUnit)
      : toMonthly(priceNum, resolvedPeriod);

    const updated: Subscription = {
      ...sub,
      name: draft.name.trim(),
      price_amount: priceNum,
      currency: draft.currency,
      billing_period: resolvedPeriod,
      billing_interval_count: intervalCount,
      next_billing_date: draft.nextPaymentDate.toISOString().split('T')[0],
      start_date: draft.startDate.toISOString().split('T')[0],
      end_date: draft.endEnabled ? draft.endDate.toISOString().split('T')[0] : undefined,
      category: draft.category,
      status: draft.status,
      reminderEnabled: draft.reminderEnabled,
      reminderDays: draft.reminderDays,
      is_shared: draft.shared,
      shared_with_count: draft.shared ? draft.sharedCount : sub.shared_with_count,
      payment_method: draft.paymentMethod || undefined,
      logo_url: draft.logoUrl ? draft.logoUrl : null,
      notes: draft.notes,
      monthly_equivalent_cost: monthly,
      my_monthly_cost: draft.shared
        ? monthly / draft.sharedCount
        : monthly,
      updated_at: new Date().toISOString(),
    };

    onSave(updated);
  }, [draft, sub, onSave]);

  // ─────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ── iOS-style drag handle + header ── */}
        <View style={styles.handleWrap}>
          <View style={[styles.handle, { backgroundColor: isDark ? '#4A4A4C' : '#D4D4D4' }]} />
        </View>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('form.editTitle')}</Text>
          <Pressable style={[styles.closeBtn, { backgroundColor: colors.surfaceSecondary }]} onPress={handleCancel} hitSlop={10}>
            <X size={15} color={isDark ? '#F2F2F7' : '#3C3C43'} strokeWidth={2.5} />
          </Pressable>
        </View>

        {/* ── Error banner ── */}
        {error && (
          <View style={[styles.errorBanner, isDark && { backgroundColor: 'rgba(220,38,38,0.15)' }]}>
            <AlertCircle size={16} color={isDark ? '#F87171' : '#B91C1C'} strokeWidth={2.5} />
            <Text style={[styles.errorText, isDark && { color: '#F87171' }]}>{error}</Text>
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
          <View style={[styles.platformCard, { backgroundColor: colors.surfaceSecondary }]}>
            <TextInput
              style={[styles.platformName, { color: colors.textPrimary }]}
              value={draft.name}
              onChangeText={(txt) => setDraft((f) => ({ ...f, name: txt }))}
              placeholder={t('form.namePlaceholder')}
              placeholderTextColor={isDark ? '#5A5A5E' : '#C7C7CC'}
              returnKeyType="done"
              autoCorrect={false}
            />
            <View style={styles.priceRow}>
              <Pressable
                style={[styles.currencyPill, { backgroundColor: colors.surfaceTertiary }]}
                onPress={() => setCurrencySheetOpen(true)}
                hitSlop={8}
              >
                <Text style={[styles.currencyText, { color: colors.textPrimary }]}>{currencySymbol(draft.currency)}</Text>
                <ChevronDown size={12} color={colors.textMuted} strokeWidth={2.5} />
              </Pressable>
              <TextInput
                style={[styles.priceInput, { color: colors.textPrimary }]}
                value={draft.price}
                onChangeText={(txt) => setDraft((f) => ({ ...f, price: txt }))}
                placeholder="0.00"
                placeholderTextColor={isDark ? '#5A5A5E' : '#C7C7CC'}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
            </View>
          </View>

          {/* Dates + billing */}
          <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{t('form.startDate')}</Text>
              <DatePillBtn date={draft.startDate} onPress={() => setOpenDate('start')} bg={colors.surfaceSecondary} fg={colors.textPrimary} />
            </View>
            <FormDivider color={colors.border} />
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{t('form.nextPayment')}</Text>
              <DatePillBtn date={draft.nextPaymentDate} onPress={() => setOpenDate('next')} bg={colors.surfaceSecondary} fg={colors.textPrimary} />
            </View>
            <FormDivider color={colors.border} />
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{t('form.billingPeriod')}</Text>
              <View ref={billingRef} collapsable={false}>
                <DropdownBtn
                  value={BILLING_KEY_TO_LABEL[draft.billingPeriod] ?? t('form.billing.custom')}
                  onPress={() => openPickerAt(billingRef, 'billing')}
                  fg={colors.textPrimary}
                  iconColor={colors.textMuted}
                />
              </View>
            </View>
            {draft.billingPeriod === 'custom' && (
              <>
                <FormDivider color={colors.border} />
                <View style={styles.row}>
                  <Text style={[styles.rowLabel, styles.rowLabelMuted, { color: colors.textMuted }]}>{t('form.every')}</Text>
                  <View style={styles.customIntervalRow}>
                    <View style={styles.stepper}>
                      <Pressable
                        onPress={() => setDraft((f) => ({ ...f, customCount: Math.max(1, f.customCount - 1) }))}
                        hitSlop={6}
                        disabled={draft.customCount <= 1}
                        style={({ pressed }) => [
                          styles.stepperBtn,
                          { backgroundColor: colors.surfaceSecondary },
                          draft.customCount <= 1 && styles.stepperBtnDisabled,
                          pressed && { opacity: 0.6 },
                        ]}
                      >
                        <Minus size={14} color={colors.textPrimary} strokeWidth={2.5} />
                      </Pressable>
                      <Text style={[styles.stepperValue, { color: colors.textPrimary }]}>{draft.customCount}</Text>
                      <Pressable
                        onPress={() => setDraft((f) => ({ ...f, customCount: Math.min(99, f.customCount + 1) }))}
                        hitSlop={6}
                        disabled={draft.customCount >= 99}
                        style={({ pressed }) => [
                          styles.stepperBtn,
                          { backgroundColor: colors.surfaceSecondary },
                          draft.customCount >= 99 && styles.stepperBtnDisabled,
                          pressed && { opacity: 0.6 },
                        ]}
                      >
                        <Plus size={14} color={colors.textPrimary} strokeWidth={2.5} />
                      </Pressable>
                    </View>
                    <View style={styles.customUnitRow}>
                      {(['day', 'week', 'month', 'year'] as CustomUnit[]).map((u) => (
                        <Pressable
                          key={u}
                          onPress={() => setDraft((f) => ({ ...f, customUnit: u }))}
                          style={[
                            styles.customUnitPill,
                            { backgroundColor: colors.surfaceSecondary },
                            draft.customUnit === u && { backgroundColor: colors.accent },
                          ]}
                        >
                          <Text style={[
                            styles.customUnitText,
                            { color: colors.textMuted },
                            draft.customUnit === u && { color: colors.accentFg },
                          ]}>
                            {t(CUSTOM_UNIT_LABELS[u] as any)}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </View>
              </>
            )}
            <FormDivider color={colors.border} />
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{t('form.endSubscription')}</Text>
              <Switch
                value={draft.endEnabled}
                onValueChange={(v) => setDraft((f) => ({ ...f, endEnabled: v }))}
                trackColor={{ false: isDark ? '#3A3A3C' : '#E5E5EA', true: '#30D158' }}
              />
            </View>
            {draft.endEnabled && (
              <>
                <FormDivider color={colors.border} />
                <View style={styles.row}>
                  <Text style={[styles.rowLabel, styles.rowLabelMuted, { color: colors.textMuted }]}>{t('form.endDateLabel')}</Text>
                  <DatePillBtn date={draft.endDate} onPress={() => setOpenDate('end')} bg={colors.surfaceSecondary} fg={colors.textPrimary} />
                </View>
              </>
            )}
          </View>

          {/* Category */}
          <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{t('form.category')}</Text>
              <View ref={categoryRef} collapsable={false}>
                <DropdownBtn
                  value={allCategoryOptions.find((o) => o.value === draft.category)?.label ?? draft.category}
                  onPress={() => openPickerAt(categoryRef, 'category')}
                  fg={colors.textPrimary}
                  iconColor={colors.textMuted}
                />
              </View>
            </View>
          </View>

          {/* Reminder */}
          <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.row}>
              <View style={styles.rowLabelWithBadge}>
                <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{t('form.enableReminder')}</Text>
                {!isPlusActive && (
                  <View style={[styles.proBadge, { backgroundColor: colors.accent }]}>
                    <Text style={[styles.proBadgeText, { color: colors.accentFg }]}>Pro</Text>
                  </View>
                )}
              </View>
              <Switch
                value={draft.reminderEnabled}
                onValueChange={(v) => {
                  if (!isPlusActive) return;
                  setDraft((f) => ({ ...f, reminderEnabled: v }));
                }}
                disabled={!isPlusActive}
                trackColor={{ false: isDark ? '#3A3A3C' : '#E5E5EA', true: '#30D158' }}
              />
            </View>
            {draft.reminderEnabled && (
              <>
                <FormDivider color={colors.border} />
                <View style={styles.row}>
                  <Text style={[styles.rowLabel, styles.rowLabelMuted, { color: colors.textMuted }]}>{t('form.notifyMe')}</Text>
                  <View ref={reminderRef} collapsable={false}>
                    <DropdownBtn
                      value={t(REMINDER_KEYS[draft.reminderDays])}
                      onPress={() => openPickerAt(reminderRef, 'reminder')}
                      fg={colors.textPrimary}
                      iconColor={colors.textMuted}
                    />
                  </View>
                </View>
              </>
            )}
          </View>

          {/* Shared */}
          <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{t('form.sharedSubscription')}</Text>
              <Switch
                value={draft.shared}
                onValueChange={(v) => setDraft((f) => ({ ...f, shared: v }))}
                trackColor={{ false: isDark ? '#3A3A3C' : '#E5E5EA', true: '#30D158' }}
              />
            </View>
            {draft.shared && (
              <>
                <FormDivider color={colors.border} />
                <View style={styles.row}>
                  <Text style={[styles.rowLabel, styles.rowLabelMuted, { color: colors.textMuted }]}>{t('form.totalPeople')}</Text>
                  <View style={styles.stepper}>
                    <Pressable
                      onPress={decShared}
                      hitSlop={6}
                      disabled={draft.sharedCount <= 2}
                      style={({ pressed }) => [
                        styles.stepperBtn,
                        { backgroundColor: colors.surfaceSecondary },
                        draft.sharedCount <= 2 && styles.stepperBtnDisabled,
                        pressed && { opacity: 0.6 },
                      ]}
                    >
                      <Minus size={14} color={colors.textPrimary} strokeWidth={2.5} />
                    </Pressable>
                    <Text style={[styles.stepperValue, { color: colors.textPrimary }]}>{draft.sharedCount}</Text>
                    <Pressable
                      onPress={incShared}
                      hitSlop={6}
                      disabled={draft.sharedCount >= 10}
                      style={({ pressed }) => [
                        styles.stepperBtn,
                        draft.sharedCount >= 10 && styles.stepperBtnDisabled,
                        pressed && { opacity: 0.6 },
                      ]}
                    >
                      <Plus size={14} color={colors.textPrimary} strokeWidth={2.5} />
                    </Pressable>
                  </View>
                </View>
              </>
            )}
          </View>

          {/* Payment method */}
          <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{t('form.paymentMethod')}</Text>
              <TextInput
                style={[styles.inlineInput, { color: colors.textPrimary }]}
                value={draft.paymentMethod}
                onChangeText={(txt) => setDraft((f) => ({ ...f, paymentMethod: txt }))}
                placeholder="Visa, PayPal..."
                placeholderTextColor={isDark ? '#5A5A5E' : '#C7C7CC'}
                returnKeyType="done"
                autoCorrect={false}
                textAlign="right"
              />
            </View>
          </View>

          {/* Logo URL */}
          <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{t('form.logoUrl')}</Text>
              <View style={styles.urlRow}>
                {draft.logoUrl.length === 0 ? (
                  <Pressable
                    onPress={async () => {
                      const clip = await Clipboard.getStringAsync();
                      if (clip) setDraft((f) => ({ ...f, logoUrl: clip.trim() }));
                    }}
                    hitSlop={8}
                  >
                    <Text style={styles.pasteLink}>{t('form.pasteUrl')}</Text>
                  </Pressable>
                ) : (
                  <>
                    <TextInput
                      style={[styles.urlInput, { color: colors.textPrimary }]}
                      value={draft.logoUrl}
                      onChangeText={(txt) => setDraft((f) => ({ ...f, logoUrl: txt }))}
                      placeholder="https://..."
                      placeholderTextColor={isDark ? '#5A5A5E' : '#C7C7CC'}
                      keyboardType="url"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="done"
                    />
                    <Pressable
                      onPress={() => setDraft((f) => ({ ...f, logoUrl: '' }))}
                      hitSlop={8}
                      style={styles.urlClear}
                    >
                      <X size={12} color={colors.textMuted} strokeWidth={2.5} />
                    </Pressable>
                  </>
                )}
              </View>
            </View>
          </View>

          {/* Status + Notes */}
          <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{t('form.status')}</Text>
              <View ref={statusRef} collapsable={false}>
                <DropdownBtn
                  value={t(STATUS_KEYS[draft.status])}
                  onPress={() => openPickerAt(statusRef, 'status')}
                  fg={colors.textPrimary}
                  iconColor={colors.textMuted}
                />
              </View>
            </View>
            <FormDivider color={colors.border} />
            <View style={styles.notesRow}>
              <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{t('form.notes')}</Text>
              <TextInput
                style={[styles.notesInput, { color: colors.textPrimary }]}
                value={draft.notes}
                onChangeText={(txt) => setDraft((f) => ({ ...f, notes: txt }))}
                placeholder={t('form.notesPlaceholder')}
                placeholderTextColor={isDark ? '#5A5A5E' : '#C7C7CC'}
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>

          <View style={styles.destructiveSpacer} />
          <View style={[styles.destructiveCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Pressable
              onPress={handleDelete}
              style={({ pressed }) => [
                styles.destructiveRow,
                pressed && { opacity: 0.55 },
              ]}
            >
              <Text style={[styles.destructiveText, { color: colors.danger }]}>{t('form.deleteSubscription')}</Text>
            </Pressable>
          </View>
        </ScrollView>

        {/* ── Footer — Save primary CTA (single, pinned) ── */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12), backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <Pressable
            style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.accent }, pressed && { opacity: 0.85 }]}
            onPress={handleSave}
          >
            <Text style={[styles.saveBtnText, { color: colors.accentFg }]}>{t('form.saveChanges')}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* ── Date pickers ── */}
      <NativeDatePickerSheet
        visible={openDate === 'start'}
        value={draft.startDate}
        title={t('form.startDate')}
        onChange={(d) => setDraft((f) => ({ ...f, startDate: d }))}
        onClose={() => setOpenDate(null)}
      />
      <NativeDatePickerSheet
        visible={openDate === 'next'}
        value={draft.nextPaymentDate}
        title={t('form.nextPayment')}
        minimumDate={draft.startDate}
        onChange={(d) => setDraft((f) => ({ ...f, nextPaymentDate: d }))}
        onClose={() => setOpenDate(null)}
      />
      <NativeDatePickerSheet
        visible={openDate === 'end'}
        value={draft.endDate}
        title={t('form.endDateLabel')}
        minimumDate={draft.startDate}
        onChange={(d) => setDraft((f) => ({ ...f, endDate: d }))}
        onClose={() => setOpenDate(null)}
      />

      {/* ── Currency sheet ── */}
      <CurrencySheet
        visible={currencySheetOpen}
        onClose={() => setCurrencySheetOpen(false)}
        selectedCode={draft.currency}
        onSelectCurrency={(c) => setDraft((f) => ({ ...f, currency: c.code }))}
      />

      {/* ── Floating menus ── */}
      <FloatingOptionMenu
        visible={openPicker === 'billing'}
        anchor={pickerAnchor}
        options={[...BILLING_OPTIONS]}
        selected={BILLING_KEY_TO_LABEL[draft.billingPeriod] ?? 'Custom'}
        onSelect={(label) => {
          const key = BILLING_LABEL_TO_KEY[label as BillingLabel];
          if (key) setDraft((f) => ({ ...f, billingPeriod: key as any }));
        }}
        onClose={() => setOpenPicker(null)}
      />
      <FloatingOptionMenu
        visible={openPicker === 'category'}
        anchor={pickerAnchor}
        options={allCategoryOptions.map((o) => o.label)}
        selected={allCategoryOptions.find((o) => o.value === draft.category)?.label ?? draft.category}
        onSelect={(label) => {
          const found = allCategoryOptions.find((o) => o.label === label);
          if (found) setDraft((f) => ({ ...f, category: found.value }));
        }}
        onClose={() => setOpenPicker(null)}
      />
      <FloatingOptionMenu
        visible={openPicker === 'status'}
        anchor={pickerAnchor}
        options={STATUS_VALUES.map((v) => t(STATUS_KEYS[v]))}
        selected={t(STATUS_KEYS[draft.status])}
        onSelect={(label) => {
          const found = STATUS_VALUES.find((v) => t(STATUS_KEYS[v]) === label);
          if (found) setDraft((f) => ({ ...f, status: found as SubscriptionStatus }));
        }}
        onClose={() => setOpenPicker(null)}
      />
      <FloatingOptionMenu
        visible={openPicker === 'reminder'}
        anchor={pickerAnchor}
        options={REMINDER_VALUES.map((v) => t(REMINDER_KEYS[v]))}
        selected={t(REMINDER_KEYS[draft.reminderDays])}
        onSelect={(label) => {
          const found = REMINDER_VALUES.find((v) => t(REMINDER_KEYS[v]) === label);
          if (found) setDraft((f) => ({ ...f, reminderDays: found as ReminderDays }));
        }}
        onClose={() => setOpenPicker(null)}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 6,
  },

  // iOS-style drag handle at the top of the sheet.
  handleWrap: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 10,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 9999,
    backgroundColor: '#D4D4D4',
  },

  // Header — identical to CreateSubscriptionSheet
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    ...fontFamily.semiBold,
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

  // Error
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
    ...fontFamily.medium,
    fontSize: fontSize[16],
    color: '#B91C1C',
    flex: 1,
    letterSpacing: -0.1,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },

  // Platform card (top name + price)
  platformCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 13,
  },
  platformName: {
    ...fontFamily.semiBold,
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
    ...fontFamily.semiBold,
    fontSize: fontSize[15],
    color: '#000000',
    letterSpacing: -0.1,
  },
  priceInput: {
    ...fontFamily.medium,
    fontSize: fontSize[18],
    color: '#000000',
    letterSpacing: -0.2,
    paddingVertical: 8,
    paddingHorizontal: 0,
    flex: 1,
  },

  // Form groups
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
    ...fontFamily.medium,
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
    ...fontFamily.semiBold,
    fontSize: fontSize[11],
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  // Date pill
  datePill: {
    backgroundColor: '#F2F2F7',
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  datePillText: {
    ...fontFamily.medium,
    fontSize: fontSize[15],
    color: '#000000',
    letterSpacing: -0.1,
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
  },
  customUnitText: {
    ...fontFamily.semiBold,
    fontSize: fontSize[13],
  },

  // Dropdown
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dropdownText: {
    ...fontFamily.medium,
    fontSize: fontSize[16],
    color: '#000000',
    letterSpacing: -0.1,
  },

  // Stepper
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
    ...fontFamily.semiBold,
    fontSize: fontSize[16],
    color: '#000000',
    minWidth: 22,
    textAlign: 'center',
    letterSpacing: -0.2,
  },

  // Inline text input (payment method)
  inlineInput: {
    ...fontFamily.medium,
    fontSize: fontSize[16],
    color: '#000000',
    letterSpacing: -0.1,
    flex: 1,
    textAlign: 'right',
    padding: 0,
  },

  // Logo URL row
  urlRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    minWidth: 0,
  },
  urlInput: {
    ...fontFamily.medium,
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
    ...fontFamily.semiBold,
    fontSize: fontSize[15],
    color: '#007AFF',
    letterSpacing: -0.1,
  },

  // Notes
  notesRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  notesInput: {
    ...fontFamily.medium,
    fontSize: fontSize[15],
    color: '#000000',
    letterSpacing: -0.1,
    marginTop: 8,
    minHeight: 60,
    padding: 0,
  },

  // Destructive zone (end of scroll) — Apple Contacts / Calendar pattern
  destructiveSpacer: {
    height: 14,
  },
  destructiveCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DCDCE0',
    overflow: 'hidden',
  },
  destructiveRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destructiveText: {
    ...fontFamily.semiBold,
    fontSize: fontSize[16],
    color: '#FF3B30',
    letterSpacing: -0.1,
  },

  // Footer — single pinned Save CTA
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#DCDCE0',
  },
  saveBtn: {
    height: 52,
    borderRadius: 9999,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    ...fontFamily.semiBold,
    fontSize: fontSize[16],
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
});
