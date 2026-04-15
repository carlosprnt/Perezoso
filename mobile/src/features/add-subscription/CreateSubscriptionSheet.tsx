// CreateSubscriptionSheet — white form sheet rendered via a native <Modal>.
//
// Using React Native's built-in Modal is the most reliable way to render
// content above everything else on iOS: on iOS it spawns a separate
// UIViewController that sits on top of the root app window, so nothing
// in the React tree (Expo Router Slot, Tabs, FloatingNav, status bar,
// etc.) can cover it.
//
// All selectors (currency, billing period, category, share count) open
// their own inline OptionPickerSheet. Dates open the custom DatePickerSheet.
// These stack above the parent Modal — on iOS each Modal is its own
// presentation layer so stacking Just Works.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, Minus, Plus, X } from 'lucide-react-native';

import { useCreateSubscriptionStore } from './useCreateSubscriptionStore';
import { OptionPickerSheet } from './pickers/OptionPickerSheet';
import { DatePickerSheet } from './pickers/DatePickerSheet';
import { fontFamily, fontSize } from '../../design/typography';

const SHEET_RADIUS_TOP = 32;
const { height: SCREEN_H } = Dimensions.get('window');

type BillingPeriod = 'Monthly' | 'Yearly' | 'Weekly';
type Category =
  | 'Streaming'
  | 'Música'
  | 'Productividad'
  | 'Cloud'
  | 'IA'
  | 'Gaming'
  | 'Otros';

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
  sharedCount: number;
  logoUrl: string;
  notes: string;
}

type PickerKey =
  | 'currency'
  | 'billing'
  | 'category'
  | 'sharedCount'
  | null;
type DateKey = 'start' | 'next' | 'end' | null;

const CURRENCIES = ['€', '$', '£', 'US$'];
const BILLING_PERIODS: BillingPeriod[] = ['Monthly', 'Yearly', 'Weekly'];
const CATEGORIES: Category[] = [
  'Streaming',
  'Música',
  'Productividad',
  'Cloud',
  'IA',
  'Gaming',
  'Otros',
];
// Up to 10 people — covers every reasonable family/friends split.
const SHARED_COUNTS: string[] = Array.from({ length: 9 }, (_, i) => String(i + 2));
const MONTHS_ES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

function formatDate(d: Date): string {
  return `${d.getDate()} ${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`;
}

function nextMonth(d: Date): Date {
  const n = new Date(d);
  n.setMonth(n.getMonth() + 1);
  return n;
}

function initialForm(
  prefill: { name?: string; logoUrl?: string; category?: string } | null,
): FormState {
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
    shared: false,
    sharedCount: 2,
    logoUrl: prefill?.logoUrl ?? '',
    notes: '',
  };
}

function FormDivider() {
  return <View style={styles.divider} />;
}

function DatePillBtn({
  date,
  onPress,
}: {
  date: Date;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.datePill} onPress={onPress} hitSlop={8}>
      <Text style={styles.datePillText}>{formatDate(date)}</Text>
    </Pressable>
  );
}

function DropdownValue({
  value,
  onPress,
}: {
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.dropdownRow} onPress={onPress} hitSlop={8}>
      <Text style={styles.dropdownText}>{value}</Text>
      <ChevronDown size={14} color="#8E8E93" strokeWidth={2.5} />
    </Pressable>
  );
}

export function CreateSubscriptionSheet() {
  const isOpen = useCreateSubscriptionStore((s) => s.isOpen);
  const prefill = useCreateSubscriptionStore((s) => s.prefill);
  const close = useCreateSubscriptionStore((s) => s.close);
  const insets = useSafeAreaInsets();

  // v6-dropdowns marker — lets us verify fresh JS is running.
  console.log('[CreateSubscriptionSheet v6-dropdowns] render, isOpen=', isOpen);

  const [form, setForm] = useState<FormState>(() => initialForm(null));
  const [openPicker, setOpenPicker] = useState<PickerKey>(null);
  const [openDate, setOpenDate] = useState<DateKey>(null);

  // Slide-up animation for the sheet contents.
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;

  useEffect(() => {
    if (isOpen) {
      setForm(initialForm(prefill));
      setOpenPicker(null);
      setOpenDate(null);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 240,
        mass: 0.9,
      }).start();
    } else {
      translateY.setValue(SCREEN_H);
    }
  }, [isOpen, prefill, translateY]);

  const decShared = useCallback(() => {
    setForm((f) => ({ ...f, sharedCount: Math.max(2, f.sharedCount - 1) }));
  }, []);
  const incShared = useCallback(() => {
    setForm((f) => ({ ...f, sharedCount: Math.min(10, f.sharedCount + 1) }));
  }, []);

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={close}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={close} />

        <Animated.View
          style={[
            styles.sheet,
            {
              // Clamped to a tight value so buttons don't float far above
              // the home indicator. Devices without an indicator fall back
              // to 10px, matching iOS form-sheet spacing.
              paddingBottom: insets.bottom > 0 ? 14 : 10,
              transform: [{ translateY }],
            },
          ]}
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
          >
            <View style={styles.handleZone}>
              <View style={styles.handle} />
            </View>

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

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
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

              <View style={styles.group}>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Inicio de suscripción</Text>
                  <DatePillBtn
                    date={form.startDate}
                    onPress={() => setOpenDate('start')}
                  />
                </View>
                <FormDivider />
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Próxima fecha de pago</Text>
                  <DatePillBtn
                    date={form.nextPaymentDate}
                    onPress={() => setOpenDate('next')}
                  />
                </View>
                <FormDivider />
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Importe</Text>
                  <DropdownValue
                    value={form.billingPeriod}
                    onPress={() => setOpenPicker('billing')}
                  />
                </View>
                <FormDivider />
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Fin de la suscripción</Text>
                  <Switch
                    value={form.endEnabled}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, endEnabled: v }))
                    }
                    trackColor={{ false: '#E5E5EA', true: '#34C759' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
                {form.endEnabled && (
                  <>
                    <FormDivider />
                    <View style={styles.row}>
                      <Text style={[styles.rowLabel, styles.rowLabelIndented]}>
                        Fecha de fin
                      </Text>
                      <DatePillBtn
                        date={form.endDate}
                        onPress={() => setOpenDate('end')}
                      />
                    </View>
                  </>
                )}
              </View>

              <View style={styles.group}>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Categoría</Text>
                  <DropdownValue
                    value={form.category}
                    onPress={() => setOpenPicker('category')}
                  />
                </View>
              </View>

              <View style={styles.group}>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Suscripción compartida</Text>
                  <Switch
                    value={form.shared}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, shared: v }))
                    }
                    trackColor={{ false: '#E5E5EA', true: '#34C759' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
                {form.shared && (
                  <>
                    <FormDivider />
                    <View style={styles.row}>
                      <Text style={[styles.rowLabel, styles.rowLabelIndented]}>
                        Entre cuántas personas
                      </Text>
                      <View style={styles.stepper}>
                        <Pressable
                          onPress={decShared}
                          hitSlop={6}
                          style={({ pressed }) => [
                            styles.stepperBtn,
                            form.sharedCount <= 2 && styles.stepperBtnDisabled,
                            pressed && { opacity: 0.6 },
                          ]}
                          disabled={form.sharedCount <= 2}
                        >
                          <Minus size={14} color="#000000" strokeWidth={2.5} />
                        </Pressable>
                        <Text style={styles.stepperValue}>
                          {form.sharedCount}
                        </Text>
                        <Pressable
                          onPress={incShared}
                          hitSlop={6}
                          style={({ pressed }) => [
                            styles.stepperBtn,
                            form.sharedCount >= 10 && styles.stepperBtnDisabled,
                            pressed && { opacity: 0.6 },
                          ]}
                          disabled={form.sharedCount >= 10}
                        >
                          <Plus size={14} color="#000000" strokeWidth={2.5} />
                        </Pressable>
                      </View>
                    </View>
                  </>
                )}
              </View>

              <View style={styles.group}>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>URL del logo</Text>
                  <View style={styles.urlRow}>
                    <TextInput
                      style={styles.urlInput}
                      value={form.logoUrl}
                      onChangeText={(t) =>
                        setForm((f) => ({ ...f, logoUrl: t }))
                      }
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
                        onPress={() =>
                          setForm((f) => ({ ...f, logoUrl: '' }))
                        }
                        hitSlop={8}
                        style={styles.urlClear}
                      >
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
                    onChangeText={(t) =>
                      setForm((f) => ({ ...f, notes: t }))
                    }
                    placeholder="Añade una nota..."
                    placeholderTextColor="#C7C7CC"
                    multiline
                    textAlignVertical="top"
                    returnKeyType="default"
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.footer}>
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
                onPress={close}
              >
                <Text style={styles.createBtnText}>Crear suscripción</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>

      {/* ─── Nested pickers ─────────────────────────────────────────
          Each is its own native Modal so it stacks above the parent
          sheet cleanly. We render them unconditionally here (inside
          the parent Modal) because their own `visible` prop gates
          whether anything shows on screen. */}
      <OptionPickerSheet
        visible={openPicker === 'currency'}
        title="Moneda"
        options={CURRENCIES}
        selected={form.currency}
        onSelect={(v) => setForm((f) => ({ ...f, currency: v }))}
        onClose={() => setOpenPicker(null)}
      />
      <OptionPickerSheet
        visible={openPicker === 'billing'}
        title="Ciclo de pago"
        options={BILLING_PERIODS}
        selected={form.billingPeriod}
        onSelect={(v) =>
          setForm((f) => ({ ...f, billingPeriod: v as BillingPeriod }))
        }
        onClose={() => setOpenPicker(null)}
      />
      <OptionPickerSheet
        visible={openPicker === 'category'}
        title="Categoría"
        options={CATEGORIES}
        selected={form.category}
        onSelect={(v) =>
          setForm((f) => ({ ...f, category: v as Category }))
        }
        onClose={() => setOpenPicker(null)}
      />
      <OptionPickerSheet
        visible={openPicker === 'sharedCount'}
        title="Número de personas"
        options={SHARED_COUNTS}
        selected={String(form.sharedCount)}
        onSelect={(v) =>
          setForm((f) => ({ ...f, sharedCount: Number(v) }))
        }
        onClose={() => setOpenPicker(null)}
      />
      <DatePickerSheet
        visible={openDate === 'start'}
        value={form.startDate}
        title="Inicio de suscripción"
        onChange={(d) => setForm((f) => ({ ...f, startDate: d }))}
        onClose={() => setOpenDate(null)}
      />
      <DatePickerSheet
        visible={openDate === 'next'}
        value={form.nextPaymentDate}
        title="Próxima fecha de pago"
        onChange={(d) => setForm((f) => ({ ...f, nextPaymentDate: d }))}
        onClose={() => setOpenDate(null)}
      />
      <DatePickerSheet
        visible={openDate === 'end'}
        value={form.endDate}
        title="Fecha de fin"
        onChange={(d) => setForm((f) => ({ ...f, endDate: d }))}
        onClose={() => setOpenDate(null)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: SHEET_RADIUS_TOP,
    borderTopRightRadius: SHEET_RADIUS_TOP,
    // Near-fullscreen: keeps a small gap at the top so the backdrop is
    // still visible and the sheet feels like a sheet (not a full screen).
    height: '94%',
    overflow: 'hidden',
  },

  handleZone: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
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

  scroll: {
    flex: 1,
  },
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
  rowLabelIndented: {
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
  stepperBtnDisabled: {
    opacity: 0.35,
  },
  stepperValue: {
    ...fontFamily.semibold,
    fontSize: fontSize[16],
    color: '#000000',
    minWidth: 22,
    textAlign: 'center',
    letterSpacing: -0.2,
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
