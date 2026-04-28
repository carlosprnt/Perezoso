// Dashboard: TopExpensive
// Replicates web's TopExpensiveSection.tsx
// Horizontal scroll of ranked subscription cards.
//
// Each card: w-[185px] rounded-[32px] p-4
//   #i+1 rank label (11px bold gray uppercase)
//   Avatar (md, rounded-[8px])
//   Name (14px bold)
//   Price (15px bold + /mo 12px gray)

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../design/useTheme';
import { fontFamily, fontSize, lineHeight, letterSpacing } from '../../design/typography';
import { radius } from '../../design/radius';
import { SubscriptionAvatar } from '../../components/SubscriptionAvatar';
import { Pressable } from '../../components/Pressable';
import { currencyToSymbol, currencyCodeFromLabel } from '../../lib/formatting';
import { usePreferencesStore } from '../settings/useSettingsStore';
import type { TopSubscription } from './types';
import { useSubscriptionDetailStore } from '../subscription-detail/useSubscriptionDetailStore';
import { useSubscriptionsStore } from '../../stores/subscriptionsStore';

interface TopExpensiveProps {
  subscriptions: TopSubscription[];
}

function formatCost(amount: number, currency: string): string {
  const num = amount % 1 === 0
    ? amount.toFixed(0)
    : amount.toFixed(2).replace('.', ',');
  return `${num}${currencyToSymbol(currency)}`;
}

export function TopExpensive({ subscriptions }: TopExpensiveProps) {
  const { colors } = useTheme();
  const openDetail = useSubscriptionDetailStore((s) => s.openDetail);
  const fullList = useSubscriptionsStore((s) => s.subscriptions);
  const globalCurrency = currencyCodeFromLabel(usePreferencesStore((s) => s.currency));

  if (subscriptions.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      snapToInterval={185 + 12} // card width + gap
      decelerationRate="fast"
    >
      {subscriptions.map((sub, i) => (
        <Pressable
          key={sub.id}
          accessibilityLabel={sub.name}
          onPress={() => {
            const full = fullList.find((s) => s.id === sub.id);
            if (full) openDetail(full);
          }}
        >
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            {/* Rank */}
            <Text style={styles.rank}>#{i + 1}</Text>

            {/* Avatar — 56x56 rounded 24px for a more prominent card */}
            <View style={styles.avatarWrap}>
              <SubscriptionAvatar
                name={sub.name}
                simpleIconSlug={sub.simpleIconSlug}
                logoUrl={sub.logoUrl}
                size="lg"
                cornerRadius={24}
              />
            </View>

            {/* Name */}
            <Text
              style={[styles.name, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {sub.name}
            </Text>

            {/* Price */}
            <View style={styles.priceRow}>
              <Text style={[styles.price, { color: colors.textPrimary }]}>
                {formatCost(sub.monthlyCost, globalCurrency)}
              </Text>
              <Text style={[styles.period, { color: colors.textMuted }]}>
                {' '}/mo
              </Text>
            </View>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: 12, // gap-3
    paddingRight: 20, // extra space at end
  },
  card: {
    width: 185,
    borderRadius: radius.card, // 32px
    padding: 16, // p-4
  },
  rank: {
    ...fontFamily.medium,
    fontSize: fontSize[11],
    color: '#B0B0B0',
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.widest,
  },
  avatarWrap: {
    marginTop: 8, // mt-2
    marginBottom: 12, // mb-3
  },
  name: {
    ...fontFamily.medium,
    fontSize: fontSize[20],
    lineHeight: fontSize[20] * lineHeight.snug,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 6, // mt-1.5
  },
  price: {
    ...fontFamily.medium,
    fontSize: fontSize[15],
    fontVariant: ['tabular-nums'],
  },
  period: {
    ...fontFamily.regular,
    fontSize: fontSize[14],
  },
});
