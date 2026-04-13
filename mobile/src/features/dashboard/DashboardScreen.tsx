// Dashboard: DashboardScreen
// Composes all dashboard sections into a scrollable screen.
//
// Web composition order:
//   SummaryHero
//   DashboardCardStack (elastic gap 8→24px on pull)
//     ReminderCards (savings opportunity)
//     InsightCards (3 quick stat cards)
//     Card: UpcomingRenewals
//     Card: TopCategories
//     TopExpensive (horizontal scroll, outside card)
//
// Mobile adaptation:
//   - No DraggableSurface or elastic gap (Phase 4 feature, not needed for fidelity test)
//   - ScrollView with scroll-driven blur on card items
//   - Fixed gap of 8px between cards (matches web's base gap)
//   - Safe area handling at top and bottom
//   - FloatingNav space at bottom

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../design/useTheme';
import { fontFamily, fontSize, lineHeight, letterSpacing } from '../../design/typography';
import { radius } from '../../design/radius';
import { ScrollBlurItem } from '../../components/ScrollBlurItem';
import { Card, CardHeader } from '../../components/Card';

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
} from './mockData';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function DashboardScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

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
            paddingBottom: insets.bottom + 80, // space for FloatingNav
          },
        ]}
      >
        {/* Hero — not blurred (always visible at top) */}
        <SummaryHero
          firstName={MOCK_FIRST_NAME}
          stats={MOCK_STATS}
        />

        {/* Card stack — gap 8px between items */}
        <View style={styles.cardStack}>
          {/* Reminder card */}
          <ScrollBlurItem
            scrollY={scrollY}
            viewportHeight={SCREEN_HEIGHT}
          >
            <ReminderCards annualCount={1} />
          </ScrollBlurItem>

          {/* Insight cards */}
          <ScrollBlurItem
            scrollY={scrollY}
            viewportHeight={SCREEN_HEIGHT}
          >
            <InsightCards
              highestCost={{
                name: MOCK_HIGHEST_COST.name,
                amount: `20,00US$ /mes`,
                category: 'IA',
              }}
              topCategory={{
                name: MOCK_TOP_CATEGORY.name,
                amount: `40,00€ /mes`,
                count: MOCK_TOP_CATEGORY.count,
              }}
              sharedPlans={{
                count: MOCK_STATS.sharedCount,
                savings: '18,86€',
              }}
            />
          </ScrollBlurItem>

          {/* Upcoming Renewals */}
          <ScrollBlurItem
            scrollY={scrollY}
            viewportHeight={SCREEN_HEIGHT}
          >
            <Card>
              <CardHeader
                title="Próximas renovaciones"
                action={
                  <Text style={styles.calendarIcon}>📅</Text>
                }
              />
              <UpcomingRenewals renewals={MOCK_RENEWALS} />
            </Card>
          </ScrollBlurItem>

          {/* Top Categories */}
          <ScrollBlurItem
            scrollY={scrollY}
            viewportHeight={SCREEN_HEIGHT}
          >
            <Card>
              <CardHeader title="Categorías con más gasto" />
              <TopCategories
                categories={MOCK_CATEGORIES}
                currency={MOCK_STATS.currency}
              />
            </Card>
          </ScrollBlurItem>

          {/* Most Expensive */}
          <ScrollBlurItem
            scrollY={scrollY}
            viewportHeight={SCREEN_HEIGHT}
          >
            <View>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Suscripciones más caras
              </Text>
              <TopExpensive subscriptions={MOCK_TOP_EXPENSIVE} />
            </View>
          </ScrollBlurItem>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  cardStack: {
    paddingHorizontal: 20,
    gap: 8, // web's base card stack gap
  },
  sectionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize[17],
    lineHeight: fontSize[17] * lineHeight.tight,
    letterSpacing: letterSpacing.tight,
    marginBottom: 12,
  },
  calendarIcon: {
    fontSize: 20,
  },
});
