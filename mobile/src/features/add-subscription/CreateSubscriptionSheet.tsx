// CreateSubscriptionSheet — white iOS-style form sheet.
//
// Behaviour:
//  · Opens via a native <Modal> (guaranteed above all in-tree UI)
//  · Slide-in animation: timing, no bounce
//  · Drag handle → drag-to-dismiss (with dirty-form confirmation)
//  · Dropdowns via FloatingOptionMenu (centered dark card, iOS-style)
//  · Date fields via NativeDatePickerSheet (iOS inline calendar, floating)
//  · Dirty-form protection: Alert on Cancel / backdrop / swipe-close
//  · Validation: name + price required; inline error banner above scroll
//  · Submit: spinner → celebration card (fired 320ms after Modal closes)

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
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

import { useCreateSubscriptionStore } from './useCreateSubscriptionStore';
import { NativeDatePickerSheet } from './pickers/NativeDatePickerSheet';
import { FloatingOptionMenu } from '../../components/FloatingOptionMenu';
import { useSubscriptionCelebrationStore } from './useSubscriptionCelebrationStore';
import { fontFamily, fontSize } from '../../design/typography';

const { height: SCREEN_H } = Dimensions.get('window');

// ─── Types ───────────────────────────────────────────────────────────
type BillingPeriod = 'Monthly' | 'Yearly' | 'Quarterly' | 'Weekly' | 'Custom';
type Category =
  | 'Streaming'
  | 'Música'
  | 'Productividad'
  | 'Cloud'
  | 'IA'
  | 'Gaming'
  | 'Otros';
type Status = 'Activa' | 'Pausada' | 'Cancelada';
type DateKey = 'start' | 'next' | 'end' | null;
type PickerKey = 'currency' | 'billing' | 'category' | 'status' | null;

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
  status: Status;
  reminderEnabled: boolean;
  shared: boolean;
  sharedCount: number;
  paymentMethod: string;
  logoUrl: string;
  notes: string;
}

// ─── Constants ───────────────────────────────────────────────────────
const CURRENCIES = ['€', '$', '£', 'US$'] as const;
const BILLING_PERIODS: BillingPeriod[] = ['Monthly', 'Yearly', 'Quarterly', 'Weekly', 'Custom'];
const CATEGORIES: Category[] = [
  'Streaming', 'Música', 'Productividad', 'Cloud', 'IA', 'Gaming', 'Otros',
];
const STATUSES: Status[] = ['Activa', 'Pausada', 'Cancelada'];
const MONTHS_ES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

function formatDate(d: Date): string {
  return `${d.getDate()} ${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`;
}
function nextMonth(d: Date): Date {
  const n = new Date(d);
  n.setMonth(n.getMonth() + 1);
  return n;
}
function initialForm(prefill: { name?: string; logoUrl?: string; category?: string } | null): FormState {
  const today = new Date();
  return {
    name: prefill?.name ?? '',
    currency: '€',
    price: '',
    startDate: today,
    nextPaymentDate: nextMonth(today),
    billingPeriod: 'Monthly',
    endEnabled: false,
    endDate: new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()),
    category: (prefill?.category as Category) ?? 'Streaming',
    status: 'Activa',
    reminderEnabled: false,
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

// ─── Main component ──────────────────────────────────────────────────
export function CreateSubscriptionSheet() {
  const isOpen = useCreateSubscriptionStore((s) => s.isOpen);
  const prefill = useCreateSubscriptionStore((s) => s.prefill);
  const closeStore = useCreateSubscriptionStore((s) => s.close);
  const insets = useSafeAreaInsets();

  const [form, setForm] = useState<FormState>(() => initialForm(null));
  const initialFormRef = useRef<FormState>(initialForm(null));

  const [openDate, setOpenDate] = useState<DateKey>(null);
  const [openPicker, setOpenPicker] = useState<PickerKey>(null);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const translateY = useRef(new Animated.Value(SCREEN_H)).current;
  const isDirty = useCallback(
    () => !formIsEqual(form, initialFormRef.current),
    [form],
  );

  // ── Open / close animations ────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      const fresh = initialForm(prefill);
      initialFormRef.current = fresh;
      setForm(fresh);
      setError(null);
      setIsSubmitting(false);
      setOpenDate(null);
      setOpenPicker(null);
      // Slide up — timing, no bounce
      Animated.timing(translateY, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      translateY.setValue(SCREEN_H);
    }
  }, [isOpen, prefill, translateY]);

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

  // ── Drag-to-dismiss (pan on handle area) ─────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 100 || g.vy > 1.2) {
          Animated.timing(translateY, {
            toValue: SCREEN_H,
            duration: 200,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }).start(() => {
            translateY.setValue(SCREEN_H);
            requestCloseRef.current();
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 18,
            stiffness: 200,
          }).start();
        }
      },
    }),
  ).current;

  // Keep a ref so panResponder callback can always call latest requestClose
  const requestCloseRef = useRef(requestClose);
  useEffect(() => { requestCloseRef.current = requestClose; }, [requestClose]);

  // ── Steppers ─────────────────────────────────────────────────────
  const decShared = useCallback(() => setForm((f) => ({ ...f, sharedCount: Math.max(2, f.sharedCount - 1) })), []);
  const incShared = useCallback(() => setForm((f) => ({ ...f, sharedCount: Math.min(10, f.sharedCount + 1) })), []);

  // ── Submit ────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!form.name.trim()) {
      setError('El nombre de la suscripción es obligatorio.');
      return;
    }
    const priceNum = parseFloat(form.price.replace(',', '.'));
    if (!form.price.trim() || isNaN(priceNum) || priceNum <= 0) {
      setError('Introduce un precio válido.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      // TODO: replace with real API call
      await new Promise<void>((r) => setTimeout(r, 900));
      setIsSubmitting(false);
      closeStore();
      // Wait for Modal fade-out (~300ms) before showing celebration at root
      setTimeout(() => {
        useSubscriptionCelebrationStore.getState().show({
          name: form.name,
          price: form.price,
          currency: form.currency,
          billingPeriod: form.billingPeriod,
          logoUrl: form.logoUrl || undefined,
        });
      }, 320);
    } catch {
      setIsSubmitting(false);
      setError('No se pudo crear la suscripción. Inténtalo de nuevo.');
    }
  }, [form, closeStore]);

  // ─────────────────────────────────────────────────────────────────
  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={requestClose}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={requestClose} />

        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: insets.bottom > 0 ? 14 : 10,
              transform: [{ translateY }],
            },
          ]}
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            {/* ── Handle — drag target ── */}
            <View style={styles.handleZone} {...panResponder.panHandlers}>
              <View style={styles.handle} />
            </View>

            {/* ── Header ── */}
            <View style={styles.header}>
              <Text style={styles.title}>Crear nueva suscripción</Text>
              <Pressable style={styles.closeBtn} onPress={requestClose} hitSlop={10}>
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
                    onPress={() => setOpenPicker('currency')}
                    hitSlop={8}
                  >
                    <Text style={styles.currencyText}>{form.currency}</Text>
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
                  <DropdownBtn value={form.billingPeriod} onPress={() => setOpenPicker('billing')} />
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
                  <DropdownBtn value={form.category} onPress={() => setOpenPicker('category')} />
                </View>
              </View>

              {/* Status + Reminder */}
              <View style={styles.group}>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Estado</Text>
                  <DropdownBtn value={form.status} onPress={() => setOpenPicker('status')} />
                </View>
                <FormDivider />
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Activar recordatorio de pago</Text>
                  <Switch
                    value={form.reminderEnabled}
                    onValueChange={(v) => setForm((f) => ({ ...f, reminderEnabled: v }))}
                    trackColor={{ false: '#E5E5EA', true: '#34C759' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
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

              {/* Logo URL + Notes */}
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
                      <Pressable onPress={() => setForm((f) => ({ ...f, logoUrl: '' }))} hitSlop={8} style={styles.urlClear}>
                        <X size={12} color="#8E8E93" strokeWidth={2.5} />
                      </Pressable>
                    )}
                  </View>
                </View>
                <FormDivider />
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
                style={({ pressed }) => [styles.createBtn, pressed && !isSubmitting && { opacity: 0.85 }]}
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

      {/* ── Floating option menus ── */}
      <FloatingOptionMenu
        visible={openPicker === 'currency'}
        options={[...CURRENCIES]}
        selected={form.currency}
        onSelect={(v) => setForm((f) => ({ ...f, currency: v }))}
        onClose={() => setOpenPicker(null)}
      />
      <FloatingOptionMenu
        visible={openPicker === 'billing'}
        options={BILLING_PERIODS}
        selected={form.billingPeriod}
        onSelect={(v) => setForm((f) => ({ ...f, billingPeriod: v as BillingPeriod }))}
        onClose={() => setOpenPicker(null)}
      />
      <FloatingOptionMenu
        visible={openPicker === 'category'}
        options={CATEGORIES}
        selected={form.category}
        onSelect={(v) => setForm((f) => ({ ...f, category: v as Category }))}
        onClose={() => setOpenPicker(null)}
      />
      <FloatingOptionMenu
        visible={openPicker === 'status'}
        options={STATUSES}
        selected={form.status}
        onSelect={(v) => setForm((f) => ({ ...f, status: v as Status }))}
        onClose={() => setOpenPicker(null)}
      />
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: '86%',
    overflow: 'hidden',
  },

  handleZone: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
    paddingHorizontal: 100,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D1D6',
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
    fontSize: fontSize[14],
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

  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dropdownText: {
    ...fontFamily.regular,
    fontSize: fontSize[16],
    color: '#8E8E93',
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
    color: '#8E8E93',
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
    paddingBottom: 2,
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
