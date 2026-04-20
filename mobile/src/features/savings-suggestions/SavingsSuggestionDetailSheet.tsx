// SavingsSuggestionDetailSheet — second modal in the savings flow.
//
// Layered on top of the SavingsSuggestionsListSheet (which stays
// mounted underneath). Renders the full detail of a single suggestion:
//   · Service logo + name + current plan
//   · Highlighted green savings card (monthly headline + yearly sub-line)
//   · "Comparativa" table — two rows (label left / price right, with
//     the suggested price tinted green)
//   · Short muted explanatory note
//   · Full-width primary "Entendido" button to dismiss
//
// Same Modal/Reanimated pattern as the list sheet, so dismiss
// behaviour and visuals stay consistent — the user perceives this as
// "the same family of sheet" stacked one above the other.

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Reanimated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sparkles, X } from 'lucide-react-native';

import { fontFamily, fontSize } from '../../design/typography';
import { SETTINGS_PALETTE as C } from '../settings/components';
import { useSavingsSuggestionsStore } from './useSavingsSuggestionsStore';
import type { SavingsSuggestion } from './deriveSuggestions';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const ENTER_MS = 280;
const EXIT_MS = 220;

const SUGGESTED_COLOR = '#0F5132';

export function SavingsSuggestionDetailSheet() {
  const isOpen      = useSavingsSuggestionsStore((s) => s.isDetailOpen);
  const closeDetail = useSavingsSuggestionsStore((s) => s.closeDetail);
  const suggestion  = useSavingsSuggestionsStore((s) => s.selectedSuggestion);

  const [mounted, setMounted] = useState(isOpen);
  // Snapshot the suggestion when opening so the close animation never
  // shows empty content if the store clears `selectedSuggestion`
  // before the exit transition finishes.
  const [snapshot, setSnapshot] = useState<SavingsSuggestion | null>(suggestion);

  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // ── Enter / exit animations ───────────────────────────────────────
  useEffect(() => {
    if (isOpen && suggestion) {
      setSnapshot(suggestion);
      setMounted(true);
      translateY.value = SCREEN_HEIGHT;
      translateY.value = withTiming(0, { duration: ENTER_MS });
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: ENTER_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else if (mounted) {
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: EXIT_MS }, (fin) => {
        if (fin) runOnJS(setMounted)(false);
      });
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: EXIT_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, suggestion]);

  // ── Drag-down-to-dismiss ──────────────────────────────────────────
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      'worklet';
      if (e.translationY > 0) {
        translateY.value = e.translationY;
      } else {
        translateY.value = e.translationY * 0.15;
      }
    })
    .onEnd((e) => {
      'worklet';
      const shouldDismiss = e.translationY > 100 || e.velocityY > 600;
      if (shouldDismiss) {
        translateY.value = withTiming(SCREEN_HEIGHT, { duration: EXIT_MS });
        runOnJS(closeDetail)();
      } else {
        translateY.value = withTiming(0, { duration: 200 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!mounted || !snapshot) return null;

  return (
    <Modal
      visible={mounted}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={closeDetail}
    >
      {/* Backdrop */}
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          styles.backdrop,
          { opacity: backdropOpacity },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={closeDetail}
          accessibilityLabel="Cerrar detalle de sugerencia"
        />
      </Animated.View>

      <View style={styles.sheetWrap} pointerEvents="box-none">
        <Reanimated.View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16) + 12 },
            sheetStyle,
          ]}
        >
          <GestureDetector gesture={panGesture}>
            <View>
              <View style={styles.handleWrap}>
                <View style={styles.handle} />
              </View>

              <View style={styles.header}>
                <Text style={styles.headerTitle}>Sugerencia de ahorro</Text>
                <Pressable
                  style={styles.closeBtn}
                  onPress={closeDetail}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar"
                >
                  <X size={15} color="#3C3C43" strokeWidth={2.5} />
                </Pressable>
              </View>
            </View>
          </GestureDetector>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Service identity */}
            <View style={styles.identityRow}>
              <DetailLogo
                logoUrl={snapshot.logoUrl}
                name={snapshot.serviceName}
                brandColor={snapshot.brandColor}
              />
              <View style={styles.identityText}>
                <Text style={styles.serviceName} numberOfLines={1}>
                  {snapshot.serviceName}
                </Text>
                <Text style={styles.currentPlanLabel} numberOfLines={2}>
                  {snapshot.currentPlanLabel}
                </Text>
              </View>
            </View>

            {/* Highlighted savings summary */}
            <View style={styles.savingsCard}>
              <View style={styles.savingsIcon}>
                <Sparkles size={18} color={SUGGESTED_COLOR} strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.savingsAmount}>
                  {snapshot.monthlySavings}
                </Text>
                <Text style={styles.savingsYear}>
                  {snapshot.yearlySavings}
                </Text>
              </View>
            </View>

            {/* Comparativa */}
            <Text style={styles.compareHeading}>COMPARATIVA</Text>
            <View style={styles.compareTable}>
              <View style={[styles.compareRow, styles.compareRowDivider]}>
                <Text style={styles.compareLabel} numberOfLines={2}>
                  {snapshot.compareCurrentLabel}
                </Text>
                <Text style={styles.compareValue} numberOfLines={1}>
                  {snapshot.compareCurrentPrice}
                </Text>
              </View>
              <View style={styles.compareRow}>
                <Text style={styles.compareLabel} numberOfLines={2}>
                  {snapshot.compareSuggestedLabel}
                </Text>
                <Text style={[styles.compareValue, styles.compareValueHighlight]} numberOfLines={1}>
                  {snapshot.compareSuggestedPrice}
                </Text>
              </View>
            </View>

            {/* Explanatory note */}
            <Text style={styles.note}>{snapshot.note}</Text>
          </ScrollView>

          {/* Primary CTA */}
          <View style={styles.footer}>
            <Pressable
              onPress={closeDetail}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && { opacity: 0.85 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Entendido"
            >
              <Text style={styles.primaryBtnText}>Entendido</Text>
            </Pressable>
          </View>
        </Reanimated.View>
      </View>
    </Modal>
  );
}

// ─── Logo (large variant) ───────────────────────────────────────────

function DetailLogo({
  logoUrl,
  name,
  brandColor,
}: {
  logoUrl: string | null;
  name: string;
  brandColor: string;
}) {
  if (logoUrl) {
    return (
      <View style={[styles.detailLogoTile, { backgroundColor: '#FFFFFF' }]}>
        <Image
          source={{ uri: logoUrl }}
          style={styles.detailLogoImg}
          resizeMode="contain"
        />
      </View>
    );
  }
  return (
    <View style={[styles.detailLogoTile, { backgroundColor: brandColor }]}>
      <Text style={styles.detailLogoInitial}>
        {name[0]?.toUpperCase() ?? '?'}
      </Text>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: SCREEN_HEIGHT * 0.88,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 6,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 24,
  },

  // Header
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    paddingBottom: 14,
  },
  headerTitle: {
    ...fontFamily.bold,
    fontSize: fontSize[20],
    color: '#000000',
    letterSpacing: -0.4,
    flex: 1,
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

  // Scroll body
  scroll: { flexGrow: 0 },
  scrollContent: {
    paddingTop: 2,
    paddingBottom: 16,
  },

  // Service identity
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  detailLogoTile: {
    width: 56,
    height: 56,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLogoImg: {
    width: 38,
    height: 38,
  },
  detailLogoInitial: {
    ...fontFamily.bold,
    fontSize: fontSize[24],
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  identityText: {
    flex: 1,
    paddingLeft: 14,
  },
  serviceName: {
    ...fontFamily.bold,
    fontSize: fontSize[20],
    color: '#000000',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  currentPlanLabel: {
    ...fontFamily.regular,
    fontSize: fontSize[14],
    color: C.textMuted,
    letterSpacing: -0.05,
  },

  // Savings summary card
  savingsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#E5F4E8',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  savingsIcon: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    backgroundColor: '#C9EAD0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savingsAmount: {
    ...fontFamily.bold,
    fontSize: fontSize[18],
    color: SUGGESTED_COLOR,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  savingsYear: {
    ...fontFamily.regular,
    fontSize: fontSize[13],
    color: SUGGESTED_COLOR,
    letterSpacing: -0.05,
    opacity: 0.9,
  },

  // Comparativa
  compareHeading: {
    ...fontFamily.semibold,
    fontSize: fontSize[11],
    color: C.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  compareTable: {
    backgroundColor: C.cardBg,
    borderRadius: 16,
    paddingHorizontal: 4,
    marginBottom: 20,
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  compareRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.cardDivider,
  },
  compareLabel: {
    ...fontFamily.regular,
    flex: 1,
    fontSize: fontSize[14],
    color: '#0F0F10',
    letterSpacing: -0.05,
  },
  compareValue: {
    ...fontFamily.semibold,
    fontSize: fontSize[15],
    color: '#0F0F10',
    letterSpacing: -0.1,
  },
  compareValueHighlight: {
    color: SUGGESTED_COLOR,
  },

  // Explanatory note
  note: {
    ...fontFamily.regular,
    fontSize: fontSize[13],
    color: C.textMuted,
    letterSpacing: -0.05,
    lineHeight: fontSize[13] * 1.5,
    paddingHorizontal: 4,
    marginBottom: 4,
  },

  // Primary CTA
  footer: {
    paddingTop: 12,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    ...fontFamily.bold,
    fontSize: fontSize[16],
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
});
