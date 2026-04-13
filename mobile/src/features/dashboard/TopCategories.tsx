// Dashboard: TopCategories
// Replicates web's TopCategoriesSection.tsx
//   Segmented color bar (h-12, 3px gaps, flex-grow by pct)
//   Category legend rows (dot + name + % + amount)
//
// The primary (top) category is always yellow (#FEF08A).
// Other segments use their category color from the design tokens.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../design/useTheme';
import { fontFamily, fontSize, lineHeight } from '../../design/typography';
import { radius } from '../../design/radius';
import { categoryColors } from '../../design/colors';
import type { CategoryRow } from './types';

interface TopCategoriesProps {
  categories: CategoryRow[];
  currency?: string;
}

// Category display names
const CATEGORY_NAMES: Record<string, string> = {
  streaming: 'Streaming',
  music: 'Música',
  productivity: 'Productividad',
  cloud: 'Cloud',
  ai: 'IA',
  health: 'Salud',
  gaming: 'Gaming',
  education: 'Educación',
  mobility: 'Movilidad',
  home: 'Hogar',
  other: 'Resto',
};

function getCategoryColor(category: string, isPrimary: boolean): string {
  if (isPrimary) return '#FEF08A'; // Primary always yellow
  return (categoryColors as Record<string, string>)[category] ?? categoryColors.other;
}

function formatAmount(amount: number, currency: string): string {
  const num = amount % 1 === 0
    ? amount.toFixed(0)
    : amount.toFixed(2).replace('.', ',');
  return currency === 'US$' ? `${num}US$` : `${num}€`;
}

export function TopCategories({ categories, currency = 'EUR' }: TopCategoriesProps) {
  const { colors } = useTheme();

  if (categories.length === 0) return null;

  return (
    <View>
      {/* Segmented bar */}
      <View style={styles.bar}>
        {categories.map((cat, i) => (
          <View
            key={cat.category}
            style={[
              styles.segment,
              {
                flexGrow: cat.pct,
                backgroundColor: getCategoryColor(cat.category, i === 0),
              },
            ]}
          />
        ))}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {categories.map((cat) => (
          <View key={cat.category} style={styles.legendRow}>
            {/* Color dot */}
            <View
              style={[
                styles.dot,
                {
                  backgroundColor:
                    (categoryColors as Record<string, string>)[cat.category] ??
                    categoryColors.other,
                },
              ]}
            />

            {/* Name */}
            <Text
              style={[styles.catName, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {CATEGORY_NAMES[cat.category] ?? cat.category}
            </Text>

            {/* Percentage */}
            <Text style={styles.catPct}>{Math.round(cat.pct)}%</Text>

            {/* Amount */}
            <Text style={[styles.catAmount, { color: colors.textPrimary }]}>
              {formatAmount(cat.monthlyCost, currency)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    height: 48, // h-12
    gap: 3,
    marginBottom: 16, // mb-4
  },
  segment: {
    borderRadius: radius.xl, // 12px
    flexShrink: 0,
    flexBasis: 0,
    minWidth: 8,
  },
  legend: {
    gap: 2, // space-y-0.5
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10, // gap-2.5
    borderRadius: radius.xl,
    paddingHorizontal: 10, // px-2.5
    paddingVertical: 6, // py-1.5
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 9999,
    flexShrink: 0,
  },
  catName: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize[13],
    lineHeight: fontSize[13] * lineHeight.snug,
  },
  catPct: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize[11],
    color: '#8E8E93',
    flexShrink: 0,
  },
  catAmount: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize[13],
    lineHeight: fontSize[13] * lineHeight.snug,
    flexShrink: 0,
    fontVariant: ['tabular-nums'],
  },
});
