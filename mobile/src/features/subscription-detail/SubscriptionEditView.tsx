// SubscriptionEditView — edit mode rendered inside the native iOS
// pageSheet. Shares the same Modal as the detail view; mode flip is
// controlled by useSubscriptionDetailStore.
//
// Behaviour:
//  · Pre-fills all fields from the current subscription.
//  · "Guardar" commits changes to the store (view mode shows updated data).
//  · "Cancelar" or the X button show a dirty-check Alert before dismissing.
//  · "Eliminar suscripción" at the bottom shows a destructive Alert.

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
import { AlertCircle, ChevronDown, X } from 'lucide-react-native';

import { FloatingOptionMenu, MenuAnchor } from '../../components/FloatingOptionMenu';
import { useTheme } from '../../design/useTheme';
import { fontFamily, fontSize, lineHeight } from '../../design/typography';
import { radius } from '../../design/radius';
import type { Subscription, BillingPeriod, Category } from '../subscriptions/types';
import {
  BILLING_PERIOD_PICKER,
  CATEGORY_PICKER,
  formatDateShort,
  BILLING_PERIOD_LABELS,
  CATEGORY_LABELS,
} from './helpers';
import { NativeDatePickerSheet } from '../add-subscription/pickers/NativeDatePickerSheet';

// ─── Draft type — mirrors Subscription fields the user can edit ───────

interface EditDraft {
  name: string;
  price: string;
  currency: string;
  billingPeriod: BillingPeriod;
  nextBillingDate: Date;
  category: Category;
  reminderEnabled: boolean;
  reminderDays: '1 día antes' | '3 días antes' | '7 días antes';
  notes: string;
}

const CURRENCIES = ['€', '$', 'US$', '£'] as const;
const REMINDER_OPTIONS = ['1 día antes', '3 días antes', '7 días antes'] as const;

type PickerKey = 'currency' | 'billing' | 'category' | 'reminder' | null;
type DateKey = 'nextBilling' | null;

function makeDraft(sub: Subscription): EditDraft {
  return {
    name: sub.name,
    price: sub.price_amount.toFixed(2).replace('.', ','),
    currency: sub.currency === 'EUR' ? '€' : sub.currency,
    billingPeriod: sub.billing_period,
    nextBillingDate: new Date(sub.next_billing_date),
    category: sub.category,
    reminderEnabled: sub.reminderEnabled ?? false,
    reminderDays: sub.reminderDays ?? '1 día antes',
    notes: sub.notes ?? '',
  };
}

function draftEqual(a: EditDraft, b: EditDraft): boolean {
  return (
    a.name === b.name &&
    a.price === b.price &&
    a.currency === b.currency &&
    a.billingPeriod === b.billingPeriod &&
    a.nextBillingDate.getTime() === b.nextBillingDate.getTime() &&
    a.category === b.category &&
    a.reminderEnabled === b.reminderEnabled &&
    a.reminderDays === b.reminderDays &&
    a.notes === b.notes
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function FormDivider() {
  return <View style={styles.divider} />;
}

function DatePill({ date, onPress }: { date: Date; onPress: () => void }) {
  return (
    <Pressable style={styles.datePill} onPress={onPress} hitSlop={8}>
      <Text style={styles.datePillText}>{formatDateShort(date)}</Text>
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

// ─── Main component ──────────────────────────────────────────────────

interface Props {
  sub: Subscription;
  onSave: (updated: Subscription) => void;
  onCancel: () => void;
  onDelete: () => void;
}

export function SubscriptionEditView({ sub, onSave, onCancel, onDelete }: Props) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const initialDraft = useRef<EditDraft>(makeDraft(sub));
  const [draft, setDraft] = useState<EditDraft>(() => makeDraft(sub));
  const [error, setError] = useState<string | null>(null);
  const [openPicker, setOpenPicker] = useState<PickerKey>(null);
  const [openDate, setOpenDate] = useState<DateKey>(null);
  const [anchor, setAnchor] = useState<MenuAnchor | null>(null);

  const isDirty = useCallback(
    () => !draftEqual(draft, initialDraft.current),
    [draft],
  );

  // ── Picker anchor measurement ──────────────────────────────────────
  const currencyRef = useRef<View>(null);
  const billingRef = useRef<View>(null);
  const categoryRef = useRef<View>(null);
  const reminderRef = useRef<View>(null);

  const openPickerAt = useCallback(
    (ref: React.RefObject<View | null>, key: Exclude<PickerKey, null>) => {
      ref.current?.measureInWindow((x, y, width, height) => {
        setAnchor({ x, y, width, height });
        setOpenPicker(key);
      });
    },
    [],
  );

  // ── Dirty check on cancel ─────────────────────────────────────────
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

  // ── Delete confirmation ───────────────────────────────────────────
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

  // ── Save ─────────────────────────────────────────────────────────
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

    const currencyValue = draft.currency === '€' ? 'EUR'
      : draft.currency === '$' ? 'USD'
      : draft.currency;

    const monthly = priceNum;

    const updated: Subscription = {
      ...sub,
      name: draft.name.trim(),
      price_amount: priceNum,
      currency: currencyValue,
      billing_period: draft.billingPeriod,
      next_billing_date: draft.nextBillingDate.toISOString().split('T')[0],
      category: draft.category,
      reminderEnabled: draft.reminderEnabled,
      reminderDays: draft.reminderDays,
      notes: draft.notes,
      monthly_equivalent_cost: monthly,
      my_monthly_cost: sub.is_shared ? monthly / sub.shared_with_count : monthly,
      updated_at: new Date().toISOString(),
    };

    onSave(updated);
  }, [draft, sub, onSave]);

  const cardBg = colors.surface;
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';

  return (
    <View style={[styles.root, { backgroundColor: colors.surface }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Pressable onPress={handleCancel} hitSlop={10} style={styles.cancelTextBtn}>
            <Text style={[styles.cancelText, { color: colors.textPrimary }]}>Cancelar</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Editar suscripción
          </Text>
          <Pressable onPress={handleSave} hitSlop={10} style={styles.saveTextBtn}>
            <Text style={styles.saveText}>Guardar</Text>
          </Pressable>
        </View>

        {/* ── Error banner ── */}
        {error && (
          <View style={styles.errorBanner}>
            <AlertCircle size={16} color="#B91C1C" strokeWidth={2.5} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* ── Platform + price card ── */}
          <View style={[styles.card, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7', borderColor: 'transparent' }]}>
            <TextInput
              style={[styles.platformName, { color: colors.textPrimary }]}
              value={draft.name}
              onChangeText={(t) => setDraft((d) => ({ ...d, name: t }))}
              placeholder="Nombre"
              placeholderTextColor="#C7C7CC"
              returnKeyType="done"
              autoCorrect={false}
            />
            <View style={styles.priceRow}>
              <View ref={currencyRef} collapsable={false}>
                <Pressable
                  style={styles.currencyPill}
                  onPress={() => openPickerAt(currencyRef, 'currency')}
                  hitSlop={8}
                >
                  <Text style={[styles.currencyText, { color: colors.textPrimary }]}>
                    {draft.currency}
                  </Text>
                  <ChevronDown size={12} color="#8E8E93" strokeWidth={2.5} />
                </Pressable>
              </View>
              <TextInput
                style={[styles.priceInput, { color: colors.textPrimary }]}
                value={draft.price}
                onChangeText={(t) => setDraft((d) => ({ ...d, price: t }))}
                placeholder="0,00"
                placeholderTextColor="#C7C7CC"
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
            </View>
          </View>

          {/* ── Dates + billing ── */}
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>
                Próximo cobro
              </Text>
              <DatePill
                date={draft.nextBillingDate}
                onPress={() => setOpenDate('nextBilling')}
              />
            </View>
            <FormDivider />
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>
                Periodo de cobro
              </Text>
              <View ref={billingRef} collapsable={false}>
                <DropdownBtn
                  value={BILLING_PERIOD_LABELS[draft.billingPeriod]}
                  onPress={() => openPickerAt(billingRef, 'billing')}
                />
              </View>
            </View>
          </View>

          {/* ── Category ── */}
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>
                Categoría
              </Text>
              <View ref={categoryRef} collapsable={false}>
                <DropdownBtn
                  value={CATEGORY_LABELS[draft.category]}
                  onPress={() => openPickerAt(categoryRef, 'category')}
                />
              </View>
            </View>
          </View>

          {/* ── Reminder ── */}
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>
                Aviso de renovación
              </Text>
              <Switch
                value={draft.reminderEnabled}
                onValueChange={(v) => setDraft((d) => ({ ...d, reminderEnabled: v }))}
                trackColor={{ false: '#E5E5EA', true: '#34C759' }}
                thumbColor="#FFFFFF"
              />
            </View>
            {draft.reminderEnabled && (
              <>
                <FormDivider />
                <View style={styles.row}>
                  <Text style={[styles.rowLabel, { color: colors.textMuted }]}>
                    Avisarme
                  </Text>
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

          {/* ── Notes ── */}
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.notesRow}>
              <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Notas</Text>
              <TextInput
                style={[styles.notesInput, { color: colors.textPrimary }]}
                value={draft.notes}
                onChangeText={(t) => setDraft((d) => ({ ...d, notes: t }))}
                placeholder="Añadir notas opcionales…"
                placeholderTextColor="#C7C7CC"
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* ── Destructive zone ── */}
          <Pressable
            style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.7 }]}
            onPress={handleDelete}
          >
            <Text style={styles.deleteBtnText}>Eliminar suscripción</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Pickers ── */}
      <NativeDatePickerSheet
        visible={openDate === 'nextBilling'}
        value={draft.nextBillingDate}
        title="Próximo cobro"
        onChange={(d) => setDraft((f) => ({ ...f, nextBillingDate: d }))}
        onClose={() => setOpenDate(null)}
      />
      <FloatingOptionMenu
        visible={openPicker === 'currency'}
        anchor={anchor}
        options={[...CURRENCIES]}
        selected={draft.currency}
        onSelect={(v) => setDraft((d) => ({ ...d, currency: v }))}
        onClose={() => setOpenPicker(null)}
      />
      <FloatingOptionMenu
        visible={openPicker === 'billing'}
        anchor={anchor}
        options={BILLING_PERIOD_PICKER.map((o) => o.label)}
        selected={BILLING_PERIOD_LABELS[draft.billingPeriod]}
        onSelect={(label) => {
          const found = BILLING_PERIOD_PICKER.find((o) => o.label === label);
          if (found) setDraft((d) => ({ ...d, billingPeriod: found.value }));
        }}
        onClose={() => setOpenPicker(null)}
      />
      <FloatingOptionMenu
        visible={openPicker === 'category'}
        anchor={anchor}
        options={CATEGORY_PICKER.map((o) => o.label)}
        selected={CATEGORY_LABELS[draft.category]}
        onSelect={(label) => {
          const found = CATEGORY_PICKER.find((o) => o.label === label);
          if (found) setDraft((d) => ({ ...d, category: found.value }));
        }}
        onClose={() => setOpenPicker(null)}
      />
      <FloatingOptionMenu
        visible={openPicker === 'reminder'}
        anchor={anchor}
        options={[...REMINDER_OPTIONS]}
        selected={draft.reminderDays}
        onSelect={(v) => setDraft((d) => ({ ...d, reminderDays: v as typeof draft.reminderDays }))}
        onClose={() => setOpenPicker(null)}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  headerTitle: {
    ...fontFamily.bold,
    fontSize: fontSize[18],
    letterSpacing: -0.3,
    flex: 1,
    textAlign: 'center',
  },
  cancelTextBtn: {
    width: 80,
  },
  cancelText: {
    ...fontFamily.regular,
    fontSize: fontSize[16],
  },
  saveTextBtn: {
    width: 80,
    alignItems: 'flex-end',
  },
  saveText: {
    ...fontFamily.semibold,
    fontSize: fontSize[16],
    color: '#007AFF',
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: {
    ...fontFamily.regular,
    fontSize: fontSize[15],
    color: '#B91C1C',
    flex: 1,
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 10,
  },

  card: {
    borderRadius: radius['3xl'],
    borderWidth: 1,
    overflow: 'hidden',
  },

  // Platform + price card
  platformName: {
    ...fontFamily.bold,
    fontSize: fontSize[20],
    letterSpacing: -0.3,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    padding: 0,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 13,
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
    letterSpacing: -0.1,
  },
  priceInput: {
    ...fontFamily.regular,
    fontSize: fontSize[18],
    letterSpacing: -0.2,
    padding: 0,
    flex: 1,
  },

  // Form rows
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
    letterSpacing: -0.1,
    flex: 1,
    paddingRight: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(60,60,67,0.1)',
    marginLeft: 16,
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

  // Notes
  notesRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 8,
  },
  notesInput: {
    ...fontFamily.regular,
    fontSize: fontSize[15],
    letterSpacing: -0.1,
    minHeight: 60,
    padding: 0,
    marginTop: 4,
  },

  // Delete
  deleteBtn: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  deleteBtnText: {
    ...fontFamily.semibold,
    fontSize: fontSize[15],
    color: '#FF3B30',
    letterSpacing: -0.1,
  },
});
