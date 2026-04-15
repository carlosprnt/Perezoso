// CreateSubscriptionSheet — white form sheet rendered via a native <Modal>.
//
// Using React Native's built-in Modal is the most reliable way to render
// content above everything else on iOS: on iOS it spawns a separate
// UIViewController that sits on top of the root app window, so nothing
// in the React tree (Expo Router Slot, Tabs, FloatingNav, status bar,
// etc.) can cover it.
//
// The sheet itself is a rounded white card anchored to the bottom of the
// screen with safe-area padding, slid up via a simple opacity+translate
// animation (LayoutAnimation-free for maximum compatibility with SDK 54
// + Expo Go's new architecture).

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
import { ChevronDown, ChevronUp, X } from 'lucide-react-native';

import { useCreateSubscriptionStore } from './useCreateSubscriptionStore';
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
  logoUrl: string;
  notes: string;
}

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
    logoUrl: prefill?.logoUrl ?? '',
    notes: '',
  };
}

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

export function CreateSubscriptionSheet() {
  const isOpen = useCreateSubscriptionStore((s) => s.isOpen);
  const prefill = useCreateSubscriptionStore((s) => s.prefill);
  const close = useCreateSubscriptionStore((s) => s.close);
  const insets = useSafeAreaInsets();

  // v5-native-modal marker — lets us verify fresh JS is running.
  console.log('[CreateSubscriptionSheet v5-native-modal] render, isOpen=', isOpen);

  const [form, setForm] = useState<FormState>(() => initialForm(null));

  // Slide-up animation for the sheet contents. Modal itself fades in;
  // we overlay a translateY for the iOS-style rise.
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;

  useEffect(() => {
    if (isOpen) {
      setForm(initialForm(prefill));
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

  const cycleCurrency = useCallback(() => {
    setForm((f) => {
      const idx = CURRENCIES.indexOf(f.currency);
      return { ...f, currency: CURRENCIES[(idx + 1) % CURRENCIES.length] };
    });
  }, []);
  const cycleBilling = useCallback(() => {
    setForm((f) => {
      const idx = BILLING_PERIODS.indexOf(f.billingPeriod);
      return {
        ...f,
        billingPeriod: BILLING_PERIODS[(idx + 1) % BILLING_PERIODS.length],
      };
    });
  }, []);
  const cycleCategory = useCallback(() => {
    setForm((f) => {
      const idx = CATEGORIES.indexOf(f.category);
      return { ...f, category: CATEGORIES[(idx + 1) % CATEGORIES.length] };
    });
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
              paddingBottom: Math.max(insets.bottom, 16),
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
                  <SelectorValue
                    value={form.billingPeriod}
                    onCycle={cycleBilling}
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
                      <DatePill date={form.endDate} />
                    </View>
                  </>
                )}
              </View>

              <View style={styles.group}>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Categoría</Text>
                  <SelectorValue
                    value={form.category}
                    onCycle={cycleCategory}
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
    maxHeight: '92%',
    minHeight: '70%',
    overflow: 'hidden',
  },

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

  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
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

  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
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
