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
  Modal,
  Dimensions,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  interpolate,
  Extrapolation,
  withTiming,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Check, ChevronsUpDown } from 'lucide-react-native';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);
import { useTheme } from '../../design/useTheme';
import { fontFamily, fontSize, lineHeight, letterSpacing } from '../../design/typography';
import { radius } from '../../design/radius';

import { WalletCard } from './WalletCard';
import { Skeleton } from '../../components/Skeleton';
import { MOCK_SUBSCRIPTIONS } from './mockData';
import { ProgressiveBlurView } from '../../components/ProgressiveBlurView';
import {
  navCompactProgress,
  navCompactState,
  COMPACT_SCROLL_THRESHOLD,
  NAV_COMPACT_DURATION,
} from '../dashboard/useDashboardReveal';
import type { Subscription, SubscriptionStatus, SortMode } from './types';
import { STATUS_LABELS } from './types';
import { useSubscriptionDetailStore } from '../subscription-detail/useSubscriptionDetailStore';

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
// (0° → 20°), fades (1 → 0) and a native gaussian blur veil fades IN
// over it as ITS OWN top crosses the page-title line. Because each
// card has its own measured `cardY`, animations fire one-by-one —
// the list as a whole never tilts.
//
// Why a BlurView overlay instead of the RN 0.81 `filter: [{blur}]`
// style prop:
//   - `filter` is a React Native core prop but only renders on the
//     New Architecture (Fabric). This app runs on the old arch
//     (Paper) in Expo Go, where `filter` is silently dropped and
//     only `opacity` would animate.
//   - expo-blur's BlurView wraps UIVisualEffectView on iOS
//     (gaussian blur) and works on BOTH architectures.
//   - Placed *on top of* the card content with an animated opacity,
//     the BlurView samples everything behind it (including the card
//     content) and displays a blurred version — which, as the
//     underlying content fades to 0, reads exactly as "the card
//     dissolves into a blurry veil".
//
// Coordinate math (unchanged):
//   cardY         — card's y within the list container
//   listY         — list container's y within the ScrollView content
//   cardScreenY   = listY + cardY − scrollY     (screen-space Y)
//
// Trigger window (screen-space, 100px wide):
//   progress = 0  when cardScreenY = triggerY         (top meets title)
//   progress = 1  when cardScreenY = triggerY − 100   (card fully gone)
//
// Within that window:
//   scale / rotate   animate over progress [0 → 1]   (immediate tilt)
//   opacity          animates over progress [0.3 → 1] (cascade behind)
//   blur veil opacity animates over progress [0.3 → 1]
//
// The `measured` + `listY > 0` gate guards against a one-frame tilt
// flash on mount.
const TRIGGER_RANGE_PX = 100;
const BLUR_INTENSITY = 80;

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
  const { isDark } = useTheme();
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

  // Shared progress drives BOTH the transform/opacity AND the blur
  // overlay opacity, keeping them perfectly in sync.
  const progress = useDerivedValue(() => {
    if (measured.value === 0 || listY.value === 0) return 0;
    const screenY = listY.value + cardY.value - scrollY.value;
    return interpolate(
      screenY,
      [triggerY, triggerY - TRIGGER_RANGE_PX],
      [0, 1],
      Extrapolation.CLAMP,
    );
  });

  const animatedStyle = useAnimatedStyle(() => {
    // Children's onLayout fires before the parent's, so cardY can be
    // populated one frame before listY. Skip the transform on both
    // conditions to avoid a one-frame tilt flash on mount.
    if (measured.value === 0 || listY.value === 0) {
      return {
        opacity: 1,
        transform: [{ scale: 1 }, { rotate: '0deg' }],
      };
    }
    const p = progress.value;
    const scale = interpolate(p, [0, 1], [1, 0.85], Extrapolation.CLAMP);
    const rotate = interpolate(p, [0, 1], [0, 20], Extrapolation.CLAMP);
    const opacity = interpolate(p, [0.3, 1], [1, 0], Extrapolation.CLAMP);
    return {
      opacity,
      transform: [
        { scale },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  // Blur veil fade-in. Placed inside the same transform wrapper so it
  // tilts with the card (blur stays "on" the card as it rotates).
  const blurOverlayStyle = useAnimatedStyle(() => {
    if (measured.value === 0 || listY.value === 0) return { opacity: 0 };
    return {
      opacity: interpolate(
        progress.value,
        [0.3, 1],
        [0, 1],
        Extrapolation.CLAMP,
      ),
    };
  });

  return (
    // Outer wrapper OWNS onLayout + marginTop. Its layout.y — measured
    // relative to the list container — reflects the cumulative stack
    // offset (including the negative stack margins above it).
    <View onLayout={onLayout} style={{ marginTop: stackMargin }}>
      <Animated.View
        style={[animatedStyle, { transformOrigin: 'center bottom' } as any]}
      >
        <View style={styles.cardWithBlur}>
          {children}
          <AnimatedBlurView
            tint={isDark ? 'dark' : 'light'}
            intensity={BLUR_INTENSITY}
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              blurOverlayStyle,
              { borderRadius: radius.card },
            ]}
          />
        </View>
      </Animated.View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────
export function SubscriptionsScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const openDetail = useSubscriptionDetailStore((s) => s.openDetail);
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

  // Which dropdown is open, and where the trigger currently sits
  // in window coordinates (captured via measureInWindow on press so
  // we can position the dropdown directly below the trigger, matching
  // the web's absolute-positioned menu).
  const [openMenu, setOpenMenu] = useState<null | 'sort' | 'filter'>(null);
  const [triggerLayout, setTriggerLayout] = useState<
    { x: number; y: number; width: number; height: number } | null
  >(null);
  const sortTriggerRef = useRef<View>(null);
  const filterTriggerRef = useRef<View>(null);

  const openDropdown = useCallback((which: 'sort' | 'filter') => {
    const ref = which === 'sort' ? sortTriggerRef : filterTriggerRef;
    ref.current?.measureInWindow((x, y, width, height) => {
      setTriggerLayout({ x, y, width, height });
      setOpenMenu(which);
    });
  }, []);
  const closeDropdown = useCallback(() => setOpenMenu(null), []);

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
      const y = event.contentOffset.y;
      scrollY.value = y;
      // Same compact state machine as DashboardScreen — see the comment
      // in useDashboardReveal: immediate response, 500 ms animation
      // either direction, auto-cancelling in-flight animation via
      // re-assignment to navCompactProgress.
      if (y > COMPACT_SCROLL_THRESHOLD) {
        if (navCompactState.value === 0) {
          navCompactState.value = 1;
          navCompactProgress.value = withTiming(1, {
            duration: NAV_COMPACT_DURATION,
            easing: Easing.out(Easing.cubic),
          });
        }
      } else {
        if (navCompactState.value === 1) {
          navCompactState.value = 0;
          navCompactProgress.value = withTiming(0, {
            duration: NAV_COMPACT_DURATION,
            easing: Easing.in(Easing.cubic),
          });
        }
      }
    },
  });

  // On focus, snap compact state to match current scroll position without
  // a delay — the delay only applies when the user is actively scrolling.
  useFocusEffect(
    useCallback(() => {
      const shouldCompact = scrollY.value > COMPACT_SCROLL_THRESHOLD;
      navCompactState.value = shouldCompact ? 1 : 0;
      navCompactProgress.value = shouldCompact ? 1 : 0;
    }, [scrollY]),
  );

  // Header fade+blur: as the user scrolls, the "Mis suscripciones"
  // title and its paragraphs dissolve behind a PROGRESSIVE blur veil
  // that fades in on top. 0–120px of scroll = fully visible → fully
  // gone. The veil uses MaskedView + LinearGradient so the blur holds
  // strong at the top and tapers softly toward the content below —
  // Apple's "Settings header" look. Same rationale as ScrollCard for
  // avoiding the RN 0.81 `filter` prop (needs Fabric).
  const headerFadeStyle = useAnimatedStyle(() => {
    const progress = interpolate(scrollY.value, [0, 120], [0, 1], Extrapolation.CLAMP);
    return { opacity: 1 - progress };
  });

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
        {/* Header — content fades out while a blur veil fades in on top.
            The outer View holds both so the veil sits above the text. */}
        <View style={styles.header}>
          <Animated.View style={headerFadeStyle}>
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
          <ProgressiveBlurView
            scrollY={scrollY}
            range={[0, 120]}
            maxIntensity={BLUR_INTENSITY}
            edge="top"
            tint={isDark ? 'dark' : 'light'}
            softFromFraction={0.55}
          />
        </View>

        {/* Sort (left) + Filter (right) */}
        <View style={styles.controlsRow}>
          {/* Sort trigger — tap to reveal a custom dropdown anchored
              directly below the trigger (matches the web app; the
              native iOS ActionSheet was replaced on user request). */}
          <Pressable
            ref={sortTriggerRef}
            onPress={() => openDropdown('sort')}
            style={styles.dropdownLeft}
            hitSlop={8}
          >
            <Text style={[styles.dropdownMuted, { color: dropdownMutedColor }]}>
              Ordenar por:{' '}
            </Text>
            <Text style={[styles.dropdownValue, { color: dropdownTextColor }]}>
              {SORT_LABELS[sortMode]}
            </Text>
            <ChevronsUpDown size={14} strokeWidth={2} color={dropdownMutedColor} />
          </Pressable>

          <Pressable
            ref={filterTriggerRef}
            onPress={() => openDropdown('filter')}
            style={styles.dropdownRight}
            hitSlop={8}
          >
            <Text style={[styles.dropdownValue, { color: dropdownTextColor }]}>
              {filter === 'all' ? 'Filtrar' : FILTER_LABELS[filter]}
            </Text>
            <ChevronsUpDown size={14} strokeWidth={2} color={dropdownMutedColor} />
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
              <WalletCard subscription={sub} onPress={() => openDetail(sub)} />
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

      {/* Custom dropdown (sort or filter) — same component for both,
          anchored to the captured trigger window coordinates. */}
      {openMenu && triggerLayout && (
        <DropdownMenu
          triggerLayout={triggerLayout}
          options={
            openMenu === 'sort'
              ? SORT_OPTIONS.map((m) => ({ value: m, label: SORT_LABELS[m] }))
              : FILTER_OPTIONS.map((v) => ({ value: v, label: FILTER_LABELS[v] }))
          }
          selected={openMenu === 'sort' ? sortMode : filter}
          align={openMenu === 'sort' ? 'left' : 'right'}
          width={openMenu === 'sort' ? 200 : 176}
          onSelect={(value) => {
            if (openMenu === 'sort') setSortMode(value as SortMode);
            else setFilter(value as FilterValue);
          }}
          onClose={closeDropdown}
        />
      )}
    </View>
  );
}

// ─── Custom dropdown menu (matches web SortDropdown/FilterDropdown) ─
// Replaces the native iOS ActionSheet on user request. Positioned as
// an absolute pop-over directly below the trigger, mirroring the
// web's `absolute top-full` + `mt-2` layout. Tap outside or select
// an option to dismiss.
//
// We measure the trigger with `measureInWindow` on press (see the
// parent's `openDropdown` callback), which gives us window-space
// coordinates. The Modal overlays the whole app, so window coords
// are exactly what we need for positioning — no extra adjustment
// for safe-area insets or scroll.
function DropdownMenu<T extends string>({
  triggerLayout,
  options,
  selected,
  onSelect,
  onClose,
  align = 'left',
  width,
}: {
  triggerLayout: { x: number; y: number; width: number; height: number };
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
  onClose: () => void;
  align?: 'left' | 'right';
  width: number;
}) {
  const { isDark } = useTheme();
  const screenWidth = Dimensions.get('window').width;

  // Position relative to the trigger (window coords). `mt-2` in web.
  const top = triggerLayout.y + triggerLayout.height + 8;
  const posStyle =
    align === 'left'
      ? { left: triggerLayout.x }
      : { right: screenWidth - (triggerLayout.x + triggerLayout.width) };

  const surface = isDark ? '#1C1C1E' : '#FFFFFF';
  const border = isDark ? '#2C2C2E' : '#E8E8E8';
  const activeBg = isDark ? '#2C2C2E' : '#F5F5F5';
  const itemColor = isDark ? '#F2F2F7' : '#000000';
  const itemMuted = isDark ? '#AEAEB2' : '#000000';
  const checkColor = isDark ? '#F2F2F7' : '#000000';

  return (
    <Modal
      transparent
      visible
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop — transparent, dismisses on tap. Matches the web's
          outside-click-to-close behavior. */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View
        style={[
          styles.dropdownMenu,
          {
            top,
            width,
            backgroundColor: surface,
            borderColor: border,
          },
          posStyle,
        ]}
      >
        {options.map(({ value, label }) => {
          const active = value === selected;
          return (
            <Pressable
              key={value}
              onPress={() => {
                onSelect(value);
                onClose();
              }}
              style={({ pressed }) => [
                styles.dropdownItem,
                {
                  backgroundColor:
                    active || pressed ? activeBg : 'transparent',
                },
              ]}
            >
              <Text
                style={[
                  styles.dropdownItemText,
                  { color: active ? itemColor : itemMuted },
                ]}
              >
                {label}
              </Text>
              {active && (
                <Check size={15} strokeWidth={2.5} color={checkColor} />
              )}
            </Pressable>
          );
        })}
      </View>
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
    // Anchor for the absoluteFill BlurView that overlays the title
    // + paragraphs during the scroll-driven fade-out.
    position: 'relative',
  },
  // Wraps each card + its BlurView veil. Needs position: relative so
  // the absoluteFill BlurView sizes to the card; borderRadius +
  // overflow: hidden clip the blur to the card's rounded shape.
  cardWithBlur: {
    position: 'relative',
    borderRadius: radius.card,
    overflow: 'hidden',
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
  // Custom dropdown menu — matches web SortDropdown/FilterDropdown.
  // Surface is absolutely positioned in window coords set by the
  // caller; `top` + align-driven `left`/`right` override these.
  dropdownMenu: {
    position: 'absolute',
    borderRadius: 16, // rounded-2xl
    borderWidth: 1,
    padding: 8, // p-2
    // Web shadow: 0 4px 24px rgba(0,0,0,0.12)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 16,
  },
  // 16px typography — explicit size on user's request.
  dropdownItemText: {
    ...fontFamily.semibold,
    fontSize: 16,
    lineHeight: 16 * 1.3,
  },
});
