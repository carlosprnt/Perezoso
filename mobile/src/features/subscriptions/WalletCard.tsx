// Phase 6 — Subscriptions: WalletCard
// Replicates the web app's subscription card in the wallet stack:
//   Logo (48px) + Name/Category + Price + Status badge
//   Billing progress bar + days until renewal
//   Rounded card (32px radius), theme-aware
//
// On tap: navigates to subscription detail (Phase 9)

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Lock } from 'lucide-react-native';
import { useTheme } from '../../design/useTheme';
import { fontFamily, fontSize, lineHeight } from '../../design/typography';
import { radius } from '../../design/radius';
import { shadows } from '../../design/shadows';
import { LogoAvatar } from '../../components/LogoAvatar';
import { Pressable } from '../../components/Pressable';
import { haptic } from '../../lib/haptics';
import { formatPrice, billingLabel, daysUntilDate, renewalText, formatBillingDate } from '../../lib/formatting';
import type { Subscription } from './types';
import { CATEGORY_LABELS, STATUS_LABELS } from './types';

interface WalletCardProps {
  subscription: Subscription;
  onPress?: () => void;
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

  const statusColor = ({
    active: colors.statusActive,
    trial: colors.statusTrial,
    paused: colors.statusPaused,
    cancelled: colors.statusCancelled,
    ended: colors.statusCancelled,
  } as Record<string, string>)[sub.status];

  const progressBarBg = isDark ? '#2C2C2E' : '#F0F0F0';
  const progressBarFill = isDark ? '#4ADE80' : '#16A34A';

  return (
    <Pressable
      onPress={() => { haptic.selection(); onPress?.(); }}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderLight,
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
              {CATEGORY_LABELS[sub.category] ?? sub.category}
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
            {formatPrice(
              sub.is_shared && sub.shared_with_count > 1
                ? sub.price_amount / sub.shared_with_count
                : sub.price_amount,
              sub.currency,
            )}
          </Text>
          <Text style={[styles.period, { color: colors.textMuted }]}>
            {billingLabel(sub.billing_period)}
          </Text>
        </View>
      </View>

      {/* Bottom row: progress bar + renewal info + status */}
      <View style={styles.bottomRow}>
        <View style={styles.progressSection}>
          <View style={styles.renewalRow}>
            <Text style={[styles.renewalLabel, { color: colors.textMuted }]}>
              Siguiente cobro
            </Text>
            <Text style={[styles.renewalLabel, { color: colors.textMuted }]}>
              {formatBillingDate(sub.next_billing_date)}
            </Text>
          </View>
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
          <Text style={[styles.renewalLabel, { color: colors.textMuted }]}>
            {renewalText(days)}
          </Text>
        </View>

        {/* Status dot + label — hidden for 'active' (noise); shown for others */}
        {sub.status !== 'active' && (
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusLabel, { color: statusColor }]}>
              {STATUS_LABELS[sub.status]}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export const FREE_SUBSCRIPTION_LIMIT = 15;

interface LockedWalletCardProps {
  subscription: Subscription;
  onPress?: () => void;
}

export function LockedWalletCard({ subscription: sub, onPress }: LockedWalletCardProps) {
  const { colors, isDark } = useTheme();

  return (
    <Pressable
      onPress={() => { haptic.selection(); onPress?.(); }}
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#1C1C1E' : '#F8F8FA',
          borderColor: isDark ? '#2C2C2E' : '#E8E8E8',
        },
        shadows.cardSm,
      ]}
    >
      <View style={styles.topRow}>
        <View style={lockedStyles.avatarWrap}>
          <LogoAvatar name={sub.name} logoUrl={sub.logo_url} size="lg" />
          <View style={[lockedStyles.avatarOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)' }]} />
        </View>
        <View style={styles.info}>
          <Text
            style={[styles.name, { color: isDark ? '#48484A' : '#AEAEB2' }]}
            numberOfLines={1}
          >
            {sub.name}
          </Text>
          <Text style={[styles.category, { color: isDark ? '#3A3A3C' : '#C7C7CC' }]}>
            Suscripción bloqueada
          </Text>
        </View>
        <Lock size={18} color={isDark ? '#48484A' : '#AEAEB2'} strokeWidth={2.2} />
      </View>
      <View style={lockedStyles.ctaRow}>
        <Text style={[lockedStyles.ctaText, { color: isDark ? '#8E8E93' : '#6B6B6B' }]}>
          Hazte Pro para desbloquear
        </Text>
      </View>
    </Pressable>
  );
}

const lockedStyles = StyleSheet.create({
  avatarWrap: {
    position: 'relative',
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.full,
  },
  ctaRow: {
    alignItems: 'center',
    paddingVertical: 2,
  },
  ctaText: {
    ...fontFamily.medium,
    fontSize: fontSize[13],
  },
});

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card, // 32px
    padding: 20,
    gap: 16,
    borderWidth: 1,
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
  renewalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  renewalLabel: {
    ...fontFamily.medium,
    fontSize: fontSize[13],
    lineHeight: fontSize[13] * lineHeight.snug,
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
