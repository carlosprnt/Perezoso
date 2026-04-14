// Dashboard: InsightCards (Quick Stats Row)
// Replicates web's Insights.tsx -- three stacked insight cards:
//   1. Highest cost subscription (TrendingUp icon)
//   2. Top category (dynamic category icon)
//   3. Shared plans (Users icon)
//
// Each card: rounded-[32px] bg-white px-4 py-3, flex row, gap-3
//   [Icon 40x40 rounded-2xl] [Label 12px gray + Title 17px bold] [Right: amount/label]

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp, Users, Bot } from 'lucide-react-native';
import { useTheme } from '../../design/useTheme';
import { fontFamily, fontSize, lineHeight } from '../../design/typography';
import { radius } from '../../design/radius';
import { Pressable } from '../../components/Pressable';

interface InsightCellProps {
  iconBg: string;
  iconColor: string;
  IconComponent: React.ComponentType<{ size: number; strokeWidth: number; color: string }>;
  label: string;
  title: string;
  rightTop?: string;
  rightBottom?: string;
  onPress?: () => void;
}

function InsightCell({
  iconBg,
  iconColor,
  IconComponent,
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
        <IconComponent size={20} strokeWidth={2} color={iconColor} />
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

// --- Composed InsightCards ---

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
  const defaultIconBg = isDark ? '#2C2C2E' : '#F5F5F5';
  const defaultIconColor = isDark ? '#F2F2F7' : '#000000';
  // Category icon: purple bg matching web's ai category
  const categoryIconBg = isDark ? '#2C2C2E' : '#DDD6FE';
  const categoryIconColor = isDark ? '#F2F2F7' : '#4C1D95';
  const sharedIconColor = isDark ? '#E5E5EA' : '#000000';

  return (
    <View style={styles.container}>
      {/* Highest Cost */}
      {highestCost ? (
        <InsightCell
          iconBg={defaultIconBg}
          iconColor={defaultIconColor}
          IconComponent={TrendingUp}
          label="Mayor gasto"
          title={highestCost.name}
          rightTop={highestCost.amount}
          rightBottom={highestCost.category}
        />
      ) : null}

      {/* Top Category */}
      {topCategory ? (
        <InsightCell
          iconBg={categoryIconBg}
          iconColor={categoryIconColor}
          IconComponent={Bot}
          label="Categoría principal"
          title={topCategory.name}
          rightTop={topCategory.amount}
          rightBottom={`${topCategory.count} suscr.`}
        />
      ) : null}

      {/* Shared Plans */}
      {sharedPlans ? (
        <InsightCell
          iconBg={defaultIconBg}
          iconColor={sharedIconColor}
          IconComponent={Users}
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
    width: 44,
    height: 44,
    borderRadius: radius['3xl'], // 16px = rounded-2xl
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize[14],
    lineHeight: fontSize[14] * lineHeight.snug,
    marginBottom: 2, // mb-0.5
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize[18],
    lineHeight: fontSize[18] * lineHeight.snug,
  },
  right: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  rightTop: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize[14],
    lineHeight: fontSize[14] * lineHeight.snug,
  },
  rightBottom: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize[14],
    lineHeight: fontSize[14] * lineHeight.snug,
    marginTop: 2,
  },
});
