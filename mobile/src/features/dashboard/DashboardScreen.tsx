// Dashboard: DashboardScreen
// Composes all dashboard sections into a scrollable screen.
//
// Web composition order:
//   SummaryHero
//   DashboardCardStack
//     ReminderCards (savings opportunity)
//     InsightCards (3 quick stat cards)
//     Card: UpcomingRenewals
//     Card: TopCategories
//     TopExpensive (horizontal scroll, outside card)
//
// Mobile adaptation:
//   - Pull-down reveal: dragging the dashboard down from scroll-top
//     slides it off the UnderlyingProfileLayer behind (`useDashboardReveal`)
//   - Staggered entrance animation (55ms/item, 400ms cardEntrance curve)
//   - Hero scroll fade (opacity as user scrolls)
//   - Hero has opaque background (matches theme)
//   - Safe area handling at top and bottom
//   - FloatingNav space at bottom

import React, { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
} from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../design/useTheme';
import { fontFamily, fontSize, lineHeight, letterSpacing } from '../../design/typography';
import { Card, CardHeader } from '../../components/Card';
import { MoneyConfetti } from '../../components/MoneyConfetti';
import { LogoConfetti } from '../../components/LogoConfetti';

import { useStaggeredEntrance } from '../../motion/useStaggeredEntrance';
import { UnderlyingProfileLayer } from '../profile/UnderlyingProfileLayer';
import { ProgressiveBlurView } from '../../components/ProgressiveBlurView';
import {
  useDashboardReveal,
  navCompactProgress,
  navCompactState,
  COMPACT_SCROLL_THRESHOLD,
} from './useDashboardReveal';
import { SharedProfileHeader } from './SharedProfileHeader';
import { useSettingsStore } from '../settings/useSettingsStore';
import { useAuthStore } from '../auth/useAuthStore';
import { useSavingsSuggestionsStore } from '../savings-suggestions/useSavingsSuggestionsStore';
import { useToastStore } from '../../components/useToastStore';

import { SummaryHero } from './SummaryHero';
import { ReminderCards } from './ReminderCards';
import { InsightCards } from './InsightCards';
import { UpcomingRenewals } from './UpcomingRenewals';
import { TopCategories } from './TopCategories';
import { TopExpensive } from './TopExpensive';
import { DashboardEmptyState } from './DashboardEmptyState';

import { MOCK_FIRST_NAME } from './mockData';
import { formatAmount } from '../subscription-detail/helpers';
import { useSubscriptionsStore } from '../../stores/subscriptionsStore';
import {
  deriveStats,
  deriveRenewals,
  deriveTopExpensive,
  deriveCategories,
  deriveHighestCost,
  deriveTopCategory,
  deriveLogoUrls,
  deriveSharedLogoUrls,
} from './derive';

// Staggered entrance wrapper
function StaggeredItem({ index, children }: { index: number; children: React.ReactNode }) {
  const { animatedStyle } = useStaggeredEntrance({ index });
  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

export function DashboardScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const user = useAuthStore((s) => s.user);
  const fullName = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? MOCK_FIRST_NAME;
  const firstName = fullName.split(/\s+/)[0];
  const avatarUrl = user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture ?? null;

  // All dashboard numbers flow from the active subscriptions preset —
  // switching Demo states swaps every card in one go.
  const subscriptions = useSubscriptionsStore((s) => s.subscriptions);
  const enableRemindersOnAnnuals = useSubscriptionsStore((s) => s.enableRemindersOnAnnuals);
  const isEmpty = subscriptions.length === 0;
  // Real count of yearly-billing subs — drives the "Avísame" reminder
  // card's visibility (no annuals → don't render the card at all).
  const annualCount = React.useMemo(
    () => subscriptions.filter((s) => s.billing_period === 'yearly').length,
    [subscriptions],
  );
  const stats            = React.useMemo(() => deriveStats(subscriptions),            [subscriptions]);
  const renewals         = React.useMemo(() => deriveRenewals(subscriptions),         [subscriptions]);
  const topExpensive     = React.useMemo(() => deriveTopExpensive(subscriptions),     [subscriptions]);
  const categories       = React.useMemo(() => deriveCategories(subscriptions),       [subscriptions]);
  const highestCost      = React.useMemo(() => deriveHighestCost(subscriptions),      [subscriptions]);
  const topCategory      = React.useMemo(() => deriveTopCategory(subscriptions),      [subscriptions]);
  const logoUrls         = React.useMemo(() => deriveLogoUrls(subscriptions),         [subscriptions]);
  const sharedLogoUrls   = React.useMemo(() => deriveSharedLogoUrls(subscriptions),   [subscriptions]);

  // Confetti state
  const [moneyConfetti, setMoneyConfetti] = useState<{ x: number; y: number } | null>(null);
  const [logoConfetti, setLogoConfetti] = useState<{ x: number; y: number } | null>(null);

  const handleAmountTap = useCallback((x: number, y: number) => {
    setMoneyConfetti({ x, y });
  }, []);

  const handleLogosTap = useCallback((x: number, y: number) => {
    setLogoConfetti({ x, y });
  }, []);

  // Pull-down reveal: dashboard slides off, exposing UnderlyingProfileLayer.
  // The hook owns the gesture (composed simultaneously with the scroll's
  // native pan), the snap state machine, scroll tracking and the
  // translateY shared value.
  const reveal = useDashboardReveal();

  // Tapping "Ajustes" in the dark profile layer first dismisses the
  // reveal (so the layer slides back underneath the dashboard), then
  // presents the globally-mounted SettingsSheet. Order matters: opening
  // the sheet first would try to present a Modal over a gesture-bound
  // animation mid-flight, which feels janky on iOS.
  const openSettings = useSettingsStore((s) => s.open);
  const handleOpenSettings = useCallback(() => {
    reveal.close();
    openSettings();
  }, [reveal, openSettings]);

  // "Cerrar sesión" — close the reveal, then tell Supabase to sign out.
  // The AuthGate in app/_layout.tsx is subscribed to the session, so it
  // will redirect to /login on its own once the status flips. No need
  // to call router.replace here.
  const signOut = useAuthStore((s) => s.signOut);
  const handleLogout = useCallback(() => {
    reveal.close();
    signOut();
  }, [reveal, signOut]);

  // ReminderCards "Ver oportunidades" → open the savings suggestions
  // list sheet. Lives in its own globally-mounted Modal so the
  // dashboard scroll position and reveal state are untouched.
  const openSavingsList = useSavingsSuggestionsStore((s) => s.openList);

  // "Avísame" CTA — enable 7-day-before reminders on every annual sub and
  // confirm via a green success toast. The store action returns how many
  // subscriptions were touched so the toast can tailor the copy.
  const handleActivateReminder = useCallback(() => {
    const count = enableRemindersOnAnnuals();
    const message =
      count === 1
        ? 'Avisos activados para tu suscripci\u00F3n anual'
        : `Avisos activados para tus ${count} suscripciones anuales`;
    useToastStore.getState().show('success', message);
  }, [enableRemindersOnAnnuals]);

  // Reuse the reveal hook's scroll tracking for the hero fade — single
  // source of truth for "where is the user in the scroll view".
  const scrollY = reveal.scrollY;

  // Sync the nav-bar compact state from our current scroll position
  // whenever this screen (re)focuses — scrolling doesn't fire during
  // tab switches so without this the nav could be stuck compact from
  // the other tab's scroll state.
  // On focus, snap compact state to match current scroll position without
  // a delay — the delay only applies when the user is actively scrolling.
  useFocusEffect(
    useCallback(() => {
      const shouldCompact = scrollY.value > COMPACT_SCROLL_THRESHOLD;
      navCompactState.value = shouldCompact ? 1 : 0;
      navCompactProgress.value = shouldCompact ? 1 : 0;
    }, [scrollY]),
  );

  // The dashboard surface only animates translateY — the top-corner
  // radius and drop shadow are ALWAYS applied (matches the web's
  // `rounded-t-[32px]` + boxShadow on DraggableSurface's foreground).
  // Keeping the chrome static means the sheet reads as a discrete
  // surface even at rest, and pulling down doesn't morph its shape.
  const surfaceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: reveal.translateY.value }],
  }));

  // Hero scroll fade+blur: as the user scrolls, the whole hero block
  // (greeting, big "Al mes gastas / Eso al año es" amounts, and the
  // supporting "Tienes X suscripciones" line) dissolves away — the
  // content fades to opacity 0 while a PROGRESSIVE blur veil fades in
  // on top. 0–220px of scroll takes us from fully visible to fully
  // gone. The veil uses a MaskedView + LinearGradient so the blur
  // stays strong at the top edge and tapers softly at the bottom —
  // matches Apple's Settings/Wallet header glass without any private
  // APIs (Expo Go safe, App-Store safe).
  //
  // The BlurView-overlay approach is used instead of the RN 0.81
  // `filter: [{blur}]` style prop because `filter` only renders on
  // the New Architecture (Fabric). This app runs on Paper in Expo Go,
  // where `filter` would be silently dropped — see SubscriptionsScreen
  // ScrollCard for the full rationale.
  const heroFadeStyle = useAnimatedStyle(() => {
    const progress = Math.min(Math.max(scrollY.value / 220, 0), 1);
    return { opacity: 1 - progress };
  });

  // "Quedan X d\u00EDas" on the right of the renewals card header — the
  // X is driven by the nearest upcoming renewal. Rendered as a discreet
  // text label so the card reads like a live countdown rather than an
  // inert list header.
  const nextRenewalDays = renewals[0]?.daysUntilRenewal;
  const daysLeftLabel =
    nextRenewalDays == null
      ? null
      : nextRenewalDays === 0
        ? 'Hoy'
        : nextRenewalDays === 1
          ? 'Queda 1 d\u00EDa'
          : `Quedan ${nextRenewalDays} d\u00EDas`;
  const daysLeftAction = daysLeftLabel ? (
    <Text style={[styles.daysLeftText, { color: colors.textMuted }]}>
      {daysLeftLabel}
    </Text>
  ) : undefined;

  return (
    // Root host: `#0A0A0A` so any hairline gap between the layers
    // during the animation reads as part of the backdrop, not a flash
    // of theme white. The UnderlyingProfileLayer's own bg is the same
    // color, so this is effectively just a safety net.
    <View style={[styles.root, { backgroundColor: '#0A0A0A' }]}>
      {/* Underlying profile layer — always mounted, behind the dashboard.
          Its greeting/avatar are NOT here — they live in the
          SharedProfileHeader overlay below, which is the same visual
          element in both closed and open states. */}
      <UnderlyingProfileLayer
        progress={reveal.progress}
        onSettings={handleOpenSettings}
        onShareData={reveal.close}
        onManagePlus={reveal.close}
        onLogout={handleLogout}
        onToggleTheme={reveal.close}
      />

      {/* Dashboard surface — slides down to expose the layer behind. */}
      <Animated.View
        style={[
          styles.surface,
          { backgroundColor: colors.background, shadowColor: '#000' },
          surfaceStyle,
        ]}
      >
        <GestureDetector gesture={reveal.gesture}>
          <Animated.ScrollView
            onScroll={reveal.scrollHandler}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            // Lock scroll once the surface is open so the only valid input
            // on the dashboard becomes "drag back up to close".
            scrollEnabled={!reveal.isOpenJS}
            // Disable iOS top-bounce — our reveal IS the top overscroll
            // affordance now, and the bounce would compete visually with it.
            bounces={false}
            contentContainerStyle={[
              styles.content,
              {
                paddingTop: insets.top + 12,
                paddingBottom: insets.bottom + 80, // space for FloatingNav
              },
            ]}
          >
            {/* Hero — content fades out while a blur veil fades in on top.
                Outer View owns position: relative so the absoluteFill
                BlurView sizes to the hero. */}
            {!isEmpty && (
              <View style={styles.heroWrapper}>
                <Animated.View style={[heroFadeStyle, { backgroundColor: colors.background }]}>
                  <SummaryHero
                    stats={stats}
                    logoUrls={logoUrls}
                    sharedLogoUrls={sharedLogoUrls}
                    onAmountTap={handleAmountTap}
                    onLogosTap={handleLogosTap}
                  />
                </Animated.View>
                <ProgressiveBlurView
                  scrollY={scrollY}
                  range={[0, 220]}
                  maxIntensity={80}
                  edge="top"
                  tint={isDark ? 'dark' : 'light'}
                  softFromFraction={0.55}
                />
              </View>
            )}

            {/* Empty state — replaces the whole dashboard body when the
                user has zero subscriptions (new user / Vacío demo preset).
                Sits below the SharedProfileHeader greeting so the screen
                still feels anchored. */}
            {isEmpty && (
              <View style={{ paddingTop: 44 + 8 }}>
                <DashboardEmptyState scrollY={scrollY} />
              </View>
            )}

            {/* Card stack -- staggered entrance */}
            {!isEmpty && (
            <View style={styles.cardStack}>
              {/* Reminder card — extra 10px separation from the module below */}
              <StaggeredItem index={0}>
                <View style={{ marginBottom: 10 }}>
                  <ReminderCards
                    annualCount={annualCount}
                    sharedSavings={'18,86\u20AC'}
                    onActivateReminder={handleActivateReminder}
                    onViewSavings={openSavingsList}
                  />
                </View>
              </StaggeredItem>

              {/* Insight cards */}
              {highestCost && topCategory && (
                <StaggeredItem index={1}>
                  <InsightCards
                    highestCost={{
                      name: highestCost.name,
                      amount: `${formatAmount(highestCost.monthlyCost, highestCost.currency)} /mes`,
                      category: highestCost.category ?? '',
                    }}
                    topCategory={{
                      name: topCategory.name,
                      amount: `${formatAmount(topCategory.monthlyCost, topCategory.currency)} /mes`,
                      count: topCategory.count,
                    }}
                    sharedPlans={{
                      count: stats.sharedCount,
                      savings: formatAmount(stats.savingsMonthly, stats.currency),
                    }}
                  />
                </StaggeredItem>
              )}

              {/* Upcoming Renewals */}
              <StaggeredItem index={2}>
                <Card>
                  <CardHeader
                    title="Próxima renovación"
                    action={daysLeftAction}
                  />
                  <UpcomingRenewals renewals={renewals} />
                </Card>
              </StaggeredItem>

              {/* Top Categories */}
              <StaggeredItem index={3}>
                <Card>
                  <CardHeader title="Categorías con más gasto" />
                  <TopCategories
                    categories={categories}
                    currency={stats.currency}
                  />
                </Card>
              </StaggeredItem>

              {/* Most Expensive */}
              <StaggeredItem index={4}>
                <View style={{ marginTop: 16 }}>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                    Suscripciones más caras
                  </Text>
                  <TopExpensive subscriptions={topExpensive} />
                </View>
              </StaggeredItem>
            </View>
            )}
          </Animated.ScrollView>
        </GestureDetector>
      </Animated.View>

      {/* Shared greeting + avatar — ONE visual element that lives above
          both the dashboard surface and the profile layer. It morphs its
          style (fontSize + color) with reveal.progress so the same row
          looks correct whether the white sheet or the black panel is the
          visible context. Avatar tap toggles the reveal. */}
      <SharedProfileHeader
        firstName={firstName}
        fullName={fullName}
        avatarUrl={avatarUrl}
        onAvatarPress={reveal.toggle}
        scrollY={scrollY}
      />

      {/* Confetti overlays — render on top of everything */}
      {moneyConfetti && (
        <MoneyConfetti
          originX={moneyConfetti.x}
          originY={moneyConfetti.y}
          onComplete={() => setMoneyConfetti(null)}
        />
      )}
      {logoConfetti && logoUrls.length > 0 && (
        <LogoConfetti
          logoUrls={logoUrls}
          originX={logoConfetti.x}
          originY={logoConfetti.y}
          onComplete={() => setLogoConfetti(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  // The dashboard surface — slides over the underlying profile layer.
  // Top corners are always rounded (32px) and a soft upward shadow is
  // always drawn along the top edge. This mirrors the web:
  //   borderTopLeftRadius / borderTopRightRadius: 32
  //   boxShadow: 0 -12px 40px rgba(0,0,0,0.22)
  // overflow: hidden clips the ScrollView to the rounded top corners.
  surface: {
    flex: 1,
    overflow: 'hidden',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowOffset: { width: 0, height: -12 },
    shadowRadius: 40,
    shadowOpacity: 0.22,
  },
  content: {
    flexGrow: 1,
  },
  heroWrapper: {
    // Anchor for the absoluteFill BlurView overlay.
    position: 'relative',
  },
  cardStack: {
    paddingHorizontal: 10,
    gap: 8,
  },
  sectionTitle: {
    ...fontFamily.bold,
    fontSize: fontSize[18],
    lineHeight: fontSize[18] * lineHeight.tight,
    letterSpacing: letterSpacing.tight,
    marginBottom: 12,
  },
  daysLeftText: {
    ...fontFamily.medium,
    fontSize: fontSize[14],
    lineHeight: fontSize[14] * lineHeight.snug,
    fontVariant: ['tabular-nums'],
  },
});
