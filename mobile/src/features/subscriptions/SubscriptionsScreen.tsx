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
  useAnimatedReaction,
  useDerivedValue,
  interpolate,
  Extrapolation,
  withTiming,
  Easing,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Calendar, Check, ChevronsUpDown } from 'lucide-react-native';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);
import { useTheme } from '../../design/useTheme';
import { haptic } from '../../lib/haptics';
import { fontFamily, fontSize, lineHeight, letterSpacing } from '../../design/typography';
import { radius } from '../../design/radius';

import { useT } from '../../lib/i18n/LocaleProvider';
import { WalletCard, LockedWalletCard, FREE_SUBSCRIPTION_LIMIT } from './WalletCard';
import { usePaywallStore } from '../paywall/usePaywallStore';
import { SubscriptionsEmptyState } from './SubscriptionsEmptyState';
import { Skeleton } from '../../components/Skeleton';
import { useSubscriptionsStore } from '../../stores/subscriptionsStore';
import { useCalendarStore } from '../calendar/useCalendarStore';
import { SubscriptionsSkeleton } from '../../components/ScreenSkeletons';
import { ProgressiveBlurView } from '../../components/ProgressiveBlurView';
import {
  navCompactProgress,
  navCompactState,
  COMPACT_SCROLL_THRESHOLD,
  NAV_COMPACT_DURATION,
} from '../dashboard/useDashboardReveal';
import type { Subscription, SubscriptionStatus, SortMode } from './types';
import { useSubscriptionDetailStore } from '../subscription-detail/useSubscriptionDetailStore';

// Wallet-style overlap: each card's visible header (logo + name + price)
// peeks above the card below it. Tighter stacking — cards overlap more,
// closer to the web's wallet look.
const STACK_MARGIN_PX = -72;

// ─── Sort + filter config (labels taken from web) ─────────────────
const SORT_KEYS: Record<SortMode, string> = {
  alphabetical: 'subscriptions.sort.alphabetical',
  recently_added: 'subscriptions.sort.recent',
  price_high: 'subscriptions.sort.priceHigh',
  price_low: 'subscriptions.sort.priceLow',
};
const SORT_OPTIONS: SortMode[] = [
  'alphabetical',
  'recently_added',
  'price_high',
  'price_low',
];

type FilterValue = SubscriptionStatus | 'all';
const FILTER_KEYS: Record<FilterValue, string> = {
  all: 'subscriptions.filter.all',
  active: 'subscriptions.filter.active',
  trial: 'subscriptions.filter.trial',
  paused: 'subscriptions.filter.paused',
  cancelled: 'subscriptions.filter.cancelled',
  ended: 'subscriptions.filter.ended',
};
const FILTER_OPTIONS: FilterValue[] = ['all', 'active', 'trial', 'paused', 'cancelled', 'ended'];

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
const { height: SCREEN_H } = Dimensions.get('window');
// Entrance cascade window — a card's top crosses from (H − 40) down to
// (H − 200) as it rises into view; progress interpolates 0 → 1 for
// opacity + scale (0.9 → 1).
const ENTRANCE_START_FROM_BOTTOM = 40;
const ENTRANCE_END_FROM_BOTTOM   = 200;

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

  // Exit progress — 0 while the card is comfortably on screen, 1 once
  // its top has crossed past the page title. Drives the tilt + blur veil.
  const exitProgress = useDerivedValue(() => {
    if (measured.value === 0 || listY.value === 0) return 0;
    const screenY = listY.value + cardY.value - scrollY.value;
    return interpolate(
      screenY,
      [triggerY, triggerY - TRIGGER_RANGE_PX],
      [0, 1],
      Extrapolation.CLAMP,
    );
  });

  // Entrance progress — 0 while the card is below the viewport, 1 once
  // its top has risen past the entry line. Drives the scale + opacity
  // cascade as the card appears from the bottom.
  const enterProgress = useDerivedValue(() => {
    if (measured.value === 0 || listY.value === 0) return 1;
    const screenY = listY.value + cardY.value - scrollY.value;
    return interpolate(
      screenY,
      [
        SCREEN_H - ENTRANCE_START_FROM_BOTTOM,
        SCREEN_H - ENTRANCE_END_FROM_BOTTOM,
      ],
      [0, 1],
      Extrapolation.CLAMP,
    );
  });

  const hasEnteredHaptic = useSharedValue(0);
  useAnimatedReaction(
    () => enterProgress.value,
    (cur, prev) => {
      if (prev === null) return;
      if (prev < 0.5 && cur >= 0.5 && hasEnteredHaptic.value === 0) {
        hasEnteredHaptic.value = 1;
        runOnJS(haptic.light)();
      } else if (prev >= 0.5 && cur < 0.5 && hasEnteredHaptic.value === 1) {
        hasEnteredHaptic.value = 0;
        runOnJS(haptic.light)();
      }
    },
  );

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
    const e = enterProgress.value;
    const x = exitProgress.value;
    // While entering (e < 1) opacity/scale grow from the entry window.
    // Once fully entered, the exit progress takes over and tilts/fades.
    const scale = e < 1
      ? interpolate(e, [0, 1], [0.9, 1], Extrapolation.CLAMP)
      : interpolate(x, [0, 1], [1, 0.85], Extrapolation.CLAMP);
    const opacity = e < 1
      ? 1
      : interpolate(x, [0.3, 1], [1, 0], Extrapolation.CLAMP);
    const rotate = interpolate(x, [0, 1], [0, 20], Extrapolation.CLAMP);
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
        exitProgress.value,
        [0.3, 1],
        [0, 1],
        Extrapolation.CLAMP,
      ),
    };
  });

  const marginStyle = useAnimatedStyle(() => {
    return { marginTop: stackMargin };
  });

  return (
    <Animated.View onLayout={onLayout} style={marginStyle}>
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
    </Animated.View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────
export function SubscriptionsScreen() {
  const { colors, isDark } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const openDetail = useSubscriptionDetailStore((s) => s.openDetail);
  const openCalendar = useCalendarStore((s) => s.open);
  const subscriptions = useSubscriptionsStore((s) => s.subscriptions);
  const isPlusActive = useSubscriptionsStore((s) => s.isPlusActive);
  const storeLoading = useSubscriptionsStore((s) => s.loading);
  const isFirstLoad = storeLoading && subscriptions.length === 0;
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

  // Haptic on dropdown open
  const openDropdownWithHaptic = useCallback((which: 'sort' | 'filter') => {
    haptic.light();
    openDropdown(which);
  }, [openDropdown]);

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
    haptic.selection();
    setPeriodLoading(true);
    periodTimeoutRef.current = setTimeout(() => {
      setPeriod((p) => (p === 'monthly' ? 'annual' : 'monthly'));
      setPeriodLoading(false);
    }, PERIOD_TOGGLE_MS);
  }, [periodLoading]);

  const lockedIds = useMemo(() => {
    if (isPlusActive || subscriptions.length <= FREE_SUBSCRIPTION_LIMIT) return new Set<string>();
    const byCreation = [...subscriptions].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    return new Set(byCreation.slice(FREE_SUBSCRIPTION_LIMIT).map((s) => s.id));
  }, [subscriptions, isPlusActive]);

  const filtered = useMemo(() => {
    let subs = subscriptions;
    if (filter !== 'all') {
      subs = subs.filter((s) => s.status === filter);
    }
    return sortSubscriptions(subs, sortMode);
  }, [subscriptions, sortMode, filter]);

  const activeFiltered = useMemo(
    () => filtered.filter((s) => s.status === 'active' || s.status === 'trial'),
    [filtered],
  );
  const inactiveFiltered = useMemo(
    () => filtered.filter((s) => s.status !== 'active' && s.status !== 'trial'),
    [filtered],
  );

  // Stats for the subtitle paragraph.
  // Active subs define the headline number; we always sum their
  // monthly-equivalent cost in EUR (my_monthly_cost is pre-converted).
  const activeSubs = useMemo(
    () => subscriptions.filter((s) => s.status === 'active'),
    [subscriptions],
  );
  const activeCount = activeSubs.length;
  const totalMonthly = activeSubs.reduce((sum, s) => sum + s.my_monthly_cost, 0);
  const totalForPeriod = period === 'monthly' ? totalMonthly : totalMonthly * 12;
  const periodLabel = period === 'monthly' ? t('subscriptions.perMonth') : t('subscriptions.perYear');
  const amountFormatted = totalForPeriod.toFixed(2).replace('.', ',');

  const calendarTriggered = useSharedValue(false);
  const lastHapticStep = useSharedValue(0);
  const OVERSCROLL_THRESHOLD = -120;

  const BLOB_START_SIZE = 20;
  const BLOB_MAX_W = 190;
  const BLOB_GROW_H = 50;

  const blobStyle = useAnimatedStyle(() => {
    const y = scrollY.value;
    if (y >= 0) return { height: BLOB_START_SIZE, width: BLOB_START_SIZE, opacity: 0, borderRadius: BLOB_START_SIZE / 2, transform: [{ translateY: 0 }], backgroundColor: '#000000' };
    const progress = interpolate(y, [0, OVERSCROLL_THRESHOLD], [0, 1], Extrapolation.CLAMP);
    const w = interpolate(progress, [0, 1], [BLOB_START_SIZE, BLOB_MAX_W], Extrapolation.CLAMP);
    const h = interpolate(progress, [0, 1], [BLOB_START_SIZE, BLOB_GROW_H], Extrapolation.CLAMP);
    const bg = Math.round(interpolate(progress, [0, 1], [0, 255], Extrapolation.CLAMP));
    return {
      height: h,
      width: w,
      opacity: interpolate(progress, [0, 0.08], [0, 1], Extrapolation.CLAMP),
      borderRadius: radius.full,
      transform: [{ translateY: interpolate(progress, [0, 1], [0, 40], Extrapolation.CLAMP) }],
      backgroundColor: `rgb(${bg},${bg},${bg})`,
    };
  });

  const blobTextStyle = useAnimatedStyle(() => {
    const y = scrollY.value;
    const progress = interpolate(y, [0, OVERSCROLL_THRESHOLD], [0, 1], Extrapolation.CLAMP);
    const c = Math.round(interpolate(progress, [0, 1], [255, 0], Extrapolation.CLAMP));
    return {
      opacity: interpolate(progress, [0.35, 0.65], [0, 1], Extrapolation.CLAMP),
      fontSize: interpolate(progress, [0.35, 1], [11, 13], Extrapolation.CLAMP),
      color: `rgb(${c},${c},${c})`,
    };
  });

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      const y = event.contentOffset.y;
      scrollY.value = y;

      // Progressive haptic ticks as blob stretches
      if (y < 0) {
        const step = Math.floor(Math.abs(y) / 15);
        if (step > lastHapticStep.value) {
          lastHapticStep.value = step;
          runOnJS(haptic.light)();
        } else if (step < lastHapticStep.value) {
          lastHapticStep.value = step;
        }
      } else {
        lastHapticStep.value = 0;
      }

      if (y < OVERSCROLL_THRESHOLD && !calendarTriggered.value) {
        calendarTriggered.value = true;
        runOnJS(openCalendar)();
        runOnJS(haptic.heavy)();
      }
      if (y >= 0) {
        calendarTriggered.value = false;
      }

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

  // Nav compact state persists across tab switches — no focus sync needed.

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

  const isEmpty = subscriptions.length === 0;

  if (isFirstLoad) {
    return <SubscriptionsSkeleton />;
  }

  return (
    <View style={[styles.root, { backgroundColor: 'transparent' }]}>
      {/* Dynamic Island blob — black pill that grows from below the notch */}
      <Animated.View
        style={[styles.islandBlob, { top: insets.top - 8 }, blobStyle]}
        pointerEvents="none"
      >
        <Animated.Text style={[styles.islandBlobText, blobTextStyle]}>
          {t('subscriptions.showCalendar')}
        </Animated.Text>
      </Animated.View>

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
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {t('subscriptions.title')}
              </Text>
              {!isEmpty && (
                <Pressable
                  onPress={openCalendar}
                  accessibilityRole="button"
                  accessibilityLabel={t('dashboard.viewCalendar')}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.calendarBtn,
                    {
                      backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF',
                      opacity: pressed ? 0.6 : 1,
                    },
                  ]}
                >
                  <Calendar
                    size={18}
                    strokeWidth={2}
                    color={isDark ? '#AEAEB2' : '#333333'}
                  />
                </Pressable>
              )}
            </View>

          {!isEmpty && (
            <>
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
                    ? t('subscriptions.showAnnualTotal')
                    : t('subscriptions.showMonthlyTotal')
                }
              >
                <Text style={[styles.paragraph, { color: colors.textPrimary }]}>
                  {t('subscriptions.youPay')}{' '}
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
                {t('subscriptions.youHave')} {activeCount}{' '}
                {activeCount === 1 ? t('subscriptions.subscription') : t('subscriptions.subscriptions')}{' '}
                <Text style={{ color: colors.statusActive }}>
                  {activeCount === 1 ? t('subscriptions.active') : t('subscriptions.activePlural')}
                </Text>
                .
              </Text>
            </>
          )}
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

        {isEmpty && <SubscriptionsEmptyState scrollY={scrollY} />}

        {!isEmpty && (
        <>
        {/* Sort (left) + Filter (right) */}
        <View style={styles.controlsRow}>
          {/* Sort trigger — tap to reveal a custom dropdown anchored
              directly below the trigger (matches the web app; the
              native iOS ActionSheet was replaced on user request). */}
          <Pressable
            ref={sortTriggerRef}
            onPress={() => openDropdownWithHaptic('sort')}
            style={styles.dropdownLeft}
            hitSlop={8}
          >
            <Text style={[styles.dropdownMuted, { color: dropdownMutedColor }]}>
              {t('subscriptions.sortBy')}{' '}
            </Text>
            <Text style={[styles.dropdownValue, { color: dropdownTextColor }]}>
              {t(SORT_KEYS[sortMode])}
            </Text>
            <ChevronsUpDown size={14} strokeWidth={2} color={dropdownMutedColor} />
          </Pressable>

          <Pressable
            ref={filterTriggerRef}
            onPress={() => openDropdownWithHaptic('filter')}
            style={styles.dropdownRight}
            hitSlop={8}
          >
            <Text style={[styles.dropdownValue, { color: dropdownTextColor }]}>
              {filter === 'all' ? t('subscriptions.filter') : t(FILTER_KEYS[filter])}
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
          {activeFiltered.map((sub, index) => (
            <ScrollCard
              key={sub.id}
              scrollY={scrollY}
              listY={listY}
              triggerY={triggerY}
              stackMargin={index === 0 ? 0 : STACK_MARGIN_PX}
            >
              {lockedIds.has(sub.id) ? (
                <LockedWalletCard
                  subscription={sub}
                  onPress={() => usePaywallStore.getState().open('subscription_limit')}
                />
              ) : (
                <WalletCard subscription={sub} onPress={() => openDetail(sub)} />
              )}
            </ScrollCard>
          ))}

          {inactiveFiltered.length > 0 && (
            <>
              <View style={styles.inactiveSeparator}>
                <View style={[styles.separatorLine, { backgroundColor: colors.borderLight }]} />
                <Text style={[styles.separatorLabel, { color: colors.textMuted }]}>
                  {t('subscriptions.inactive')}
                </Text>
                <View style={[styles.separatorLine, { backgroundColor: colors.borderLight }]} />
              </View>
              {inactiveFiltered.map((sub, index) => (
                <ScrollCard
                  key={sub.id}
                  scrollY={scrollY}
                  listY={listY}
                  triggerY={triggerY}
                  stackMargin={index === 0 ? 0 : STACK_MARGIN_PX}
                >
                  {lockedIds.has(sub.id) ? (
                    <LockedWalletCard
                      subscription={sub}
                      onPress={() => usePaywallStore.getState().open('subscription_limit')}
                    />
                  ) : (
                    <WalletCard subscription={sub} onPress={() => openDetail(sub)} />
                  )}
                </ScrollCard>
              ))}
            </>
          )}

          {filtered.length === 0 && (
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {t('subscriptions.noFilterResults')}
              </Text>
              <Pressable
                onPress={() => setFilter('all')}
                style={[
                  styles.clearBtn,
                  { backgroundColor: isDark ? '#2C2C2E' : '#F0F0F0' },
                ]}
              >
                <Text style={[styles.clearBtnText, { color: colors.textPrimary }]}>
                  {t('subscriptions.clearFilters')}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
        </>
        )}
      </Animated.ScrollView>

      {/* Custom dropdown (sort or filter) — same component for both,
          anchored to the captured trigger window coordinates. */}
      {openMenu && triggerLayout && (
        <DropdownMenu
          triggerLayout={triggerLayout}
          options={
            openMenu === 'sort'
              ? SORT_OPTIONS.map((m) => ({ value: m, label: t(SORT_KEYS[m]) }))
              : FILTER_OPTIONS.map((v) => ({ value: v, label: t(FILTER_KEYS[v]) }))
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
                haptic.selection();
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
  islandBlob: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    overflow: 'hidden',
  },
  islandBlobText: {
    ...fontFamily.medium,
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...fontFamily.medium,
    fontSize: 30,
    lineHeight: 30 * lineHeight.tight,
    letterSpacing: letterSpacing.tight,
    flex: 1,
  },
  calendarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  // Matches web: 18px bold, primary text color (NOT muted), tight leading.
  paragraph: {
    ...fontFamily.medium,
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
    marginTop: 40,
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
    ...fontFamily.regular,
    fontSize: fontSize[15],
  },
  dropdownValue: {
    ...fontFamily.regular,
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
    ...fontFamily.medium,
    fontSize: fontSize[15],
  },
  inactiveSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  separatorLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  separatorLabel: {
    ...fontFamily.regular,
    fontSize: fontSize[13],
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
    ...fontFamily.medium,
    fontSize: 16,
    lineHeight: 16 * 1.3,
  },
});
