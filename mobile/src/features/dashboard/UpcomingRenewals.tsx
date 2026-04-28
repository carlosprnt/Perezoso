// Dashboard: UpcomingRenewals
// Replicates web's UpcomingRenewals.tsx
// Shows top 3 upcoming subscription renewals inside a Card.
//
// Each item: [Avatar sm40 rounded-[8px]] [Name 17px bold + Price 12px gray] [Days 14px gray right]
// Spacing: space-y-3.5 between items

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../design/useTheme';
import { fontFamily, fontSize, lineHeight } from '../../design/typography';
import { SubscriptionAvatar } from '../../components/SubscriptionAvatar';
import { Pressable } from '../../components/Pressable';
import { useT } from '../../lib/i18n/LocaleProvider';
import { currencyToSymbol, currencyCodeFromLabel } from '../../lib/formatting';
import { usePreferencesStore } from '../settings/useSettingsStore';
import type { UpcomingRenewal } from './types';
import { useSubscriptionDetailStore } from '../subscription-detail/useSubscriptionDetailStore';
import { useSubscriptionsStore } from '../../stores/subscriptionsStore';

interface UpcomingRenewalsProps {
  renewals: UpcomingRenewal[];
}

function formatDays(days: number, t: (k: string, o?: any) => string): string {
  if (days === 0) return t('dashboard.renewals.today');
  return t('dashboard.renewals.inDays', { count: days });
}

function formatPrice(amount: number, currency: string): string {
  let formatted = amount.toFixed(2).replace('.', ',');
  if (formatted.endsWith(',00')) formatted = formatted.slice(0, -3);
  return `${formatted}${currencyToSymbol(currency)}`;
}

function formatCost(amount: number, currency: string): string {
  const num = amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2).replace('.', ',');
  return `${num}${currencyToSymbol(currency)} /mes`;
}

export function UpcomingRenewals({ renewals }: UpcomingRenewalsProps) {
  const { colors } = useTheme();
  const t = useT();
  const openDetail = useSubscriptionDetailStore((s) => s.openDetail);
  const fullList = useSubscriptionsStore((s) => s.subscriptions);
  const globalCurrency = currencyCodeFromLabel(usePreferencesStore((s) => s.currency));

  if (renewals.length === 0) {
    return (
      <Text style={[styles.empty, { color: colors.textMuted }]}>
        {t('dashboard.renewals.empty')}
      </Text>
    );
  }

  return (
    <View style={styles.list}>
      {renewals.map((renewal, index) => (
        <Pressable
          key={renewal.id}
          accessibilityLabel={renewal.name}
          onPress={() => {
            const full = fullList.find((s) => s.id === renewal.id);
            if (full) openDetail(full);
          }}
        >
          <View style={styles.row}>
            {/* Avatar — 44x44 rounded-2xl (16px), matches InsightCards icon */}
            <SubscriptionAvatar
              name={renewal.name}
              simpleIconSlug={renewal.simpleIconSlug}
              logoUrl={renewal.logoUrl}
              size="md"
              cornerRadius={16}
            />

            {/* Info */}
            <View style={styles.info}>
              <Text
                style={[styles.name, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {renewal.name}
              </Text>
              <Text style={[styles.price, { color: colors.textMuted }]}>
                {formatCost(renewal.monthlyCost, globalCurrency)}
              </Text>
            </View>

            {/* Days */}
            <Text style={[styles.days, { color: colors.textMuted }]}>
              {formatDays(renewal.daysUntilRenewal, t)}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 14, // space-y-3.5
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12, // gap-3
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    ...fontFamily.medium,
    fontSize: fontSize[18],
    lineHeight: fontSize[18] * lineHeight.snug,
  },
  price: {
    ...fontFamily.regular,
    fontSize: fontSize[14],
    lineHeight: fontSize[14] * lineHeight.snug,
    marginTop: 2, // mt-0.5
  },
  days: {
    ...fontFamily.regular,
    fontSize: fontSize[14],
    lineHeight: fontSize[14] * lineHeight.snug,
    flexShrink: 0,
    textAlign: 'right',
  },
  empty: {
    ...fontFamily.regular,
    fontSize: fontSize[14],
    paddingVertical: 8,
  },
});
