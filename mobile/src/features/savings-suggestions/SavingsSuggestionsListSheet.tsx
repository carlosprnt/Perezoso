// SavingsSuggestionsListSheet — first modal in the savings flow.
//
// Triggered from the dashboard's ReminderCards "Ver oportunidades" CTA.
// Presents a vertical list of curated saving opportunities. Each card
// has a service logo and a single paragraph — "Podrías ahorrar hasta
// {{X}} …" with the amount rendered in bold — followed by a full-width
// "Ver más" button that opens the SavingsSuggestionDetailSheet on top.
//
// Sheet behaviour mirrors TagsBottomSheet so the app speaks one
// consistent visual language for child sheets:
//   · Dim backdrop fades in with the slide
//   · iOS drag handle + title + close pill (X)
//   · Pan-down dismisses (>100px or velocity > 600)
//   · Tap the backdrop to dismiss
//   · Custom Modal (transparent) so it can stack above the dashboard
//     without inheriting iOS's automatic pageSheet rounding
//
// The sheet doesn't fetch — it reads from the static MOCK_SAVINGS_SUGGESTIONS
// catalog, which already pre-formats the user-visible strings so this
// view stays a thin renderer.

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
import { X } from 'lucide-react-native';

import { fontFamily, fontSize } from '../../design/typography';
import { SETTINGS_PALETTE as C } from '../settings/components';
import {
  MOCK_SAVINGS_SUGGESTIONS,
  type SavingsSuggestion,
} from './mockData';
import { SavingsSuggestionDetailSheet } from './SavingsSuggestionDetailSheet';
import { useSavingsSuggestionsStore } from './useSavingsSuggestionsStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const ENTER_MS = 280;
const EXIT_MS = 220;

export function SavingsSuggestionsListSheet() {
  const isOpen      = useSavingsSuggestionsStore((s) => s.isListOpen);
  const closeList   = useSavingsSuggestionsStore((s) => s.closeList);
  const openDetail  = useSavingsSuggestionsStore((s) => s.openDetail);

  const [mounted, setMounted] = useState(isOpen);

  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // ── Enter / exit animations ───────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
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
  }, [isOpen]);

  // ── Drag-down-to-dismiss ──────────────────────────────────────────
  // Only applies to the header strip (handle + title) so the
  // ScrollView keeps native scroll inside the sheet body.
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
        runOnJS(closeList)();
      } else {
        translateY.value = withTiming(0, { duration: 200 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={closeList}
    >
      {/* Backdrop — tap anywhere to dismiss */}
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          styles.backdrop,
          { opacity: backdropOpacity },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={closeList}
          accessibilityLabel="Cerrar sugerencias de ahorro"
        />
      </Animated.View>

      <View style={styles.sheetWrap} pointerEvents="box-none">
        <Reanimated.View style={[styles.sheet, sheetStyle]}>
          {/* Drag handle — only the top strip owns the pan gesture so
              taps inside the scrolling list still work normally. */}
          <GestureDetector gesture={panGesture}>
            <View>
              <View style={styles.handleWrap}>
                <View style={styles.handle} />
              </View>

              <View style={styles.header}>
                <Text style={styles.title}>Sugerencias de ahorro</Text>
                <Pressable
                  style={styles.closeBtn}
                  onPress={closeList}
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
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(insets.bottom, 16) + 12 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {MOCK_SAVINGS_SUGGESTIONS.map((s) => (
              <SuggestionCard
                key={s.id}
                suggestion={s}
                onViewMore={() => openDetail(s)}
              />
            ))}
          </ScrollView>
        </Reanimated.View>

        {/* Detail sheet nested inside the list Modal so iOS can layer
            a second transparent presentation on top. Mounting it at the
            root-level _layout caused iOS to silently drop the second
            Modal while the list Modal was already presented. */}
        <SavingsSuggestionDetailSheet />
      </View>
    </Modal>
  );
}

// ─── Suggestion card ────────────────────────────────────────────────

function SuggestionCard({
  suggestion,
  onViewMore,
}: {
  suggestion: SavingsSuggestion;
  onViewMore: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardBody}>
        <SuggestionLogo
          logoUrl={suggestion.logoUrl}
          name={suggestion.serviceName}
          brandColor={suggestion.brandColor}
        />
        <Text style={styles.copy}>
          {suggestion.listCopyBefore}
          <Text style={styles.copyAmount}>{suggestion.listAmount}</Text>
          {suggestion.listCopyAfter}
        </Text>
      </View>

      <Pressable
        onPress={onViewMore}
        style={({ pressed }) => [
          styles.viewMoreBtn,
          pressed && { opacity: 0.85 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Ver m\u00E1s sobre ${suggestion.serviceName}`}
      >
        <Text style={styles.viewMoreText}>Ver m{'\u00E1'}s</Text>
      </Pressable>
    </View>
  );
}

function SuggestionLogo({
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
      <View style={[styles.logoTile, { backgroundColor: '#FFFFFF' }]}>
        <Image
          source={{ uri: logoUrl }}
          style={styles.logoImg}
          resizeMode="contain"
        />
      </View>
    );
  }
  return (
    <View style={[styles.logoTile, { backgroundColor: brandColor }]}>
      <Text style={styles.logoInitial}>{name[0]?.toUpperCase() ?? '?'}</Text>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    height: SCREEN_HEIGHT * 0.86,
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
  title: {
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

  // Scroll list — flex:1 makes the ScrollView fill the sheet's
  // remaining space so cards scroll right to the bottom edge instead
  // of leaving a white strip above the safe-area inset.
  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: 2,
    gap: 12,
  },

  // Card
  card: {
    backgroundColor: C.cardBg,
    borderRadius: 20,
    padding: 16,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  logoTile: {
    width: 48,
    height: 48,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImg: {
    width: 32,
    height: 32,
  },
  logoInitial: {
    ...fontFamily.bold,
    fontSize: fontSize[20],
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  copy: {
    ...fontFamily.regular,
    flex: 1,
    fontSize: fontSize[14],
    color: '#1F1F22',
    letterSpacing: -0.1,
    lineHeight: fontSize[14] * 1.4,
  },
  copyAmount: {
    ...fontFamily.bold,
    color: '#000000',
  },
  viewMoreBtn: {
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  viewMoreText: {
    ...fontFamily.semibold,
    fontSize: fontSize[15],
    color: '#000000',
    letterSpacing: -0.1,
  },
});
