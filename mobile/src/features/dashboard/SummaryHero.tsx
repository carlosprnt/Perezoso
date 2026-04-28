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

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, type GestureResponderEvent } from 'react-native';
import { useTheme } from '../../design/useTheme';
import { fontFamily, fontSize, lineHeight, letterSpacing } from '../../design/typography';
import { Skeleton } from '../../components/Skeleton';
import { LogoStack } from './LogoStack';
import { useT } from '../../lib/i18n/LocaleProvider';
import type { DashboardStats } from './types';

// Shimmer duration for the "Reduces X al mes" <-> "al año" transition.
// Matches the subscriptions screen total-period toggle for consistency.
const PERIOD_TOGGLE_MS = 1500;

interface SummaryHeroProps {
  stats: DashboardStats;
  /** Logo URLs for the inline LogoStack (all subscriptions) */
  logoUrls?: string[];
  /** Logo URLs for the "Compartes X suscripciones" line — shared subs only */
  sharedLogoUrls?: string[];
  /** Called when user taps the amount numbers — for money confetti */
  onAmountTap?: (x: number, y: number) => void;
  /** Called when user taps "Tienes X suscripciones" — for logo confetti */
  onLogosTap?: (x: number, y: number) => void;
}

import { formatMoney } from '../../lib/formatting';

function formatAmount(amount: number, currency: string): string {
  return formatMoney(amount, currency, { thousandSep: true });
}

export function SummaryHero({
  stats,
  logoUrls = [],
  sharedLogoUrls = [],
  onAmountTap,
  onLogosTap,
}: SummaryHeroProps) {
  const { colors, isDark } = useTheme();
  const t = useT();
  const labelColor = isDark ? '#8E8E93' : '#616161';
  const amountColor = colors.textPrimary;

  // Toggle "Reduces X al mes" <-> "Reduces X al año". Tap shows a 1.5s
  // shimmer skeleton over both the amount and the "tu gasto al mes"/
  // "al año" label, then swaps the values. The skeleton prevents the
  // number from flashing to the new value before the label has caught
  // up — the whole unit updates together.
  const [savingsPeriod, setSavingsPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [savingsLoading, setSavingsLoading] = useState(false);
  const savingsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (savingsTimeoutRef.current) clearTimeout(savingsTimeoutRef.current);
    };
  }, []);
  const toggleSavingsPeriod = useCallback(() => {
    if (savingsLoading) return;
    setSavingsLoading(true);
    savingsTimeoutRef.current = setTimeout(() => {
      setSavingsPeriod((p) => (p === 'monthly' ? 'annual' : 'monthly'));
      setSavingsLoading(false);
    }, PERIOD_TOGGLE_MS);
  }, [savingsLoading]);
  const savingsAmount = savingsPeriod === 'monthly'
    ? stats.savingsMonthly
    : stats.savingsMonthly * 12;
  const savingsLabel = savingsPeriod === 'monthly' ? t('dashboard.savingsMonthly') : t('dashboard.savingsAnnual');

  return (
    <View style={styles.container}>
      {/* Greeting + avatar are rendered ABOVE this component by
          SharedProfileHeader — the same element is visible in both
          closed and open reveal states, so we don't duplicate it here. */}

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
            {t('dashboard.monthlyLabel')}
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
          </Text>
        </View>

        {/* Annual */}
        <View style={styles.statementRow}>
          <Text style={[styles.label, { color: labelColor }]}>
            {t('dashboard.annualLabel')}
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
            {t('dashboard.haveCount')}{' '}
          </Text>
          <Text style={[styles.supportBold, { color: colors.textPrimary }]}>
            {stats.totalCount}
          </Text>
          {logoUrls.length > 0 ? (
            <LogoStack logoUrls={logoUrls} totalCount={stats.totalCount} />
          ) : null}
          <Text style={[styles.supportText, { color: colors.textPrimary }]}>
            {' '}{stats.totalCount === 1 ? t('dashboard.subscription') : t('dashboard.subscriptions')}.
          </Text>
        </Pressable>
        {stats.sharedCount > 0 ? (
          <View style={styles.supportLine}>
            <Text style={[styles.supportText, { color: colors.textPrimary }]}>
              {t('dashboard.shareCount')}{' '}
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
              {' '}{t('dashboard.subscriptions')}.
            </Text>
          </View>
        ) : null}
        {stats.savingsMonthly > 0 ? (
          <Pressable
            style={styles.supportLine}
            onPress={toggleSavingsPeriod}
            accessibilityRole="button"
            accessibilityLabel={
              savingsPeriod === 'monthly'
                ? t('dashboard.showAnnualSavings')
                : t('dashboard.showMonthlySavings')
            }
          >
            <Text style={[styles.supportText, { color: colors.textPrimary }]}>
              {t('dashboard.reduce')}{' '}
            </Text>
            {savingsLoading ? (
              // Skeleton covers amount + "tu gasto al mes/año" label.
              // Width is sized for the longest expected string so the
              // paragraph doesn't reflow between states.
              <Skeleton
                style={{ width: 210, height: 22, marginVertical: 3 }}
                borderRadius={6}
              />
            ) : (
              <>
                <Text style={[styles.supportBold, { color: colors.textPrimary }]}>
                  {formatAmount(savingsAmount, stats.currency)}
                </Text>
                <Text style={[styles.supportText, { color: colors.textPrimary }]}>
                  {' '}{savingsLabel}
                </Text>
              </>
            )}
            <Text style={[styles.supportText, { color: colors.textPrimary }]}>
              .
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // Top padding reserves room for the SharedProfileHeader overlay
    // (greeting + avatar) that sits above this component at a fixed
    // screen position. Without this the "Al mes gastas" block would
    // start flush against the safe area and collide with the header.
    paddingTop: 44 + 8,
    paddingBottom: 20, // pb-5
    paddingHorizontal: 20,
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
    ...fontFamily.medium,
    fontSize: 18,
    lineHeight: 18 * 1.6,
    letterSpacing: letterSpacing.tight,
  },
  heroAmount: {
    ...fontFamily.medium,
    fontSize: fontSize[50],
    lineHeight: fontSize[50] * lineHeight.compact,
    letterSpacing: letterSpacing.tight,
  },
  heroPeriod: {
    ...fontFamily.medium,
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
    ...fontFamily.medium,
    fontSize: 18,
    lineHeight: 18 * 1.6,
  },
  supportBold: {
    ...fontFamily.medium,
    fontSize: 18,
    lineHeight: 18 * 1.6,
  },
});
