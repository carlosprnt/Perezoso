// Dashboard: TopCategories
// Replicates web's TopCategoriesSection.tsx
//   Segmented color bar (h-12, 3px gaps, flex-grow by pct)
//   Category legend rows (dot + name + % + amount)
//
// The primary (top) category is always yellow (#FEF08A).
// Other segments use their category color from the design tokens.
//
// Interactive: tap a segment or bullet to highlight. Others dim to 0.35.
// Tap the same one again (or outside) to clear selection.
//
// Mount animation: bar scales in from left (scaleX 0->1, 0.5s standard curve)

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../design/useTheme';
import { fontFamily, fontSize, lineHeight } from '../../design/typography';
import { radius } from '../../design/radius';
import { categoryColors } from '../../design/colors';
import { currencyToSymbol } from '../../lib/formatting';
import { standard } from '../../motion/easing';
import { useT } from '../../lib/i18n/LocaleProvider';
import type { CategoryRow } from './types';

interface TopCategoriesProps {
  categories: CategoryRow[];
  currency?: string;
}

const CATEGORY_KEYS: Record<string, string> = {
  streaming: 'category.streaming',
  music: 'category.music',
  productivity: 'category.productivity',
  cloud: 'category.cloud',
  ai: 'category.ai',
  health: 'category.health',
  gaming: 'category.gaming',
  education: 'category.education',
  mobility: 'category.mobility',
  home: 'category.home',
  other: 'category.rest',
};

/** Color used on bar segment (primary is always yellow #FEF08A) */
function getBarColor(category: string, isPrimary: boolean): string {
  if (isPrimary) return '#FEF08A';
  return (categoryColors as Record<string, string>)[category] ?? categoryColors.other;
}

/** Color used on the legend bullet — matches the bar color so the
 *  primary row's dot is yellow (same as the primary bar segment). */
function getBulletColor(category: string, isPrimary: boolean): string {
  if (isPrimary) return '#FEF08A';
  return (categoryColors as Record<string, string>)[category] ?? categoryColors.other;
}

/** 50% alpha version of a hex color — for active bullet row background */
function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function formatAmount(amount: number, currency: string): string {
  const num = amount % 1 === 0
    ? amount.toFixed(0)
    : amount.toFixed(2).replace('.', ',');
  return `${num}${currencyToSymbol(currency)}`;
}

export function TopCategories({ categories, currency = 'EUR' }: TopCategoriesProps) {
  const { colors } = useTheme();
  const t = useT();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Bar mount animation: scaleX 0 -> 1, 500ms, standard easing
  const barScale = useSharedValue(0);

  useEffect(() => {
    barScale.value = withTiming(1, { duration: 500, easing: standard });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const barAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: barScale.value }],
  }));

  if (categories.length === 0) return null;

  const toggleActive = (i: number) => {
    setActiveIndex((prev) => (prev === i ? null : i));
  };

  return (
    <View>
      {/* Segmented bar with scale-in animation */}
      <Animated.View style={[styles.bar, styles.barOriginLeft, barAnimatedStyle]}>
        {categories.map((cat, i) => {
          const dimmed = activeIndex !== null && activeIndex !== i;
          return (
            <Pressable
              key={cat.category}
              onPress={() => toggleActive(i)}
              style={[
                styles.segment,
                {
                  flexGrow: cat.pct,
                  backgroundColor: getBarColor(cat.category, i === 0),
                  opacity: dimmed ? 0.35 : 1,
                },
              ]}
            />
          );
        })}
      </Animated.View>

      {/* Legend */}
      <View style={styles.legend}>
        {categories.map((cat, i) => {
          const active = activeIndex === i;
          const dimmed = activeIndex !== null && !active;
          const bulletColor = getBulletColor(cat.category, i === 0);
          return (
            <Pressable
              key={cat.category}
              onPress={() => toggleActive(i)}
              style={[
                styles.legendRow,
                {
                  backgroundColor: active ? withAlpha(bulletColor, 0.5) : 'transparent',
                  opacity: dimmed ? 0.45 : 1,
                },
              ]}
            >
              {/* Color dot */}
              <View
                style={[
                  styles.dot,
                  { backgroundColor: bulletColor },
                ]}
              />

              {/* Name */}
              <Text
                style={[styles.catName, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {CATEGORY_KEYS[cat.category] ? t(CATEGORY_KEYS[cat.category]) : cat.category}
              </Text>

              {/* Percentage */}
              <Text style={styles.catPct}>{Math.round(cat.pct)}%</Text>

              {/* Amount */}
              <Text style={[styles.catAmount, { color: colors.textPrimary }]}>
                {formatAmount(cat.monthlyCost, currency)}
              </Text>
            </Pressable>
          );
        })}
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
  barOriginLeft: {
    transformOrigin: 'left center',
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
    borderRadius: radius.full,
    flexShrink: 0,
  },
  catName: {
    flex: 1,
    ...fontFamily.regular,
    fontSize: fontSize[15],
    lineHeight: fontSize[15] * lineHeight.snug,
  },
  catPct: {
    ...fontFamily.regular,
    fontSize: fontSize[15],
    color: '#8E8E93',
    flexShrink: 0,
  },
  catAmount: {
    ...fontFamily.medium,
    fontSize: fontSize[15],
    lineHeight: fontSize[15] * lineHeight.snug,
    flexShrink: 0,
    fontVariant: ['tabular-nums'],
  },
});
