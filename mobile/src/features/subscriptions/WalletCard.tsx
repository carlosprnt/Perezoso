// Phase 6 — Subscriptions: WalletCard
// Replicates the web app's subscription card in the wallet stack:
//   Logo (48px) + Name/Category + Price + Status badge
//   Billing progress bar + days until renewal
//   Rounded card (32px radius), theme-aware
//
// On tap: navigates to subscription detail (Phase 9)

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../design/useTheme';
import { fontFamily, fontSize, lineHeight, letterSpacing } from '../../design/typography';
import { radius } from '../../design/radius';
import { shadows } from '../../design/shadows';
import { LogoAvatar } from '../../components/LogoAvatar';
import { Pressable } from '../../components/Pressable';
import type { Subscription } from './types';
import { CATEGORY_LABELS, STATUS_LABELS } from './types';

interface WalletCardProps {
  subscription: Subscription;
  onPress?: () => void;
}

function formatPrice(amount: number, currency: string): string {
  const parts = amount.toFixed(2).split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decPart = parts[1];
  const symbol = currency === 'US$' ? 'US$' : '\u20AC';
  return `${intPart},${decPart}${symbol}`;
}

function billingLabel(period: string): string {
  switch (period) {
    case 'monthly': return '/mes';
    case 'yearly': return '/año';
    case 'quarterly': return '/trimestre';
    case 'weekly': return '/semana';
    default: return '';
  }
}

function daysUntilDate(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / 86400000));
}

function renewalText(days: number): string {
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Mañana';
  return `En ${days} días`;
}

/** Billing progress: fraction of the billing cycle elapsed */
function billingProgress(period: string, intervalCount: number, nextDate: string): number {
  const periodDays: Record<string, number> = {
    weekly: 7,
    monthly: 30,
    quarterly: 90,
    yearly: 365,
  };
  const totalDays = (periodDays[period] ?? 30) * intervalCount;
  const daysLeft = daysUntilDate(nextDate);
  const elapsed = totalDays - daysLeft;
  return Math.max(0, Math.min(1, elapsed / totalDays));
}

export function WalletCard({ subscription: sub, onPress }: WalletCardProps) {
  const { colors, isDark } = useTheme();
  const days = daysUntilDate(sub.next_billing_date);
  const progress = billingProgress(sub.billing_period, sub.billing_interval_count, sub.next_billing_date);

  const statusColor = {
    active: colors.statusActive,
    trial: colors.statusTrial,
    paused: colors.statusPaused,
    cancelled: colors.statusCancelled,
  }[sub.status];

  const progressBarBg = isDark ? '#2C2C2E' : '#F0F0F0';
  const progressBarFill = isDark ? '#636366' : '#D4D4D4';

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
        },
        shadows.cardSm,
      ]}
    >
      {/* Top row: logo + info + price */}
      <View style={styles.topRow}>
        <LogoAvatar name={sub.name} logoUrl={sub.logo_url} size="lg" />

        <View style={styles.info}>
          <Text
            style={[styles.name, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {sub.name}
          </Text>
          <View style={styles.metaRow}>
            <Text style={[styles.category, { color: colors.textMuted }]}>
              {CATEGORY_LABELS[sub.category]}
            </Text>
            {sub.is_shared && (
              <Text style={[styles.shared, { color: colors.textMuted }]}>
                {' '}· Compartida
              </Text>
            )}
          </View>
        </View>

        <View style={styles.priceBlock}>
          <Text style={[styles.price, { color: colors.textPrimary }]}>
            {formatPrice(sub.my_monthly_cost, sub.currency)}
          </Text>
          <Text style={[styles.period, { color: colors.textMuted }]}>
            {billingLabel(sub.billing_period)}
          </Text>
        </View>
      </View>

      {/* Bottom row: progress bar + renewal info + status */}
      <View style={styles.bottomRow}>
        <View style={styles.progressSection}>
          <View style={[styles.progressBar, { backgroundColor: progressBarBg }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: progressBarFill,
                  width: `${progress * 100}%` as any,
                },
              ]}
            />
          </View>
          <Text style={[styles.renewalText, { color: colors.textMuted }]}>
            {renewalText(days)}
          </Text>
        </View>

        {/* Status dot + label */}
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusLabel, { color: statusColor }]}>
            {STATUS_LABELS[sub.status]}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card, // 32px
    padding: 20,
    gap: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...fontFamily.bold,
    fontSize: fontSize[15],
    lineHeight: fontSize[15] * lineHeight.tight,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  category: {
    ...fontFamily.medium,
    fontSize: fontSize[15],
    lineHeight: fontSize[15] * lineHeight.snug,
  },
  shared: {
    ...fontFamily.medium,
    fontSize: fontSize[15],
    lineHeight: fontSize[15] * lineHeight.snug,
  },
  priceBlock: {
    alignItems: 'flex-end',
  },
  price: {
    ...fontFamily.bold,
    fontSize: fontSize[15],
    lineHeight: fontSize[15] * lineHeight.tight,
  },
  period: {
    ...fontFamily.medium,
    fontSize: fontSize[15],
    lineHeight: fontSize[15] * lineHeight.snug,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  progressSection: {
    flex: 1,
    gap: 4,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  renewalText: {
    ...fontFamily.medium,
    fontSize: fontSize[15],
    lineHeight: fontSize[15] * lineHeight.snug,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    ...fontFamily.semibold,
    fontSize: fontSize[15],
    lineHeight: fontSize[15] * lineHeight.snug,
  },
});
