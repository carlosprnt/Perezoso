import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import { fontFamily, fontSize } from '../../design/typography';
import { radius } from '../../design/radius';
import { useTheme } from '../../design/useTheme';
import { useAdminStatsStore } from './useSettingsStore';
import {
  adminStats,
  type DayStat,
  type NameCount,
  type CurrencyCount,
  type LocaleCount,
  type CategoryCount,
  type CurrencySpend,
} from '../../services/adminStatsApi';

interface StatsData {
  totalUsers: number;
  registrations: DayStat[];
  subsPerDay: DayStat[];
  topSubs: NameCount[];
  currencies: CurrencyCount[];
  locales: LocaleCount[];
  monthlySpend: CurrencySpend[];
  categories: CategoryCount[];
}

export function AdminStatsSheet() {
  const isOpen = useAdminStatsStore((s) => s.isOpen);
  const close = useAdminStatsStore((s) => s.closeSheet);
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StatsData | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        totalUsers,
        registrations,
        subsPerDay,
        topSubs,
        currencies,
        locales,
        monthlySpend,
        categories,
      ] = await Promise.all([
        adminStats.totalUsers(),
        adminStats.registrationsPerDay(),
        adminStats.subscriptionsPerDay(),
        adminStats.topSubscriptions(),
        adminStats.currencyDistribution(),
        adminStats.localeDistribution(),
        adminStats.totalMonthlySpend(),
        adminStats.categoryDistribution(),
      ]);
      setData({ totalUsers, registrations, subsPerDay, topSubs, currencies, locales, monthlySpend, categories });
    } catch (e: any) {
      setError(e?.message ?? 'Error loading stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, load]);

  const bg = isDark ? '#000000' : '#FFFFFF';
  const handleColor = isDark ? '#636366' : '#D4D4D4';
  const titleColor = isDark ? '#FFFFFF' : '#000000';
  const closeBtnBg = isDark ? '#2C2C2E' : '#EBEBF0';
  const closeBtnColor = isDark ? '#AEAEB2' : '#3C3C43';
  const cardBg = isDark ? '#1C1C1E' : '#F2F2F4';
  const textPrimary = isDark ? '#FFFFFF' : '#000000';
  const textMuted = isDark ? '#8E8E93' : '#6B6B6B';
  const dividerColor = isDark ? '#38383A' : '#DEDEE3';
  const accentColor = '#3D3BF3';

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={close}
      onDismiss={close}
    >
      <View style={[styles.sheet, { backgroundColor: bg }]}>
        <View style={styles.handleWrap}>
          <View style={[styles.handle, { backgroundColor: handleColor }]} />
        </View>
        <View style={styles.header}>
          <Text style={[styles.title, { color: titleColor }]}>Stats</Text>
          <Pressable
            style={({ pressed }) => [
              styles.closeBtn,
              { backgroundColor: closeBtnBg },
              pressed && { opacity: 0.7 },
            ]}
            onPress={close}
            hitSlop={10}
          >
            <X size={15} color={closeBtnColor} strokeWidth={2.5} />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={accentColor} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={[styles.errorText, { color: '#FF3B30' }]}>{error}</Text>
            <Pressable onPress={load} style={styles.retryBtn}>
              <Text style={[styles.retryText, { color: accentColor }]}>Reintentar</Text>
            </Pressable>
          </View>
        ) : data ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(insets.bottom, 20) + 28 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* ── Big numbers row ── */}
            <View style={styles.bigNumbersRow}>
              <BigNumber label="Usuarios totales" value={data.totalUsers} cardBg={cardBg} textPrimary={textPrimary} textMuted={textMuted} accent={accentColor} />
              <BigNumber
                label="Suscripciones totales"
                value={data.topSubs.reduce((sum, s) => sum + s.count, 0)}
                cardBg={cardBg}
                textPrimary={textPrimary}
                textMuted={textMuted}
                accent={accentColor}
              />
            </View>

            {/* ── Monthly spend ── */}
            <View style={styles.gap} />
            <SectionTitle text="Gasto mensual total (activas)" color={textPrimary} />
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              {data.monthlySpend.length === 0 ? (
                <Text style={[styles.emptyText, { color: textMuted }]}>Sin datos</Text>
              ) : (
                data.monthlySpend.map((item, i) => (
                  <React.Fragment key={item.currency}>
                    {i > 0 && <View style={[styles.divider, { backgroundColor: dividerColor }]} />}
                    <View style={styles.row}>
                      <Text style={[styles.rowLabel, { color: textPrimary }]}>{item.currency}</Text>
                      <Text style={[styles.rowValueAccent, { color: accentColor }]}>
                        {formatNumber(item.total_monthly)}/mes
                      </Text>
                    </View>
                  </React.Fragment>
                ))
              )}
            </View>

            {/* ── Registros últimos 30 días ── */}
            <View style={styles.gap} />
            <SectionTitle
              text="Registros (últimos 30 días)"
              color={textPrimary}
              right={`Total: ${data.registrations.reduce((s, d) => s + d.count, 0)}`}
              rightColor={textMuted}
            />
            <DayChart data={data.registrations} cardBg={cardBg} textMuted={textMuted} accent={accentColor} />

            {/* ── Suscripciones creadas últimos 30 días ── */}
            <View style={styles.gap} />
            <SectionTitle
              text="Suscripciones creadas (30d)"
              color={textPrimary}
              right={`Total: ${data.subsPerDay.reduce((s, d) => s + d.count, 0)}`}
              rightColor={textMuted}
            />
            <DayChart data={data.subsPerDay} cardBg={cardBg} textMuted={textMuted} accent="#30D158" />

            {/* ── Idiomas ── */}
            <View style={styles.gap} />
            <SectionTitle text="Idiomas" color={textPrimary} />
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              {data.locales.map((item, i) => (
                <React.Fragment key={item.locale}>
                  {i > 0 && <View style={[styles.divider, { backgroundColor: dividerColor }]} />}
                  <View style={styles.row}>
                    <Text style={[styles.rowLabel, { color: textPrimary }]}>{item.locale}</Text>
                    <Text style={[styles.rowValue, { color: textMuted }]}>{item.count}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>

            {/* ── Monedas ── */}
            <View style={styles.gap} />
            <SectionTitle text="Monedas" color={textPrimary} />
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              {data.currencies.map((item, i) => (
                <React.Fragment key={item.currency}>
                  {i > 0 && <View style={[styles.divider, { backgroundColor: dividerColor }]} />}
                  <View style={styles.row}>
                    <Text style={[styles.rowLabel, { color: textPrimary }]}>{item.currency}</Text>
                    <Text style={[styles.rowValue, { color: textMuted }]}>{item.count}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>

            {/* ── Categorías ── */}
            <View style={styles.gap} />
            <SectionTitle text="Categorías" color={textPrimary} />
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              {data.categories.map((item, i) => (
                <React.Fragment key={item.category}>
                  {i > 0 && <View style={[styles.divider, { backgroundColor: dividerColor }]} />}
                  <View style={styles.row}>
                    <Text style={[styles.rowLabel, { color: textPrimary }]}>{item.category}</Text>
                    <Text style={[styles.rowValue, { color: textMuted }]}>{item.count}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>

            {/* ── Top 50 suscripciones ── */}
            <View style={styles.gap} />
            <SectionTitle text="Top 50 suscripciones" color={textPrimary} />
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              {data.topSubs.map((item, i) => (
                <React.Fragment key={item.name}>
                  {i > 0 && <View style={[styles.divider, { backgroundColor: dividerColor }]} />}
                  <View style={styles.row}>
                    <View style={styles.rankRow}>
                      <Text style={[styles.rank, { color: textMuted }]}>{i + 1}</Text>
                      <Text style={[styles.rowLabel, { color: textPrimary }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                    </View>
                    <Text style={[styles.rowValueAccent, { color: accentColor }]}>{item.count}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>

            <View style={{ height: 32 }} />
          </ScrollView>
        ) : null}
      </View>
    </Modal>
  );
}

function BigNumber({
  label,
  value,
  cardBg,
  textPrimary,
  textMuted,
  accent,
}: {
  label: string;
  value: number;
  cardBg: string;
  textPrimary: string;
  textMuted: string;
  accent: string;
}) {
  return (
    <View style={[styles.bigCard, { backgroundColor: cardBg }]}>
      <Text style={[styles.bigLabel, { color: textMuted }]}>{label}</Text>
      <Text style={[styles.bigValue, { color: accent }]}>{formatNumber(value)}</Text>
    </View>
  );
}

function SectionTitle({
  text,
  color,
  right,
  rightColor,
}: {
  text: string;
  color: string;
  right?: string;
  rightColor?: string;
}) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={[styles.sectionTitle, { color }]}>{text}</Text>
      {right && <Text style={[styles.sectionTitleRight, { color: rightColor ?? color }]}>{right}</Text>}
    </View>
  );
}

function DayChart({
  data,
  cardBg,
  textMuted,
  accent,
}: {
  data: DayStat[];
  cardBg: string;
  textMuted: string;
  accent: string;
}) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <View style={[styles.card, styles.chartCard, { backgroundColor: cardBg }]}>
      <View style={styles.chartBars}>
        {data.map((d) => {
          const height = Math.max((d.count / max) * 80, 2);
          const dayLabel = d.day.slice(8, 10);
          return (
            <View key={d.day} style={styles.chartCol}>
              <View style={[styles.chartBar, { height, backgroundColor: accent }]} />
              {data.length <= 15 && (
                <Text style={[styles.chartDayLabel, { color: textMuted }]}>{dayLabel}</Text>
              )}
            </View>
          );
        })}
      </View>
      <View style={styles.chartFooter}>
        <Text style={[styles.chartFooterText, { color: textMuted }]}>
          {formatDay(data[0]?.day)}
        </Text>
        <Text style={[styles.chartFooterText, { color: textMuted }]}>
          {formatDay(data[data.length - 1]?.day)}
        </Text>
      </View>
    </View>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

function formatDay(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

const styles = StyleSheet.create({
  sheet: { flex: 1, paddingTop: 6 },
  handleWrap: { alignItems: 'center', paddingTop: 8, paddingBottom: 8 },
  handle: { width: 40, height: 5, borderRadius: radius.full },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  title: {
    ...fontFamily.semiBold,
    fontSize: fontSize[32],
    letterSpacing: -0.6,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingTop: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { ...fontFamily.semiBold, fontSize: fontSize[15] },
  retryBtn: { paddingVertical: 8, paddingHorizontal: 16 },
  retryText: { ...fontFamily.semiBold, fontSize: fontSize[15] },
  gap: { height: 16 },

  bigNumbersRow: { flexDirection: 'row', gap: 12 },
  bigCard: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  bigLabel: { ...fontFamily.medium, fontSize: fontSize[11], letterSpacing: 0.3 },
  bigValue: { ...fontFamily.semiBold, fontSize: fontSize[32], letterSpacing: -0.5 },

  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: { ...fontFamily.semiBold, fontSize: fontSize[16], letterSpacing: -0.2 },
  sectionTitleRight: { ...fontFamily.medium, fontSize: fontSize[13] },

  card: { borderRadius: 14, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  rowLabel: { ...fontFamily.medium, fontSize: fontSize[15], flex: 1 },
  rowValue: { ...fontFamily.medium, fontSize: fontSize[15] },
  rowValueAccent: { ...fontFamily.semiBold, fontSize: fontSize[15] },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
  rankRow: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  rank: { ...fontFamily.semiBold, fontSize: fontSize[13], width: 26, textAlign: 'right' },
  emptyText: { ...fontFamily.medium, fontSize: fontSize[14], padding: 16 },

  chartCard: { paddingTop: 16, paddingBottom: 10, paddingHorizontal: 12 },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 90,
    gap: 2,
  },
  chartCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  chartBar: { width: '100%', borderRadius: 2, minWidth: 3 },
  chartDayLabel: { ...fontFamily.medium, fontSize: 8, marginTop: 3 },
  chartFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingHorizontal: 2,
  },
  chartFooterText: { ...fontFamily.medium, fontSize: fontSize[11] },
});
