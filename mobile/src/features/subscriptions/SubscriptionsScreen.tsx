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

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
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
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown } from 'lucide-react-native';
import { useTheme } from '../../design/useTheme';
import { fontFamily, fontSize, lineHeight, letterSpacing } from '../../design/typography';
import { radius } from '../../design/radius';

import { WalletCard } from './WalletCard';
import { Skeleton } from '../../components/Skeleton';
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
// Per-card exit animation: each card shrinks (1 → 0.85), tilts
// (0° → 20°), fades (1 → 0) and blurs (0 → 20px) only as ITS OWN top
// crosses the page-title line. Because each card has its own measured
// `cardY`, animations fire one-by-one as cards reach the top — the
// list as a whole never tilts.
//
// Coordinate math:
//   cardY         — card's y within the list container (includes the
//                   cumulative -60px stack margins from siblings above)
//   listY         — list container's y within the ScrollView content
//                   (≈ paddingTop + header + controls height)
//   cardScreenY   — where the card's top currently sits on-screen
//                 = listY + cardY − scrollY
//
// Trigger window (screen-space, 100px wide):
//   progress = 0  when cardScreenY = triggerY         (top meets title)
//   progress = 1  when cardScreenY = triggerY − 100   (card fully gone)
//
// Within that window:
//   scale   / rotate  animate over progress [0 → 1]   (immediate tilt)
//   opacity / blur    animate over progress [0.3 → 1] (cascade behind)
//
// The `measured` + `listY > 0` gate guards against a one-frame tilt
// flash on mount: if we applied the transform before both onLayouts
// fired, the card would render pre-animated. Until both are populated
// we return the identity transform.
const TRIGGER_RANGE_PX = 100;
const MAX_BLUR_PX = 40;

// Period-toggle skeleton duration (ms). Long enough that the shimmer
// reads as an intentional transition rather than a tap glitch.
const PERIOD_TOGGLE_MS = 1500;

function ScrollCard({
  scrollY,
  listY,
  triggerY,
  stackMargin,
  children,
}: {
  scrollY: SharedValue<number>;
  listY: SharedValue<number>;
  triggerY: number;
  stackMargin: number;
  children: React.ReactNode;
}) {
  const cardY = useSharedValue(0);
  const cardHeight = useSharedValue(0);
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
    // Children's onLayout fires before the parent's, so cardY can be
    // populated one frame before listY. Skip the transform on both
    // conditions to avoid a one-frame tilt flash on mount.
    if (measured.value === 0 || listY.value === 0) {
      return {
        opacity: 1,
        transform: [{ scale: 1 }, { rotate: '0deg' }],
        filter: [{ blur: 0 }],
      };
    }
    const screenY = listY.value + cardY.value - scrollY.value;
    // screenY decreases as the card scrolls up. interpolate accepts a
    // descending input range (CLAMP handles both ends).
    const progress = interpolate(
      screenY,
      [triggerY, triggerY - TRIGGER_RANGE_PX],
      [0, 1],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(progress, [0, 1], [1, 0.85], Extrapolation.CLAMP);
    const rotate = interpolate(progress, [0, 1], [0, 20], Extrapolation.CLAMP);
    // Opacity + blur cascade slightly behind the tilt so the fade kicks
    // in just as the card crosses the header line, not immediately.
    const opacity = interpolate(progress, [0.3, 1], [1, 0], Extrapolation.CLAMP);
    const blur = interpolate(progress, [0.3, 1], [0, MAX_BLUR_PX], Extrapolation.CLAMP);
    return {
      opacity,
      transform: [
        { scale },
        { rotate: `${rotate}deg` },
      ],
      filter: [{ blur }],
    };
  });

  return (
    // Outer wrapper OWNS onLayout + marginTop. Its layout.y — measured
    // relative to the list container — reflects the cumulative stack
    // offset (including the negative stack margins above it). This is
    // the value we need for cardY; putting onLayout on the inner
    // Animated.View would always yield 0 because it has no siblings.
    <View onLayout={onLayout} style={{ marginTop: stackMargin }}>
      <Animated.View
        style={[animatedStyle, { transformOrigin: 'center bottom' } as any]}
      >
        {children}
      </Animated.View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────
export function SubscriptionsScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  // listY is the Y offset of the list container within the scroll
  // content. Filled in by the list's own onLayout. Animations stay at
  // identity (transform none) while this is 0.
  const listY = useSharedValue(0);
  // Screen-Y where a card "hits" the title and starts to tilt. Anchored
  // below the safe-area top so it's correct on devices with bigger
  // notches/dynamic islands. Empirically the "Mis suscripciones" title
  // baseline lands around insets.top + ~40–50px.
  const triggerY = insets.top + 50;

  const [sortMode, setSortMode] = useState<SortMode>('alphabetical');
  const [filter, setFilter] = useState<FilterValue>('all');
  const [androidSheet, setAndroidSheet] = useState<null | 'sort' | 'filter'>(null);

  // Monthly <-> annual toggle for the "Pagas X al mes" line.
  // Tapping the amount triggers a 1.5s shimmer skeleton and then
  // switches the shown period. The skeleton covers the amount AND
  // the "al mes" / "al año" label so the whole value refreshes.
  const [period, setPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [periodLoading, setPeriodLoading] = useState(false);
  const periodTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (periodTimeoutRef.current) clearTimeout(periodTimeoutRef.current);
    };
  }, []);
  const handleTogglePeriod = useCallback(() => {
    if (periodLoading) return;
    setPeriodLoading(true);
    periodTimeoutRef.current = setTimeout(() => {
      setPeriod((p) => (p === 'monthly' ? 'annual' : 'monthly'));
      setPeriodLoading(false);
    }, PERIOD_TOGGLE_MS);
  }, [periodLoading]);

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
  const totalForPeriod = period === 'monthly' ? totalMonthly : totalMonthly * 12;
  const periodLabel = period === 'monthly' ? 'al mes' : 'al a\u00F1o';
  const amountFormatted = totalForPeriod.toFixed(2).replace('.', ',');

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Header fade+blur: as the user scrolls, the "Mis suscripciones"
  // title and its paragraph dissolve into the background with the same
  // gaussian-blur vocabulary used on each card's exit. 0–120px of
  // scroll takes us from fully visible to fully gone.
  const headerAnimatedStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      scrollY.value,
      [0, 120],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return {
      opacity: 1 - progress,
      filter: [{ blur: progress * MAX_BLUR_PX }],
    };
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
    <View style={[styles.root, { backgroundColor: 'transparent' }]}>
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
        {/* Header — fades + blurs out as the user scrolls past it.
            Transparent background so the FloatingNav glass blur and the
            list behind both show through the fade. */}
        <Animated.View style={[styles.header, headerAnimatedStyle]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Mis suscripciones
          </Text>

          {/* Two paragraphs stacked:
             1. "Pagas X al mes." — amount + period are tap-toggleable
                (monthly ↔ annual). A 1.5s shimmer skeleton covers both
                the number and the "al mes"/"al año" label during the
                transition.
             2. "Tienes X suscripciones activas." — the word "activas"
                (active = healthy) is highlighted in the status-green
                color to match how status is encoded elsewhere. */}
          <Pressable
            onPress={handleTogglePeriod}
            style={styles.paragraphLine}
            accessibilityRole="button"
            accessibilityLabel={
              period === 'monthly'
                ? 'Mostrar total anual'
                : 'Mostrar total mensual'
            }
          >
            <Text style={[styles.paragraph, { color: colors.textPrimary }]}>
              Pagas{' '}
            </Text>
            {periodLoading ? (
              <Skeleton
                style={{ width: 150, height: 22, marginVertical: 2 }}
                borderRadius={6}
              />
            ) : (
              <Text style={[styles.paragraph, { color: colors.textPrimary }]}>
                {amountFormatted}
                {'\u20AC'} {periodLabel}
              </Text>
            )}
            <Text style={[styles.paragraph, { color: colors.textPrimary }]}>
              .
            </Text>
          </Pressable>

          <Text
            style={[
              styles.paragraph,
              styles.paragraphSecond,
              { color: colors.textPrimary },
            ]}
          >
            Tienes {activeCount}{' '}
            {activeCount === 1 ? 'suscripción ' : 'suscripciones '}
            <Text style={{ color: colors.statusActive }}>
              {activeCount === 1 ? 'activa' : 'activas'}
            </Text>
            .
          </Text>
        </Animated.View>

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

        {/* Subscription list — cards overlap via negative margin.
            onLayout here captures the list's Y within the scroll
            content so each ScrollCard can compute its screen position. */}
        <View
          style={styles.list}
          onLayout={(e) => {
            listY.value = e.nativeEvent.layout.y;
          }}
        >
          {filtered.map((sub, index) => (
            <ScrollCard
              key={sub.id}
              scrollY={scrollY}
              listY={listY}
              triggerY={triggerY}
              stackMargin={index === 0 ? 0 : STACK_MARGIN_PX}
            >
              <WalletCard subscription={sub} />
            </ScrollCard>
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
  },
  // Row that holds the "Pagas X al mes." line. flexWrap lets the
  // inline Skeleton sit alongside the surrounding text without
  // breaking when the amount grows (annual totals are wider). The
  // top margin separates the title from the first paragraph; the
  // second paragraph sits right under this one with its own margin.
  paragraphLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 4,
  },
  paragraphSecond: {
    marginTop: 2,
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
    paddingHorizontal: 10,
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
