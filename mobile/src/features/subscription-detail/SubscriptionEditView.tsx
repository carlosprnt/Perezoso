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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, ChevronDown, Minus, Plus, X } from 'lucide-react-native';

import { FloatingOptionMenu, MenuAnchor } from '../../components/FloatingOptionMenu';
import { CurrencySheet, currencySymbol } from '../settings/CurrencySheet';
import { fontFamily, fontSize } from '../../design/typography';
import type { Subscription, BillingPeriod, Category, SubscriptionStatus } from '../subscriptions/types';
import { CATEGORY_PICKER } from './helpers';
import { formatDate } from '../../lib/formatting';
import { NativeDatePickerSheet } from '../add-subscription/pickers/NativeDatePickerSheet';
import { useTagsStore } from '../settings/useSettingsStore';
import { useSubscriptionsStore } from '../../stores/subscriptionsStore';
import { usePaywallStore } from '../paywall/usePaywallStore';
import { useSubscriptionDetailStore } from './useSubscriptionDetailStore';

// ─── Types ───────────────────────────────────────────────────────────

type ReminderDays = '1 día antes' | '3 días antes' | '7 días antes';
type DateKey = 'start' | 'next' | 'end' | null;
type PickerKey = 'billing' | 'category' | 'status' | 'reminder' | null;

interface EditDraft {
  name: string;
  currency: string;
  price: string;
  startDate: Date;
  nextPaymentDate: Date;
  billingPeriod: BillingPeriod;
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

const BILLING_OPTIONS = ['Monthly', 'Yearly', 'Quarterly', 'Weekly'] as const;
type BillingLabel = typeof BILLING_OPTIONS[number];
const BILLING_LABEL_TO_KEY: Record<BillingLabel, BillingPeriod> = {
  Monthly: 'monthly',
  Yearly: 'yearly',
  Quarterly: 'quarterly',
  Weekly: 'weekly',
};
const BILLING_KEY_TO_LABEL: Record<BillingPeriod, BillingLabel> = {
  monthly: 'Monthly',
  yearly: 'Yearly',
  quarterly: 'Quarterly',
  weekly: 'Weekly',
};

const STATUS_OPTIONS = ['Activa', 'Pausada', 'Cancelada', 'Finalizado', 'Prueba'] as const;
type StatusLabel = typeof STATUS_OPTIONS[number];
const STATUS_LABEL_TO_KEY: Record<StatusLabel, SubscriptionStatus> = {
  Activa: 'active',
  Pausada: 'paused',
  Cancelada: 'cancelled',
  Finalizado: 'ended',
  Prueba: 'trial',
};
const STATUS_KEY_TO_LABEL: Record<string, StatusLabel> = {
  active: 'Activa',
  paused: 'Pausada',
  cancelled: 'Cancelada',
  ended: 'Finalizado',
  trial: 'Prueba',
};

const REMINDER_OPTIONS: ReminderDays[] = ['1 día antes', '3 días antes', '7 días antes'];

function nextYear(d: Date): Date {
  return new Date(d.getFullYear() + 1, d.getMonth(), d.getDate());
}

// ─── Draft helpers ────────────────────────────────────────────────────

function makeDraft(sub: Subscription): EditDraft {
  const today = new Date();
  return {
    name: sub.name,
    currency: sub.currency,
    price: sub.price_amount.toFixed(2).replace('.', ','),
    startDate: sub.start_date ? new Date(sub.start_date) : new Date(sub.created_at),
    nextPaymentDate: new Date(sub.next_billing_date),
    billingPeriod: sub.billing_period,
    endEnabled: !!sub.end_date,
    endDate: sub.end_date ? new Date(sub.end_date) : nextYear(today),
    category: sub.category,
    status: sub.status,
    reminderEnabled: sub.reminderEnabled ?? false,
    reminderDays: sub.reminderDays ?? '1 día antes',
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
  const tags = useTagsStore((s) => s.tags);
  const isPlusActive = useSubscriptionsStore((s) => s.isPlusActive);
  const allCategoryOptions = [
    ...CATEGORY_PICKER,
    ...tags.map((t) => ({ value: t.name as Category, label: t.name })),
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
        'Cambios sin guardar',
        '¿Seguro que quieres salir? Perderás los cambios.',
        [
          { text: 'Seguir editando', style: 'cancel' },
          { text: 'Descartar', style: 'destructive', onPress: onCancel },
        ],
      );
    } else {
      onCancel();
    }
  }, [isDirty, onCancel]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Eliminar suscripción',
      '¿Seguro que quieres eliminar esta suscripción? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: onDelete },
      ],
    );
  }, [onDelete]);

  const handleSave = useCallback(() => {
    if (!draft.name.trim()) {
      setError('El nombre de la suscripción es obligatorio.');
      return;
    }
    const priceNum = parseFloat(draft.price.replace(',', '.'));
    if (!draft.price.trim() || isNaN(priceNum) || priceNum <= 0) {
      setError('Introduce un precio válido.');
      return;
    }
    setError(null);

    const updated: Subscription = {
      ...sub,
      name: draft.name.trim(),
      price_amount: priceNum,
      currency: draft.currency,
      billing_period: draft.billingPeriod,
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
      // Empty string ⇒ user cleared the logo; store null so the avatar
      // falls back to initials (same behaviour as "no logo" creation).
      logo_url: draft.logoUrl ? draft.logoUrl : null,
      notes: draft.notes,
      monthly_equivalent_cost: priceNum,
      my_monthly_cost: draft.shared ? priceNum / draft.sharedCount : priceNum,
      updated_at: new Date().toISOString(),
    };

    onSave(updated);
  }, [draft, sub, onSave]);

  // ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.sheet}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ── iOS-style drag handle + header ── */}
        <View style={styles.handleWrap}>
          <View style={styles.handle} />
        </View>
        <View style={styles.header}>
          <Text style={styles.title}>Editar suscripción</Text>
          <Pressable style={styles.closeBtn} onPress={handleCancel} hitSlop={10}>
            <X size={15} color="#3C3C43" strokeWidth={2.5} />
          </Pressable>
        </View>

        {/* ── Error banner ── */}
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
              value={draft.name}
              onChangeText={(t) => setDraft((f) => ({ ...f, name: t }))}
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
                <Text style={styles.currencyText}>{currencySymbol(draft.currency)}</Text>
                <ChevronDown size={12} color="#8E8E93" strokeWidth={2.5} />
              </Pressable>
              <TextInput
                style={styles.priceInput}
                value={draft.price}
                onChangeText={(t) => setDraft((f) => ({ ...f, price: t }))}
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
              <DatePillBtn date={draft.startDate} onPress={() => setOpenDate('start')} />
            </View>
            <FormDivider />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Próxima fecha de pago</Text>
              <DatePillBtn date={draft.nextPaymentDate} onPress={() => setOpenDate('next')} />
            </View>
            <FormDivider />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Periodo de cobro</Text>
              <View ref={billingRef} collapsable={false}>
                <DropdownBtn
                  value={BILLING_KEY_TO_LABEL[draft.billingPeriod]}
                  onPress={() => openPickerAt(billingRef, 'billing')}
                />
              </View>
            </View>
            <FormDivider />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Fin de la suscripción</Text>
              <Switch
                value={draft.endEnabled}
                onValueChange={(v) => setDraft((f) => ({ ...f, endEnabled: v }))}
                trackColor={{ false: '#E5E5EA', true: '#34C759' }}
              />
            </View>
            {draft.endEnabled && (
              <>
                <FormDivider />
                <View style={styles.row}>
                  <Text style={[styles.rowLabel, styles.rowLabelMuted]}>Fecha de fin</Text>
                  <DatePillBtn date={draft.endDate} onPress={() => setOpenDate('end')} />
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
                  value={allCategoryOptions.find((o) => o.value === draft.category)?.label ?? draft.category}
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
                value={draft.reminderEnabled}
                onValueChange={(v) => {
                  if (v && !isPlusActive) {
                    useSubscriptionDetailStore.getState().close();
                    setTimeout(() => usePaywallStore.getState().open('renewal_reminders'), 400);
                    return;
                  }
                  setDraft((f) => ({ ...f, reminderEnabled: v }));
                }}
                trackColor={{ false: '#E5E5EA', true: '#34C759' }}
              />
            </View>
            {draft.reminderEnabled && (
              <>
                <FormDivider />
                <View style={styles.row}>
                  <Text style={[styles.rowLabel, styles.rowLabelMuted]}>Avisarme</Text>
                  <View ref={reminderRef} collapsable={false}>
                    <DropdownBtn
                      value={draft.reminderDays}
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
                value={draft.shared}
                onValueChange={(v) => setDraft((f) => ({ ...f, shared: v }))}
                trackColor={{ false: '#E5E5EA', true: '#34C759' }}
              />
            </View>
            {draft.shared && (
              <>
                <FormDivider />
                <View style={styles.row}>
                  <Text style={[styles.rowLabel, styles.rowLabelMuted]}>Total personas</Text>
                  <View style={styles.stepper}>
                    <Pressable
                      onPress={decShared}
                      hitSlop={6}
                      disabled={draft.sharedCount <= 2}
                      style={({ pressed }) => [
                        styles.stepperBtn,
                        draft.sharedCount <= 2 && styles.stepperBtnDisabled,
                        pressed && { opacity: 0.6 },
                      ]}
                    >
                      <Minus size={14} color="#000000" strokeWidth={2.5} />
                    </Pressable>
                    <Text style={styles.stepperValue}>{draft.sharedCount}</Text>
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
                value={draft.paymentMethod}
                onChangeText={(t) => setDraft((f) => ({ ...f, paymentMethod: t }))}
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
                  value={draft.logoUrl}
                  onChangeText={(t) => setDraft((f) => ({ ...f, logoUrl: t }))}
                  placeholder="https://..."
                  placeholderTextColor="#C7C7CC"
                  keyboardType="url"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                />
                {draft.logoUrl.length > 0 && (
                  <Pressable
                    onPress={() => setDraft((f) => ({ ...f, logoUrl: '' }))}
                    hitSlop={8}
                    style={styles.urlClear}
                  >
                    <X size={12} color="#8E8E93" strokeWidth={2.5} />
                  </Pressable>
                )}
              </View>
            </View>
          </View>

          {/* Status + Notes */}
          <View style={styles.group}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Estado</Text>
              <View ref={statusRef} collapsable={false}>
                <DropdownBtn
                  value={STATUS_KEY_TO_LABEL[draft.status]}
                  onPress={() => openPickerAt(statusRef, 'status')}
                />
              </View>
            </View>
            <FormDivider />
            <View style={styles.notesRow}>
              <Text style={styles.rowLabel}>Notas</Text>
              <TextInput
                style={styles.notesInput}
                value={draft.notes}
                onChangeText={(t) => setDraft((f) => ({ ...f, notes: t }))}
                placeholder="Añadir opcional"
                placeholderTextColor="#C7C7CC"
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* ── Destructive zone ──
              Apple's pattern in Contacts / Calendar edit sheets: a red
              "Delete …" card placed at the very end of the scroll,
              visually integrated (same card chrome as the form groups)
              but separated from the primary Save action below. */}
          <View style={styles.destructiveSpacer} />
          <View style={styles.destructiveCard}>
            <Pressable
              onPress={handleDelete}
              style={({ pressed }) => [
                styles.destructiveRow,
                pressed && { opacity: 0.55 },
              ]}
            >
              <Text style={styles.destructiveText}>Eliminar suscripción</Text>
            </Pressable>
          </View>
        </ScrollView>

        {/* ── Footer — Save primary CTA (single, pinned) ── */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Pressable
            style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }]}
            onPress={handleSave}
          >
            <Text style={styles.saveBtnText}>Guardar cambios</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* ── Date pickers ── */}
      <NativeDatePickerSheet
        visible={openDate === 'start'}
        value={draft.startDate}
        title="Inicio de suscripción"
        onChange={(d) => setDraft((f) => ({ ...f, startDate: d }))}
        onClose={() => setOpenDate(null)}
      />
      <NativeDatePickerSheet
        visible={openDate === 'next'}
        value={draft.nextPaymentDate}
        title="Próxima fecha de pago"
        minimumDate={draft.startDate}
        onChange={(d) => setDraft((f) => ({ ...f, nextPaymentDate: d }))}
        onClose={() => setOpenDate(null)}
      />
      <NativeDatePickerSheet
        visible={openDate === 'end'}
        value={draft.endDate}
        title="Fecha de fin"
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
        selected={BILLING_KEY_TO_LABEL[draft.billingPeriod]}
        onSelect={(label) => {
          const key = BILLING_LABEL_TO_KEY[label as BillingLabel];
          if (key) setDraft((f) => ({ ...f, billingPeriod: key }));
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
        options={[...STATUS_OPTIONS]}
        selected={STATUS_KEY_TO_LABEL[draft.status]}
        onSelect={(label) => {
          const key = STATUS_LABEL_TO_KEY[label as StatusLabel];
          if (key) setDraft((f) => ({ ...f, status: key }));
        }}
        onClose={() => setOpenPicker(null)}
      />
      <FloatingOptionMenu
        visible={openPicker === 'reminder'}
        anchor={pickerAnchor}
        options={REMINDER_OPTIONS}
        selected={draft.reminderDays}
        onSelect={(v) => setDraft((f) => ({ ...f, reminderDays: v as ReminderDays }))}
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
    ...fontFamily.regular,
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

  // Date pill
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

  // Dropdown
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
    ...fontFamily.semibold,
    fontSize: fontSize[16],
    color: '#000000',
    minWidth: 22,
    textAlign: 'center',
    letterSpacing: -0.2,
  },

  // Inline text input (payment method)
  inlineInput: {
    ...fontFamily.regular,
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

  // Notes
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
    ...fontFamily.semibold,
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
    ...fontFamily.semibold,
    fontSize: fontSize[16],
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
});
