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
import { CalendarDays } from 'lucide-react-native';
import { useTheme } from '../../design/useTheme';
import { fontFamily, fontSize, lineHeight, letterSpacing } from '../../design/typography';
import { radius } from '../../design/radius';
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

import { SummaryHero } from './SummaryHero';
import { ReminderCards } from './ReminderCards';
import { InsightCards } from './InsightCards';
import { UpcomingRenewals } from './UpcomingRenewals';
import { TopCategories } from './TopCategories';
import { TopExpensive } from './TopExpensive';

import {
  MOCK_STATS,
  MOCK_FIRST_NAME,
  MOCK_RENEWALS,
  MOCK_CATEGORIES,
  MOCK_TOP_EXPENSIVE,
  MOCK_HIGHEST_COST,
  MOCK_TOP_CATEGORY,
  MOCK_LOGO_URLS,
  MOCK_SHARED_LOGO_URLS,
} from './mockData';

// Staggered entrance wrapper
function StaggeredItem({ index, children }: { index: number; children: React.ReactNode }) {
  const { animatedStyle } = useStaggeredEntrance({ index });
  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

export function DashboardScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

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

  // Calendar icon button for upcoming renewals header
  const calendarAction = (
    <View style={[styles.calendarBtn, {
      backgroundColor: isDark ? '#2C2C2E' : '#F5F5F5',
    }]}>
      <CalendarDays
        size={16}
        strokeWidth={2}
        color={isDark ? '#AEAEB2' : '#000000'}
      />
    </View>
  );

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
        onSettings={reveal.close}
        onShareData={reveal.close}
        onManagePlus={reveal.close}
        onLogout={reveal.close}
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
            <View style={styles.heroWrapper}>
              <Animated.View style={[heroFadeStyle, { backgroundColor: colors.background }]}>
                <SummaryHero
                  stats={MOCK_STATS}
                  logoUrls={MOCK_LOGO_URLS}
                  sharedLogoUrls={MOCK_SHARED_LOGO_URLS}
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

            {/* Card stack -- staggered entrance */}
            <View style={styles.cardStack}>
              {/* Reminder card — extra 10px separation from the module below */}
              <StaggeredItem index={0}>
                <View style={{ marginBottom: 10 }}>
                  <ReminderCards annualCount={1} sharedSavings={'18,86\u20AC'} />
                </View>
              </StaggeredItem>

              {/* Insight cards */}
              <StaggeredItem index={1}>
                <InsightCards
                  highestCost={{
                    name: MOCK_HIGHEST_COST.name,
                    amount: `20,00US$ /mes`,
                    category: 'IA',
                  }}
                  topCategory={{
                    name: MOCK_TOP_CATEGORY.name,
                    amount: `40,00\u20AC /mes`,
                    count: MOCK_TOP_CATEGORY.count,
                  }}
                  sharedPlans={{
                    count: MOCK_STATS.sharedCount,
                    savings: '18,86\u20AC',
                  }}
                />
              </StaggeredItem>

              {/* Upcoming Renewals */}
              <StaggeredItem index={2}>
                <Card>
                  <CardHeader
                    title="Próximas renovaciones"
                    action={calendarAction}
                  />
                  <UpcomingRenewals renewals={MOCK_RENEWALS} />
                </Card>
              </StaggeredItem>

              {/* Top Categories */}
              <StaggeredItem index={3}>
                <Card>
                  <CardHeader title="Categorías con más gasto" />
                  <TopCategories
                    categories={MOCK_CATEGORIES}
                    currency={MOCK_STATS.currency}
                  />
                </Card>
              </StaggeredItem>

              {/* Most Expensive */}
              <StaggeredItem index={4}>
                <View>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                    Suscripciones más caras
                  </Text>
                  <TopExpensive subscriptions={MOCK_TOP_EXPENSIVE} />
                </View>
              </StaggeredItem>
            </View>
          </Animated.ScrollView>
        </GestureDetector>
      </Animated.View>

      {/* Shared greeting + avatar — ONE visual element that lives above
          both the dashboard surface and the profile layer. It morphs its
          style (fontSize + color) with reveal.progress so the same row
          looks correct whether the white sheet or the black panel is the
          visible context. Avatar tap toggles the reveal. */}
      <SharedProfileHeader
        firstName={MOCK_FIRST_NAME}
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
      {logoConfetti && (
        <LogoConfetti
          logoUrls={MOCK_LOGO_URLS}
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
  calendarBtn: {
    width: 40, // w-10
    height: 40, // h-10
    borderRadius: radius.xl, // 12px = rounded-xl
    alignItems: 'center',
    justifyContent: 'center',
  },
});
