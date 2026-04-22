// GmailImportSheet — searches Gmail for subscription emails and lets the
// user pick which ones to import.
//
// Three phases, all rendered inside a single native pageSheet:
//   1. explain  — explains what the feature does (privacy-first copy)
//                 with animated magnifying glass over mail icon
//   2. loading  — OAuth + Gmail search in progress
//   3. results  — list of detected subscriptions with select/deselect

import React, { useCallback, useEffect } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Check,
  Mail,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react-native';

import { fontFamily, fontSize } from '../../design/typography';
import { useTheme } from '../../design/useTheme';
import { haptic } from '../../lib/haptics';
import { useGmailImportStore } from './useGmailImportStore';
import { promptGmailAuth, searchSubscriptionEmails } from '../../services/gmail';
import { detectSubscriptions } from './gmailDetection';
import { useSubscriptionsStore } from '../../stores/subscriptionsStore';
import { useToastStore } from '../../components/useToastStore';
import type { Category, BillingPeriod } from '../subscriptions/types';

const BILLING_LABELS: Record<BillingPeriod, string> = {
  monthly: 'Mes',
  yearly: 'Año',
  quarterly: 'Trimestre',
  weekly: 'Semana',
};

// ── Animated search-over-mail icon ──────────────────────────────────
function SearchMailIcon({ color, bgColor }: { color: string; bgColor: string }) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    translateX.value = withRepeat(
      withSequence(
        withTiming(10, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(-8, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(6, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    translateY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(8, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(-4, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    scale.value = withRepeat(
      withSequence(
        withDelay(400, withTiming(1.15, { duration: 300, easing: Easing.out(Easing.ease) })),
        withTiming(1, { duration: 300, easing: Easing.in(Easing.ease) }),
        withDelay(1600, withTiming(1, { duration: 0 })),
      ),
      -1,
      false,
    );
  }, [translateX, translateY, scale]);

  const searchStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={[styles.heroIcon, { backgroundColor: bgColor }]}>
      <Mail size={32} color={color} strokeWidth={1.5} style={{ opacity: 0.4 }} />
      <Animated.View style={[styles.heroSearch, searchStyle]}>
        <Search size={22} color={color} strokeWidth={2.5} />
      </Animated.View>
    </View>
  );
}

// ── Main sheet ──────────────────────────────────────────────────────
export function GmailImportSheet() {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const isOpen = useGmailImportStore((s) => s.isOpen);
  const phase = useGmailImportStore((s) => s.phase);
  const results = useGmailImportStore((s) => s.results);
  const selected = useGmailImportStore((s) => s.selected);
  const close = useGmailImportStore((s) => s.close);
  const setPhase = useGmailImportStore((s) => s.setPhase);
  const setResults = useGmailImportStore((s) => s.setResults);
  const toggleSelected = useGmailImportStore((s) => s.toggleSelected);

  const handleContinue = useCallback(async () => {
    haptic.light();
    setPhase('loading');

    try {
      const token = await promptGmailAuth();
      if (!token) {
        setPhase('explain');
        return;
      }

      const messages = await searchSubscriptionEmails(token);
      const detected = detectSubscriptions(messages);
      setResults(detected);
    } catch (err) {
      console.error('[GmailImport] error:', err);
      Alert.alert('Error', 'No se pudo buscar en Gmail. Inténtalo de nuevo.');
      setPhase('explain');
    }
  }, [setPhase, setResults]);

  const handleImport = useCallback(async () => {
    const toImport = results.filter((r) => selected.has(r.id));
    if (toImport.length === 0) return;

    haptic.success();
    const store = useSubscriptionsStore.getState();

    for (const sub of toImport) {
      await store.addSubscription({
        name: sub.name,
        logo_url: sub.logoUrl ?? null,
        category: (sub.suggested_category ?? 'other') as Category,
        price_amount: sub.price_amount ?? 0,
        currency: sub.currency ?? 'EUR',
        billing_period: sub.billing_period ?? 'monthly',
        billing_interval_count: 1,
        next_billing_date: '',
        status: 'active',
        is_shared: false,
        shared_with_count: 0,
        card_color: null,
      });
    }

    close();
    useToastStore
      .getState()
      .show(
        'success',
        `${toImport.length} ${toImport.length === 1 ? 'suscripción añadida' : 'suscripciones añadidas'}`,
      );
  }, [results, selected, close]);

  if (!isOpen) return null;

  const bg = isDark ? '#000000' : '#FFFFFF';
  const textPrimary = isDark ? '#FFFFFF' : '#000000';
  const textSecondary = isDark ? '#8E8E93' : '#6B6B6B';
  const surfaceBg = isDark ? '#1C1C1E' : '#F5F5F5';
  const borderColor = isDark ? '#2C2C2E' : '#E8E8E8';
  const checkBg = isDark ? '#FFFFFF' : '#000000';
  const checkColor = isDark ? '#000000' : '#FFFFFF';
  const uncheckedBg = isDark ? '#2C2C2E' : '#E8E8E8';

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={close}
      onDismiss={close}
    >
      <View style={[styles.root, { backgroundColor: bg }]}>
        {/* Handle + close */}
        <View style={styles.handleWrap}>
          <View style={[styles.handle, { backgroundColor: isDark ? '#3A3A3C' : '#D4D4D4' }]} />
        </View>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: textPrimary }]}>
            {phase === 'explain'
              ? 'Buscar en Gmail'
              : phase === 'loading'
                ? 'Buscando...'
                : phase === 'empty'
                  ? 'Sin resultados'
                  : 'Suscripciones encontradas'}
          </Text>
          <Pressable
            style={[styles.closeBtn, { backgroundColor: isDark ? '#2C2C2E' : '#EBEBF0' }]}
            onPress={close}
            hitSlop={10}
          >
            <X size={15} color={isDark ? '#AEAEB2' : '#3C3C43'} strokeWidth={2.5} />
          </Pressable>
        </View>

        {/* ── Phase: Explain ─────────────────────────────── */}
        {phase === 'explain' && (
          <View style={styles.explainContainer}>
            <View style={styles.explainContent}>
              <SearchMailIcon color={textPrimary} bgColor={surfaceBg} />

              <Text style={[styles.explainTitle, { color: textPrimary }]}>
                Encuentra tus suscripciones automáticamente
              </Text>
              <Text style={[styles.explainBody, { color: textSecondary }]}>
                Analizamos los correos de tu Gmail del último año para detectar recibos y confirmaciones de suscripciones.
              </Text>

              <View style={styles.bulletList}>
                <BulletPoint
                  icon={<Search size={16} color={textPrimary} strokeWidth={2} />}
                  text="Buscamos recibos, facturas y confirmaciones de pago"
                  color={textPrimary}
                  bgColor={surfaceBg}
                />
                <BulletPoint
                  icon={<ShieldCheck size={16} color={textPrimary} strokeWidth={2} />}
                  text="No almacenamos ni leemos tus correos. Solo identificamos remitentes conocidos"
                  color={textPrimary}
                  bgColor={surfaceBg}
                />
              </View>
            </View>

            <View style={[styles.explainFooter, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
              <Pressable
                disabled
                style={[
                  styles.ctaBtn,
                  { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' },
                ]}
              >
                <Text style={[styles.ctaText, { color: isDark ? '#636366' : '#8E8E93' }]}>
                  Conectar y buscar suscripciones
                </Text>
              </Pressable>
              <Text style={[styles.footerNote, { color: textSecondary }]}>
                Servicio no disponible actualmente
              </Text>
            </View>
          </View>
        )}

        {/* ── Phase: Loading ─────────────────────────────── */}
        {phase === 'loading' && (
          <View style={styles.loadingContainer}>
            <SearchMailIcon color={textPrimary} bgColor={surfaceBg} />
            <Text style={[styles.loadingText, { color: textPrimary }]}>
              Buscando suscripciones en tu Gmail...
            </Text>
            <Text style={[styles.loadingSubtext, { color: textSecondary }]}>
              Esto puede tardar unos segundos
            </Text>
          </View>
        )}

        {/* ── Phase: Empty ───────────────────────────────── */}
        {phase === 'empty' && (
          <View style={styles.loadingContainer}>
            <View style={[styles.heroIcon, { backgroundColor: surfaceBg }]}>
              <Search size={28} color={textSecondary} strokeWidth={1.8} />
            </View>
            <Text style={[styles.loadingText, { color: textPrimary }]}>
              No encontramos suscripciones
            </Text>
            <Text style={[styles.loadingSubtext, { color: textSecondary }]}>
              No hemos detectado recibos de suscripciones en tus correos del último año
            </Text>
            <Pressable
              onPress={close}
              style={({ pressed }) => [
                styles.ctaBtn,
                { backgroundColor: '#000000', marginTop: 24, width: '80%' },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.ctaText, { color: '#FFFFFF' }]}>Entendido</Text>
            </Pressable>
          </View>
        )}

        {/* ── Phase: Results ─────────────────────────────── */}
        {phase === 'results' && (
          <>
            <Text style={[styles.resultsSubtitle, { color: textSecondary }]}>
              Selecciona las que quieras añadir ({selected.size} de {results.length})
            </Text>

            <ScrollView
              style={styles.resultsList}
              contentContainerStyle={[
                styles.resultsContent,
                { paddingBottom: Math.max(insets.bottom, 16) + 80 },
              ]}
              showsVerticalScrollIndicator={false}
            >
              {results.map((sub) => {
                const isSelected = selected.has(sub.id);
                return (
                  <Pressable
                    key={sub.id}
                    style={[styles.resultRow, { borderBottomColor: borderColor }]}
                    onPress={() => {
                      haptic.selection();
                      toggleSelected(sub.id);
                    }}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        {
                          backgroundColor: isSelected ? checkBg : uncheckedBg,
                          borderColor: isSelected ? checkBg : borderColor,
                        },
                      ]}
                    >
                      {isSelected && <Check size={12} color={checkColor} strokeWidth={3} />}
                    </View>

                    <View style={[styles.logoBox, { backgroundColor: surfaceBg }]}>
                      {sub.logoUrl ? (
                        <Image source={{ uri: sub.logoUrl }} style={styles.logoImg} resizeMode="contain" />
                      ) : (
                        <Text style={[styles.logoInitial, { color: textPrimary }]}>
                          {sub.name.charAt(0).toUpperCase()}
                        </Text>
                      )}
                    </View>

                    <View style={styles.resultInfo}>
                      <Text style={[styles.resultName, { color: textPrimary }]} numberOfLines={1}>
                        {sub.name}
                      </Text>
                      <Text style={[styles.resultMeta, { color: textSecondary }]} numberOfLines={1}>
                        {sub.price_amount != null
                          ? `${sub.price_amount.toFixed(2).replace('.', ',')}${sub.currency === 'EUR' ? '€' : sub.currency === 'USD' ? '$' : sub.currency} · ${BILLING_LABELS[sub.billing_period]}`
                          : sub.source_hint}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.confidenceBadge,
                        {
                          backgroundColor:
                            sub.confidence === 'high' ? '#16A34A20' : sub.confidence === 'medium' ? '#F59E0B20' : '#EF444420',
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.confidenceDot,
                          {
                            backgroundColor:
                              sub.confidence === 'high' ? '#16A34A' : sub.confidence === 'medium' ? '#F59E0B' : '#EF4444',
                          },
                        ]}
                      />
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View
              style={[
                styles.importFooter,
                {
                  backgroundColor: bg,
                  borderTopColor: borderColor,
                  paddingBottom: Math.max(insets.bottom, 16) + 4,
                },
              ]}
            >
              <Pressable
                onPress={handleImport}
                disabled={selected.size === 0}
                style={({ pressed }) => [
                  styles.ctaBtn,
                  {
                    backgroundColor: selected.size > 0 ? '#000000' : uncheckedBg,
                  },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text
                  style={[
                    styles.ctaText,
                    { color: selected.size > 0 ? '#FFFFFF' : textSecondary },
                  ]}
                >
                  {selected.size > 0
                    ? `Añadir ${selected.size} ${selected.size === 1 ? 'suscripción' : 'suscripciones'}`
                    : 'Selecciona al menos una'}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

function BulletPoint({
  icon,
  text,
  color,
  bgColor,
}: {
  icon: React.ReactNode;
  text: string;
  color: string;
  bgColor: string;
}) {
  return (
    <View style={styles.bulletRow}>
      <View style={[styles.bulletIcon, { backgroundColor: bgColor }]}>{icon}</View>
      <Text style={[styles.bulletText, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  handleWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  handle: { width: 40, height: 5, borderRadius: 9999 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    ...fontFamily.bold,
    fontSize: fontSize[20],
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Hero icon — mail with animated search
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroSearch: {
    position: 'absolute',
  },

  // Explain phase
  explainContainer: {},
  explainContent: { paddingHorizontal: 20, paddingTop: 16, alignItems: 'center' },
  explainTitle: {
    ...fontFamily.bold,
    fontSize: fontSize[20],
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  explainBody: {
    ...fontFamily.regular,
    fontSize: fontSize[15],
    textAlign: 'center',
    lineHeight: fontSize[15] * 1.5,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  bulletList: { gap: 14, width: '100%' },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  bulletIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  bulletText: {
    ...fontFamily.regular,
    fontSize: fontSize[15],
    flex: 1,
    lineHeight: fontSize[15] * 1.4,
  },
  explainFooter: { paddingHorizontal: 20, paddingTop: 20 },
  footerNote: {
    ...fontFamily.regular,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },

  // Loading phase
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 },
  loadingText: { ...fontFamily.semibold, fontSize: fontSize[18], textAlign: 'center' },
  loadingSubtext: { ...fontFamily.regular, fontSize: fontSize[14], textAlign: 'center' },

  // Results phase
  resultsSubtitle: {
    ...fontFamily.regular,
    fontSize: fontSize[14],
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  resultsList: { flex: 1 },
  resultsContent: { paddingHorizontal: 20 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImg: { width: 26, height: 26 },
  logoInitial: { ...fontFamily.bold, fontSize: fontSize[16] },
  resultInfo: { flex: 1 },
  resultName: { ...fontFamily.semibold, fontSize: fontSize[15], letterSpacing: -0.1 },
  resultMeta: { ...fontFamily.regular, fontSize: fontSize[11], marginTop: 2 },
  confidenceBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  importFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },

  ctaBtn: {
    height: 52,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    ...fontFamily.semibold,
    fontSize: fontSize[16],
    letterSpacing: -0.1,
  },
});
