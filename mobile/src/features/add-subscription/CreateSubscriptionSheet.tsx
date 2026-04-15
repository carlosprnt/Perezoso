// CreateSubscriptionSheet — white iOS form bottom sheet.
//
// Step 2 of the add-subscription flow. The dark service picker
// (AddSubscriptionOverlay) closes itself and calls
// `useCreateSubscriptionStore.open()`; this component renders as a
// native React Native Modal, guaranteeing it sits on top of every
// other view in the app (including the dark picker during its close
// animation, the FloatingNav, the tabs, etc.) without any zIndex or
// absolute-positioning gymnastics.
//
// Structure
// ─────────
//   - Handle bar (top, centered) — also the swipe-to-dismiss zone
//   - Header: "Crear nueva suscripción" + circular X button
//   - Platform card: name TextInput + currency pill + price TextInput
//   - Grouped list: Inicio, Próxima pago, Importe, Fin de suscripción
//   - Single row:   Categoría
//   - Single row:   Suscripción compartida
//   - Grouped:      URL del logo (clearable) + Notas (multiline)
//   - Sticky footer: Cancelar + Crear suscripción

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ChevronUp, ChevronDown } from 'lucide-react-native';

import { useCreateSubscriptionStore } from './useCreateSubscriptionStore';
import { fontFamily, fontSize } from '../../design/typography';

const SHEET_RADIUS_TOP = 32;

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
    shared: false,
    logoUrl: prefill?.logoUrl ?? '',
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

function SelectorValue({ value, onCycle }: { value: string; onCycle: () => void }) {
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
export function CreateSubscriptionSheet() {
  const insets = useSafeAreaInsets();
  const isOpen = useCreateSubscriptionStore((s) => s.isOpen);
  const prefill = useCreateSubscriptionStore((s) => s.prefill);
  const close = useCreateSubscriptionStore((s) => s.close);

  const [form, setForm] = useState<FormState>(() => initialForm(null));

  // Re-seed the form each time the sheet opens with a (possibly new) prefill.
  useEffect(() => {
    if (isOpen) setForm(initialForm(prefill));
  }, [isOpen, prefill]);

  // ─── Form helpers ────────────────────────────────────────────────
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

  const footerPb = Math.max(insets.bottom, 20);

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent
      onRequestClose={close}
      presentationStyle="overFullScreen"
      statusBarTranslucent
    >
      {/* Backdrop fills the whole screen behind the sheet. Tap-to-dismiss. */}
      <Pressable style={styles.backdrop} onPress={close} />

      {/* Sheet container — anchored to bottom, rounded top corners. */}
      <View style={styles.sheet} pointerEvents="box-none">
        <View style={styles.sheetInner}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
          >
            {/* ── Handle ────────────────────────────────────── */}
            <View style={styles.handleZone}>
              <View style={styles.handle} />
            </View>

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
              contentContainerStyle={[styles.scrollContent, { paddingBottom: footerPb + 80 }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              {/* ── Platform card ────────────────────────────── */}
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
                  <Pressable style={styles.currencyPill} onPress={cycleCurrency} hitSlop={8}>
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

              {/* ── Grouped list: dates + billing ───────────── */}
              <View style={styles.group}>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Inicio de suscripción</Text>
                  <DatePill date={form.startDate} />
                </View>
                <FormDivider />
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Próxima fecha de pago</Text>
                  <DatePill date={form.nextPaymentDate} />
                </View>
                <FormDivider />
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Importe</Text>
                  <SelectorValue value={form.billingPeriod} onCycle={cycleBilling} />
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

              {/* ── Suscripción compartida ───────────────────── */}
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
                style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
                onPress={close}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.createBtn, pressed && { opacity: 0.85 }]}
                onPress={() => {
                  // TODO: validate + persist form.
                  close();
                }}
              >
                <Text style={styles.createBtnText}>Crear suscripción</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  // Sheet wrapper — anchored to bottom of the screen, height up to 92%.
  // Using flex layout instead of absolute positioning so the native slide
  // animation ("slide") drives it in correctly without manual transforms.
  sheet: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetInner: {
    maxHeight: '92%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: SHEET_RADIUS_TOP,
    borderTopRightRadius: SHEET_RADIUS_TOP,
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
    flexGrow: 0,
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
  },
  priceInput: {
    ...fontFamily.regular,
    fontSize: fontSize[18],
    color: '#000000',
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
