// Dashboard: DashboardScreen
// Composes all dashboard sections into a scrollable screen.
//
// Web composition order:
//   SummaryHero
//   DashboardCardStack (elastic gap 8->24px on pull)
//     ReminderCards (savings opportunity)
//     InsightCards (3 quick stat cards)
//     Card: UpcomingRenewals
//     Card: TopCategories
//     TopExpensive (horizontal scroll, outside card)
//
// Mobile adaptation:
//   - Elastic pull-down gap (8->24px) via useElasticPullDown + cardStackGap()
//   - ScrollView with scroll-driven blur on card items
//   - Staggered entrance animation (55ms/item, 400ms cardEntrance curve)
//   - Hero scroll fade (opacity + blur as user scrolls)
//   - Safe area handling at top and bottom
//   - FloatingNav space at bottom

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
} from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarDays } from 'lucide-react-native';
import { useTheme } from '../../design/useTheme';
import { fontFamily, fontSize, lineHeight, letterSpacing } from '../../design/typography';
import { radius } from '../../design/radius';
import { ScrollBlurItem } from '../../components/ScrollBlurItem';
import { Card, CardHeader } from '../../components/Card';

import { useStaggeredEntrance } from '../../motion/useStaggeredEntrance';
import { useElasticPullDown } from '../../motion/useElasticPullDown';
import { cardStackGap, scrollBlurProgress, scrollBlurOpacity, scrollBlurRadius } from '../../motion/interpolate';

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
} from './mockData';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Staggered entrance wrapper
function StaggeredItem({ index, children }: { index: number; children: React.ReactNode }) {
  const { animatedStyle } = useStaggeredEntrance({ index });
  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

export function DashboardScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);

  // Elastic pull-down for card stack gap
  const { pullY, gesture } = useElasticPullDown();

  // Dynamic card stack gap: 8px -> 24px during pull
  const animatedCardStackStyle = useAnimatedStyle(() => ({
    gap: cardStackGap(pullY.value),
  }));

  // Hero scroll fade: opacity fades from 1 -> 0 over 220px scroll
  const heroAnimatedStyle = useAnimatedStyle(() => {
    const progress = Math.min(Math.max(scrollY.value / 220, 0), 1);
    return {
      opacity: 1 - progress * 0.7,
      filter: [{ blur: progress * 6 }],
    };
  });

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
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
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <GestureDetector gesture={gesture}>
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
          {/* Hero -- scroll fade applied, not blurred on scroll */}
          <Animated.View style={heroAnimatedStyle}>
            <SummaryHero
              firstName={MOCK_FIRST_NAME}
              stats={MOCK_STATS}
              logoUrls={MOCK_LOGO_URLS}
            />
          </Animated.View>

          {/* Card stack -- elastic gap + staggered entrance */}
          <Animated.View style={[styles.cardStack, animatedCardStackStyle]}>
            {/* Reminder card */}
            <StaggeredItem index={0}>
              <ScrollBlurItem
                scrollY={scrollY}
                viewportHeight={SCREEN_HEIGHT}
              >
                <ReminderCards annualCount={1} />
              </ScrollBlurItem>
            </StaggeredItem>

            {/* Insight cards */}
            <StaggeredItem index={1}>
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
                    amount: `40,00\u20AC /mes`,
                    count: MOCK_TOP_CATEGORY.count,
                  }}
                  sharedPlans={{
                    count: MOCK_STATS.sharedCount,
                    savings: '18,86\u20AC',
                  }}
                />
              </ScrollBlurItem>
            </StaggeredItem>

            {/* Upcoming Renewals */}
            <StaggeredItem index={2}>
              <ScrollBlurItem
                scrollY={scrollY}
                viewportHeight={SCREEN_HEIGHT}
              >
                <Card>
                  <CardHeader
                    title="Pr\u00F3ximas renovaciones"
                    action={calendarAction}
                  />
                  <UpcomingRenewals renewals={MOCK_RENEWALS} />
                </Card>
              </ScrollBlurItem>
            </StaggeredItem>

            {/* Top Categories */}
            <StaggeredItem index={3}>
              <ScrollBlurItem
                scrollY={scrollY}
                viewportHeight={SCREEN_HEIGHT}
              >
                <Card>
                  <CardHeader title="Categor\u00EDas con m\u00E1s gasto" />
                  <TopCategories
                    categories={MOCK_CATEGORIES}
                    currency={MOCK_STATS.currency}
                  />
                </Card>
              </ScrollBlurItem>
            </StaggeredItem>

            {/* Most Expensive */}
            <StaggeredItem index={4}>
              <ScrollBlurItem
                scrollY={scrollY}
                viewportHeight={SCREEN_HEIGHT}
              >
                <View>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                    Suscripciones m{'\u00E1'}s caras
                  </Text>
                  <TopExpensive subscriptions={MOCK_TOP_EXPENSIVE} />
                </View>
              </ScrollBlurItem>
            </StaggeredItem>
          </Animated.View>
        </Animated.ScrollView>
      </GestureDetector>
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
    gap: 8, // base gap (overridden by elastic pull animated style)
  },
  sectionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize[17],
    lineHeight: fontSize[17] * lineHeight.tight,
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
