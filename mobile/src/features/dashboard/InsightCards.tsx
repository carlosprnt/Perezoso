// Dashboard: InsightCards (Quick Stats Row)
// Replicates web's Insights.tsx — three stacked insight cards:
//   1. Highest cost subscription
//   2. Top category
//   3. Shared plans
//
// Each card: rounded-[32px] bg-white px-4 py-3, flex row, gap-3
//   [Icon 40x40 rounded-2xl] [Label 12px gray + Title 17px bold] [Right: amount/label]

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../design/useTheme';
import { fontFamily, fontSize, lineHeight } from '../../design/typography';
import { radius } from '../../design/radius';
import { Pressable } from '../../components/Pressable';

interface InsightCellProps {
  iconBg: string;
  iconContent: React.ReactNode;
  label: string;
  title: string;
  rightTop?: string;
  rightBottom?: string;
  onPress?: () => void;
}

function InsightCell({
  iconBg,
  iconContent,
  label,
  title,
  rightTop,
  rightBottom,
  onPress,
}: InsightCellProps) {
  const { colors } = useTheme();

  const content = (
    <View style={[styles.cell, { backgroundColor: colors.surface }]}>
      {/* Icon */}
      <View style={[styles.icon, { backgroundColor: iconBg }]}>
        {iconContent}
      </View>

      {/* Label + Title */}
      <View style={styles.info}>
        <Text style={[styles.label, { color: colors.textMuted }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {/* Right */}
      {(rightTop || rightBottom) ? (
        <View style={styles.right}>
          {rightTop ? (
            <Text style={[styles.rightTop, { color: colors.textPrimary }]} numberOfLines={1}>
              {rightTop}
            </Text>
          ) : null}
          {rightBottom ? (
            <Text style={[styles.rightBottom, { color: colors.textMuted }]} numberOfLines={1}>
              {rightBottom}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  return content;
}

// ─── Composed InsightCards ──────────────────────────────────────────

interface InsightCardsProps {
  highestCost?: {
    name: string;
    amount: string;
    category: string;
  };
  topCategory?: {
    name: string;
    amount: string;
    count: number;
  };
  sharedPlans?: {
    count: number;
    savings?: string;
  };
}

export function InsightCards({ highestCost, topCategory, sharedPlans }: InsightCardsProps) {
  const { isDark } = useTheme();
  const iconBgDefault = isDark ? '#2C2C2E' : '#F5F5F5';

  return (
    <View style={styles.container}>
      {/* Highest Cost */}
      {highestCost ? (
        <InsightCell
          iconBg={iconBgDefault}
          iconContent={
            <Text style={styles.iconEmoji}>📈</Text>
          }
          label="Mayor gasto"
          title={highestCost.name}
          rightTop={highestCost.amount}
          rightBottom={highestCost.category}
        />
      ) : null}

      {/* Top Category */}
      {topCategory ? (
        <InsightCell
          iconBg={isDark ? '#2C2C2E' : '#DDD6FE'}
          iconContent={
            <Text style={styles.iconEmoji}>🧠</Text>
          }
          label="Categoría principal"
          title={topCategory.name}
          rightTop={topCategory.amount}
          rightBottom={`${topCategory.count} suscr.`}
        />
      ) : null}

      {/* Shared Plans */}
      {sharedPlans ? (
        <InsightCell
          iconBg={iconBgDefault}
          iconContent={
            <Text style={styles.iconEmoji}>👥</Text>
          }
          label="Planes compartidos"
          title={sharedPlans.count > 0 ? `${sharedPlans.count} planes` : 'No planes'}
          rightTop={sharedPlans.savings}
          rightBottom={sharedPlans.savings ? '/mes' : undefined}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8, // gap-2
  },
  cell: {
    borderRadius: radius.card, // 32px
    paddingHorizontal: 16, // px-4
    paddingVertical: 12, // py-3
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12, // gap-3
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius['3xl'], // 16px = rounded-2xl
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconEmoji: {
    fontSize: 20,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize[12],
    lineHeight: fontSize[12] * lineHeight.snug,
    marginBottom: 2, // mb-0.5
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize[17],
    lineHeight: fontSize[17] * lineHeight.snug,
  },
  right: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  rightTop: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize[12],
    lineHeight: fontSize[12] * lineHeight.snug,
  },
  rightBottom: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize[12],
    lineHeight: fontSize[12] * lineHeight.snug,
    marginTop: 2,
  },
});
