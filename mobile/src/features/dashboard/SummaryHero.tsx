// Dashboard: SummaryHero
// Replicates the web app's DashboardSummaryHero:
//   Greeting row (17px bold) + avatar (40px circular, initials fallback)
//   "Al mes gastas" label -> 50px hero amount
//   "Eso al ano es" label -> 50px hero amount
//   Supporting text with inline LogoStack:
//     "Tienes X [logos] suscripciones. Compartes X. Reduces X."
//
// The hero is the first thing the user sees. Its typography hierarchy --
// gray labels, black 50px amounts, 18px bold supporting text -- defines
// the product's visual confidence. Do not normalize these sizes.

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, type GestureResponderEvent } from 'react-native';
import { useTheme } from '../../design/useTheme';
import { fontFamily, fontSize, lineHeight, letterSpacing } from '../../design/typography';
import { getAvatarPastel, getInitials } from '../../components/LogoAvatar';
import { LogoStack } from './LogoStack';
import type { DashboardStats } from './types';

interface SummaryHeroProps {
  firstName: string;
  stats: DashboardStats;
  /** User's full name for avatar initials (defaults to firstName) */
  fullName?: string;
  /** User's avatar URL from profile/Gmail metadata */
  avatarUrl?: string | null;
  /** Logo URLs for the inline LogoStack (all subscriptions) */
  logoUrls?: string[];
  /** Logo URLs for the "Compartes X suscripciones" line — shared subs only */
  sharedLogoUrls?: string[];
  /** Called when user taps the amount numbers — for money confetti */
  onAmountTap?: (x: number, y: number) => void;
  /** Called when user taps "Tienes X suscripciones" — for logo confetti */
  onLogosTap?: (x: number, y: number) => void;
}

function formatAmount(amount: number, currency: string): string {
  // Match web format: 98,26EUR or 1.179,07EUR
  const parts = amount.toFixed(2).split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decPart = parts[1];
  const symbol = currency === 'US$' ? 'US$' : '\u20AC';
  return `${intPart},${decPart}${symbol}`;
}

export function SummaryHero({
  firstName,
  stats,
  fullName,
  avatarUrl,
  logoUrls = [],
  sharedLogoUrls = [],
  onAmountTap,
  onLogosTap,
}: SummaryHeroProps) {
  const { colors, isDark } = useTheme();
  const labelColor = isDark ? '#8E8E93' : '#616161';
  const amountColor = colors.textPrimary;

  // Toggle "Reduces X al mes" <-> "Reduces X al año"
  const [savingsPeriod, setSavingsPeriod] = useState<'monthly' | 'annual'>('monthly');
  const toggleSavingsPeriod = () => {
    setSavingsPeriod((p) => (p === 'monthly' ? 'annual' : 'monthly'));
  };
  const savingsAmount = savingsPeriod === 'monthly'
    ? stats.savingsMonthly
    : stats.savingsMonthly * 12;
  const savingsLabel = savingsPeriod === 'monthly' ? 'tu gasto al mes' : 'tu gasto al a\u00F1o';

  // Avatar: real image or deterministic pastel initials
  const displayName = fullName || firstName;
  const pastel = getAvatarPastel(displayName);

  return (
    <View style={styles.container}>
      {/* Greeting row */}
      <View style={styles.greetingRow}>
        <Text style={[styles.greeting, { color: colors.textPrimary }]}>
          Hola, {firstName}.
        </Text>
        {/* UserAvatarMenu — circular, 40px, initials or image */}
        {avatarUrl ? (
          <View style={[styles.avatar, { borderColor: 'transparent' }]}>
            {/* Image avatar would go here when wired to auth */}
          </View>
        ) : (
          <View style={[styles.avatar, { backgroundColor: pastel.bg }]}>
            <Text style={[styles.avatarText, { color: pastel.fg }]}>
              {getInitials(displayName)}
            </Text>
          </View>
        )}
      </View>

      {/* Main statement — tap to trigger money confetti */}
      <Pressable
        style={styles.statementBlock}
        onPress={(e: GestureResponderEvent) => {
          onAmountTap?.(e.nativeEvent.pageX, e.nativeEvent.pageY);
        }}
      >
        {/* Monthly */}
        <View style={styles.statementRow}>
          <Text style={[styles.label, { color: labelColor }]}>
            Al mes gastas
          </Text>
          <Text
            style={styles.amountRow}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            <Text style={[styles.heroAmount, { color: amountColor }]}>
              {formatAmount(stats.monthlyTotal, stats.currency)}
            </Text>
            <Text style={[styles.heroPeriod, { color: labelColor }]}>.</Text>
          </Text>
        </View>

        {/* Annual */}
        <View style={styles.statementRow}>
          <Text style={[styles.label, { color: labelColor }]}>
            Eso al año es
          </Text>
          <Text
            style={styles.amountRow}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            <Text style={[styles.heroAmount, { color: amountColor }]}>
              {formatAmount(stats.annualTotal, stats.currency)}
            </Text>
            <Text style={[styles.heroPeriod, { color: labelColor }]}>.</Text>
          </Text>
        </View>
      </Pressable>

      {/* Supporting statement with inline LogoStack — tap for logo confetti */}
      <View style={styles.supportBlock}>
        <Pressable
          style={styles.supportLine}
          onPress={(e: GestureResponderEvent) => {
            onLogosTap?.(e.nativeEvent.pageX, e.nativeEvent.pageY);
          }}
        >
          <Text style={[styles.supportText, { color: colors.textPrimary }]}>
            Tienes{' '}
          </Text>
          <Text style={[styles.supportBold, { color: colors.textPrimary }]}>
            {stats.totalCount}
          </Text>
          {logoUrls.length > 0 ? (
            <LogoStack logoUrls={logoUrls} totalCount={stats.totalCount} />
          ) : null}
          <Text style={[styles.supportText, { color: colors.textPrimary }]}>
            {logoUrls.length > 0 ? ' ' : ' '}suscripciones.
          </Text>
        </Pressable>
        {stats.sharedCount > 0 ? (
          <View style={styles.supportLine}>
            <Text style={[styles.supportText, { color: colors.textPrimary }]}>
              Compartes{' '}
            </Text>
            <Text style={[styles.supportBold, { color: colors.textPrimary }]}>
              {stats.sharedCount}
            </Text>
            {sharedLogoUrls.length > 0 ? (
              <LogoStack
                logoUrls={sharedLogoUrls}
                totalCount={stats.sharedCount}
              />
            ) : null}
            <Text style={[styles.supportText, { color: colors.textPrimary }]}>
              {' '}suscripciones.
            </Text>
          </View>
        ) : null}
        {stats.savingsMonthly > 0 ? (
          <Pressable
            style={styles.supportLine}
            onPress={toggleSavingsPeriod}
          >
            <Text style={[styles.supportText, { color: colors.textPrimary }]}>
              Reduces{' '}
            </Text>
            <Text style={[styles.supportBold, { color: colors.textPrimary }]}>
              {formatAmount(savingsAmount, stats.currency)}
            </Text>
            <Text style={[styles.supportText, { color: colors.textPrimary }]}>
              {' '}{savingsLabel}.
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20, // pb-5
    paddingHorizontal: 20,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12, // mb-3
  },
  greeting: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize[17],
    lineHeight: fontSize[17] * lineHeight.snug,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize[14],
  },
  statementBlock: {
    marginBottom: 12, // mb-3
    gap: 6, // consistent spacing between monthly and annual
  },
  statementRow: {
    // Each label + amount pair
  },
  amountRow: {
    // Amount + period on same line
  },
  label: {
    fontFamily: fontFamily.extrabold,
    fontSize: 25,
    lineHeight: 25 * 1.15,
    letterSpacing: letterSpacing.tight,
  },
  heroAmount: {
    fontFamily: fontFamily.extrabold,
    fontSize: fontSize[50],
    lineHeight: fontSize[50] * lineHeight.compact,
    letterSpacing: letterSpacing.tight,
  },
  heroPeriod: {
    fontFamily: fontFamily.extrabold,
    fontSize: fontSize[50],
    lineHeight: fontSize[50] * lineHeight.compact,
  },
  supportBlock: {
    // Container for support lines with inline LogoStack
  },
  supportLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  supportText: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    lineHeight: 18 * 1.6, // leading-relaxed
  },
  supportBold: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    lineHeight: 18 * 1.6,
  },
});
