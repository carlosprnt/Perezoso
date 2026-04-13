// Dashboard: SummaryHero
// Replicates the web app's DashboardSummaryHero:
//   Greeting row (17px bold) + avatar
//   "Al mes gastas" label → 50px hero amount
//   "Eso al año es" label → 50px hero amount
//   Supporting text: "Tienes X suscripciones. Compartes X. Reduces X€."
//
// The hero is the first thing the user sees. Its typography hierarchy —
// gray labels, black 50px amounts, 18px bold supporting text — defines
// the product's visual confidence. Do not normalize these sizes.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../design/useTheme';
import { fontFamily, fontSize, lineHeight, letterSpacing } from '../../design/typography';
import type { DashboardStats } from './types';

interface SummaryHeroProps {
  firstName: string;
  stats: DashboardStats;
}

function formatAmount(amount: number, currency: string): string {
  // Match web format: 98,26€ or 1.179,07€
  const parts = amount.toFixed(2).split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decPart = parts[1];
  const symbol = currency === 'US$' ? 'US$' : '€';
  return `${intPart},${decPart}${symbol}`;
}

export function SummaryHero({ firstName, stats }: SummaryHeroProps) {
  const { colors, isDark } = useTheme();
  const labelColor = isDark ? '#8E8E93' : '#616161';
  const amountColor = colors.textPrimary;

  return (
    <View style={styles.container}>
      {/* Greeting row */}
      <View style={styles.greetingRow}>
        <Text style={[styles.greeting, { color: colors.textPrimary }]}>
          Hola, {firstName}.
        </Text>
        {/* Avatar placeholder — will be wired to UserAvatarMenu later */}
        <View style={[styles.avatarPlaceholder, {
          backgroundColor: isDark ? '#2C2C2E' : '#F0F0F0',
        }]} />
      </View>

      {/* Main statement */}
      <Text style={styles.statementBlock}>
        {/* Monthly */}
        <Text style={[styles.label, { color: labelColor }]}>
          Al mes gastas{'\n'}
        </Text>
        <Text style={[styles.heroAmount, { color: amountColor }]}>
          {formatAmount(stats.monthlyTotal, stats.currency)}
        </Text>
        <Text style={[styles.heroPeriod, { color: labelColor }]}>.</Text>
        {'\n'}

        {/* Annual */}
        <Text style={[styles.label, { color: labelColor }]}>
          Eso al año es{'\n'}
        </Text>
        <Text style={[styles.heroAmount, { color: amountColor }]}>
          {formatAmount(stats.annualTotal, stats.currency)}
        </Text>
        <Text style={[styles.heroPeriod, { color: labelColor }]}>.</Text>
      </Text>

      {/* Supporting statement */}
      <Text style={styles.supportBlock}>
        <Text style={[styles.supportText, { color: colors.textPrimary }]}>
          Tienes{' '}
        </Text>
        <Text style={[styles.supportBold, { color: colors.textPrimary }]}>
          {stats.totalCount}
        </Text>
        <Text style={[styles.supportText, { color: colors.textPrimary }]}>
          {' '}suscripciones.
        </Text>
        {stats.sharedCount > 0 ? (
          <>
            {'\n'}
            <Text style={[styles.supportText, { color: colors.textPrimary }]}>
              Compartes{' '}
            </Text>
            <Text style={[styles.supportBold, { color: colors.textPrimary }]}>
              {stats.sharedCount}
            </Text>
            <Text style={[styles.supportText, { color: colors.textPrimary }]}>
              {' '}suscripciones.
            </Text>
          </>
        ) : null}
        {stats.savingsMonthly > 0 ? (
          <>
            {'\n'}
            <Text style={[styles.supportText, { color: colors.textPrimary }]}>
              Reduces{' '}
            </Text>
            <Text style={[styles.supportBold, { color: colors.textPrimary }]}>
              {formatAmount(stats.savingsMonthly, stats.currency)}
            </Text>
            <Text style={[styles.supportText, { color: colors.textPrimary }]}>
              {' '}tu gasto al mes.
            </Text>
          </>
        ) : null}
      </Text>
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
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 9999,
  },
  statementBlock: {
    marginBottom: 12, // mb-3
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
    lineHeight: fontSize[50] * lineHeight.none,
    letterSpacing: letterSpacing.tight,
  },
  heroPeriod: {
    fontFamily: fontFamily.extrabold,
    fontSize: fontSize[50],
    lineHeight: fontSize[50] * lineHeight.none,
  },
  supportBlock: {
    // Wrapped Text container
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
