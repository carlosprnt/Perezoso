// Phase 6 — Subscriptions: SubscriptionsScreen
// Replicates the web app's subscription list (SubscriptionsView.tsx):
//   Title + bold paragraph: "Pagas XX al mes en N suscripciones activas."
//   Controls row: "Ordenar por:" (native iOS ActionSheet) on left,
//                 "Filtrar" (native iOS ActionSheet) on right
//   WalletCard list with NEGATIVE margin so cards overlap (stack).
//   Scroll-driven exit animation per card: scale 1 → 0.85 and
//                                          rotate 0° → 20° as cards
//                                          scroll off the top.
//
// iOS native dropdowns via ActionSheetIOS; Android falls back to
// a simple Modal list with the same options (still looks good).

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ActionSheetIOS,
  Modal,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown } from 'lucide-react-native';
import { useTheme } from '../../design/useTheme';
import { fontFamily, fontSize, lineHeight, letterSpacing } from '../../design/typography';
import { radius } from '../../design/radius';

import { WalletCard } from './WalletCard';
import { MOCK_SUBSCRIPTIONS } from './mockData';
import type { Subscription, SubscriptionStatus, SortMode } from './types';
import { STATUS_LABELS } from './types';

// Wallet-style overlap: each card's visible header (logo + name + price)
// peeks above the card below it. Slightly looser than web (-76) so the
// price + status row underneath remain readable between stacked cards.
const STACK_MARGIN_PX = -60;

// ─── Sort + filter config (labels taken from web) ─────────────────
const SORT_LABELS: Record<SortMode, string> = {
  alphabetical: 'Nombre (A\u2013Z)',
  recently_added: 'Más recientes',
  price_high: 'Más caras',
  price_low: 'Más baratas',
};
const SORT_OPTIONS: SortMode[] = [
  'alphabetical',
  'recently_added',
  'price_high',
  'price_low',
];

type FilterValue = SubscriptionStatus | 'all';
const FILTER_LABELS: Record<FilterValue, string> = {
  all: 'Todas',
  active: 'Activas',
  trial: 'En prueba',
  paused: 'Pausadas',
  cancelled: 'Canceladas',
};
const FILTER_OPTIONS: FilterValue[] = ['all', 'active', 'trial', 'paused', 'cancelled'];

// ─── Sort function ────────────────────────────────────────────────
function sortSubscriptions(subs: Subscription[], mode: SortMode): Subscription[] {
  const sorted = [...subs];
  switch (mode) {
    case 'alphabetical':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'price_high':
      return sorted.sort((a, b) => b.my_monthly_cost - a.my_monthly_cost);
    case 'price_low':
      return sorted.sort((a, b) => a.my_monthly_cost - b.my_monthly_cost);
    case 'recently_added':
      return sorted.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    default:
      return sorted;
  }
}

// ─── Scroll-driven animated card wrapper ──────────────────────────
// Per-card: as it scrolls off the top of the viewport, it shrinks
// (1 → 0.85) and tilts (0° → 20°). The animation is gated on the
// first onLayout pass so cards don't render mid-animation on mount.
//
// Progress axis:
//   progress = 0 → card top at top of viewport (fully visible)
//   progress = 1 → card bottom at top of viewport (fully gone)
// i.e. the animation only runs while the card is actively leaving
// the screen — never while it's still inside the viewport.
function ScrollCard({
  scrollY,
  children,
}: {
  scrollY: Animated.SharedValue<number>;
  children: React.ReactNode;
}) {
  const cardY = useSharedValue(0);
  const cardHeight = useSharedValue(0);
  // Gate: stays 0 until the first onLayout pass has measured the card.
  // Before that we return identity styles so nothing renders skewed.
  const measured = useSharedValue(0);

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      cardY.value = e.nativeEvent.layout.y;
      cardHeight.value = e.nativeEvent.layout.height;
      measured.value = 1;
    },
    [cardY, cardHeight, measured],
  );

  const animatedStyle = useAnimatedStyle(() => {
    if (measured.value === 0) {
      return {
        transform: [{ scale: 1 }, { rotate: '0deg' }],
      };
    }
    // startY = scrollY when the card top reaches the top of the viewport
    // endY   = scrollY when the card bottom reaches the top of the viewport
    // → progress is 0 while the card is still on-screen, ramps to 1 as
    //   it fully exits off the top.
    const startY = cardY.value;
    const endY = cardY.value + cardHeight.value;
    const progress = interpolate(
      scrollY.value,
      [startY, endY],
      [0, 1],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(progress, [0, 1], [1, 0.85], Extrapolation.CLAMP);
    const rotate = interpolate(progress, [0.5, 1], [0, 20], Extrapolation.CLAMP);
    return {
      transform: [
        { scale },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  return (
    <Animated.View
      onLayout={onLayout}
      style={[animatedStyle, { transformOrigin: 'center bottom' } as any]}
    >
      {children}
    </Animated.View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────
export function SubscriptionsScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);

  const [sortMode, setSortMode] = useState<SortMode>('alphabetical');
  const [filter, setFilter] = useState<FilterValue>('all');
  const [androidSheet, setAndroidSheet] = useState<null | 'sort' | 'filter'>(null);

  const filtered = useMemo(() => {
    let subs = MOCK_SUBSCRIPTIONS;
    if (filter !== 'all') {
      subs = subs.filter((s) => s.status === filter);
    }
    return sortSubscriptions(subs, sortMode);
  }, [sortMode, filter]);

  // Stats for the subtitle paragraph.
  // Active subs define the headline number; we always sum their
  // monthly-equivalent cost in EUR (my_monthly_cost is pre-converted).
  const activeSubs = useMemo(
    () => MOCK_SUBSCRIPTIONS.filter((s) => s.status === 'active'),
    [],
  );
  const activeCount = activeSubs.length;
  const totalMonthly = activeSubs.reduce((sum, s) => sum + s.my_monthly_cost, 0);
  const totalFormatted = totalMonthly
    .toFixed(2)
    .replace('.', ',');

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Native iOS sheet / Android modal handlers --------------------
  const openSortSheet = useCallback(() => {
    if (Platform.OS === 'ios') {
      const options = SORT_OPTIONS.map((m) => SORT_LABELS[m]);
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: 'Ordenar por',
          options: [...options, 'Cancelar'],
          cancelButtonIndex: options.length,
          userInterfaceStyle: isDark ? 'dark' : 'light',
        },
        (index) => {
          if (index < SORT_OPTIONS.length) setSortMode(SORT_OPTIONS[index]);
        },
      );
    } else {
      setAndroidSheet('sort');
    }
  }, [isDark]);

  const openFilterSheet = useCallback(() => {
    if (Platform.OS === 'ios') {
      const options = FILTER_OPTIONS.map((v) => FILTER_LABELS[v]);
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: 'Filtrar',
          options: [...options, 'Cancelar'],
          cancelButtonIndex: options.length,
          userInterfaceStyle: isDark ? 'dark' : 'light',
        },
        (index) => {
          if (index < FILTER_OPTIONS.length) setFilter(FILTER_OPTIONS[index]);
        },
      );
    } else {
      setAndroidSheet('filter');
    }
  }, [isDark]);

  const dropdownTextColor = colors.textPrimary;
  const dropdownMutedColor = colors.textMuted;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 140, // FloatingNav + stack tail
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Mis suscripciones
          </Text>

          {/* Paragraph matches the web:
             "Pagas XX,XX€ al mes en N suscripciones activas." */}
          <Text style={[styles.paragraph, { color: colors.textPrimary }]}>
            Pagas {totalFormatted}
            {'\u20AC'} al mes en {activeCount}{' '}
            {activeCount === 1 ? 'suscripción activa' : 'suscripciones activas'}.
          </Text>
        </View>

        {/* Sort (left) + Filter (right) */}
        <View style={styles.controlsRow}>
          <Pressable onPress={openSortSheet} style={styles.dropdownLeft}>
            <Text style={[styles.dropdownMuted, { color: dropdownMutedColor }]}>
              Ordenar por:{' '}
            </Text>
            <Text style={[styles.dropdownValue, { color: dropdownTextColor }]}>
              {SORT_LABELS[sortMode]}
            </Text>
            <ChevronDown size={14} strokeWidth={2} color={dropdownTextColor} />
          </Pressable>

          <Pressable onPress={openFilterSheet} style={styles.dropdownRight}>
            <Text style={[styles.dropdownValue, { color: dropdownTextColor }]}>
              {filter === 'all' ? 'Filtrar' : FILTER_LABELS[filter]}
            </Text>
            <ChevronDown size={14} strokeWidth={2} color={dropdownTextColor} />
          </Pressable>
        </View>

        {/* Subscription list — cards overlap via negative margin */}
        <View style={styles.list}>
          {filtered.map((sub, index) => (
            <View
              key={sub.id}
              style={{ marginTop: index === 0 ? 0 : STACK_MARGIN_PX }}
            >
              <ScrollCard scrollY={scrollY}>
                <WalletCard subscription={sub} />
              </ScrollCard>
            </View>
          ))}

          {filtered.length === 0 && (
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No hay suscripciones con este filtro
              </Text>
              <Pressable
                onPress={() => setFilter('all')}
                style={[
                  styles.clearBtn,
                  { backgroundColor: isDark ? '#2C2C2E' : '#F0F0F0' },
                ]}
              >
                <Text style={[styles.clearBtnText, { color: colors.textPrimary }]}>
                  Limpiar filtros
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </Animated.ScrollView>

      {/* Android fallback sheet */}
      {Platform.OS !== 'ios' && androidSheet && (
        <AndroidSheet
          title={androidSheet === 'sort' ? 'Ordenar por' : 'Filtrar'}
          options={
            androidSheet === 'sort'
              ? SORT_OPTIONS.map((m) => ({ label: SORT_LABELS[m], value: m }))
              : FILTER_OPTIONS.map((v) => ({ label: FILTER_LABELS[v], value: v }))
          }
          selected={androidSheet === 'sort' ? sortMode : filter}
          onSelect={(value) => {
            if (androidSheet === 'sort') setSortMode(value as SortMode);
            else setFilter(value as FilterValue);
            setAndroidSheet(null);
          }}
          onClose={() => setAndroidSheet(null)}
        />
      )}
    </View>
  );
}

// ─── Android fallback sheet (simple modal list) ───────────────────
function AndroidSheet<T extends string>({
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  title: string;
  options: { label: string; value: T }[];
  selected: T;
  onSelect: (value: T) => void;
  onClose: () => void;
}) {
  const { colors, isDark } = useTheme();
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sheetTitle, { color: colors.textMuted }]}>{title}</Text>
          {options.map((opt) => {
            const isSelected = selected === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => onSelect(opt.value)}
                style={[
                  styles.sheetItem,
                  isSelected && {
                    backgroundColor: isDark ? '#2C2C2E' : '#F0F0F0',
                  },
                ]}
              >
                <Text style={[styles.sheetItemText, { color: colors.textPrimary }]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    ...fontFamily.extrabold,
    fontSize: 30,
    lineHeight: 30 * lineHeight.tight,
    letterSpacing: letterSpacing.tight,
  },
  // Matches web: 18px bold, primary text color (NOT muted), tight leading.
  paragraph: {
    ...fontFamily.bold,
    fontSize: fontSize[18],
    lineHeight: fontSize[18] * lineHeight.snug,
    marginTop: 4,
  },
  controlsRow: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  dropdownRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dropdownMuted: {
    ...fontFamily.medium,
    fontSize: fontSize[15],
  },
  dropdownValue: {
    ...fontFamily.semibold,
    fontSize: fontSize[15],
    marginRight: 4,
  },
  list: {
    paddingHorizontal: 20,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 40,
    gap: 16,
  },
  emptyText: {
    ...fontFamily.medium,
    fontSize: fontSize[15],
  },
  clearBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.full,
  },
  clearBtnText: {
    ...fontFamily.semibold,
    fontSize: fontSize[15],
  },
  // Android fallback sheet
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    gap: 4,
  },
  sheetTitle: {
    ...fontFamily.medium,
    fontSize: fontSize[15],
    textAlign: 'center',
    paddingVertical: 8,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.wide,
  },
  sheetItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: radius.xl,
  },
  sheetItemText: {
    ...fontFamily.semibold,
    fontSize: fontSize[15],
  },
});
