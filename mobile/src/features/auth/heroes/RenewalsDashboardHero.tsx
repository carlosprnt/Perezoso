// Slide 2 hero — iPhone-style frame containing the "renewals" dashboard
// surface: reminder banner + 4-up stat grid. Mirrors the web Insights
// card + Reminder banner styling.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, TrendingUp, Package, Users, AlertCircle } from 'lucide-react-native';

import { fontFamily, fontSize, lineHeight } from '../../../design/typography';
import { radius } from '../../../design/radius';
import { shadows } from '../../../design/shadows';
import { MOCK_RENEWALS_STATS } from '../constants';
import { PhoneFrame } from './PhoneFrame';

interface Props {
  parallax: SharedValue<number>;
}

export function RenewalsDashboardHero({ parallax }: Props) {
  const heroStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: parallax.value * 22 },
      {
        scale: interpolate(
          Math.abs(parallax.value),
          [0, 1],
          [1, 0.96],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return (
    <Animated.View style={[styles.root, heroStyle]}>
      <PhoneFrame>
        {/* Reminder banner ─────────────────────── */}
        <View style={styles.reminderCard}>
          <View style={styles.reminderBody}>
            <View style={styles.reminderIconWrap}>
              <LinearGradient
                colors={['#E0E7FF', '#C7D2FE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Bell size={18} color="#4F46E5" strokeWidth={2.3} />
            </View>
            <Text style={styles.reminderText}>
              Podrías evitar <Text style={styles.reminderBold}>3 renovaciones anuales</Text> por sorpresa si activas avisos 7 días antes.
            </Text>
          </View>
          <View style={styles.reminderActions}>
            <View style={styles.reminderBtnGhost}>
              <Text style={styles.reminderBtnGhostText}>No me interesa</Text>
            </View>
            <View style={styles.reminderBtnSolid}>
              <Text style={styles.reminderBtnSolidText}>Avisarme 7 días antes</Text>
            </View>
          </View>
        </View>

        {/* Stat grid ─────────────────────────── */}
        <View style={styles.statCard}>
          <View style={styles.statRow}>
            <StatCell
              icon={<TrendingUp size={15} color="#000" strokeWidth={2.2} />}
              label={MOCK_RENEWALS_STATS.topSpend.label}
              value={MOCK_RENEWALS_STATS.topSpend.name}
              sub={MOCK_RENEWALS_STATS.topSpend.sub}
              bgColor="#F2F2F4"
            />
            <View style={styles.statDivider} />
            <StatCell
              icon={<Package size={15} color="#000" strokeWidth={2.2} />}
              label={MOCK_RENEWALS_STATS.topCategory.label}
              value={MOCK_RENEWALS_STATS.topCategory.name}
              sub={MOCK_RENEWALS_STATS.topCategory.sub}
              bgColor="#F2F2F4"
            />
          </View>
          <View style={styles.statRowDivider} />
          <View style={styles.statRow}>
            <StatCell
              icon={<Users size={15} color="#2563EB" strokeWidth={2.4} />}
              label={MOCK_RENEWALS_STATS.shared.label}
              value={MOCK_RENEWALS_STATS.shared.name}
              sub={MOCK_RENEWALS_STATS.shared.sub}
              bgColor="#DBEAFE"
            />
            <View style={styles.statDivider} />
            <StatCell
              icon={<AlertCircle size={15} color="#D97706" strokeWidth={2.4} />}
              label={MOCK_RENEWALS_STATS.nextRenewal.label}
              value={MOCK_RENEWALS_STATS.nextRenewal.name}
              sub={MOCK_RENEWALS_STATS.nextRenewal.sub}
              bgColor="#FEF3C7"
            />
          </View>
        </View>

        {/* Partial hint of next section (fades under mask) */}
        <Text style={styles.nextSection}>Próximas renovaciones</Text>
      </PhoneFrame>
    </Animated.View>
  );
}

function StatCell({
  icon,
  label,
  value,
  sub,
  bgColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  bgColor: string;
}) {
  return (
    <View style={styles.statCell}>
      <View style={[styles.statIconWrap, { backgroundColor: bgColor }]}>
        {icon}
      </View>
      <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.statSub} numberOfLines={1}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  // ── Reminder ────────────────────────────
  reminderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    marginBottom: 12,
    ...shadows.cardSm,
  },
  reminderBody: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  reminderIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderText: {
    flex: 1,
    ...fontFamily.regular,
    fontSize: 12,
    lineHeight: 12 * 1.4,
    color: '#1F2937',
  },
  reminderBold: {
    ...fontFamily.medium,
    color: '#111827',
  },
  reminderActions: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  reminderBtnGhost: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 7,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  reminderBtnGhostText: {
    ...fontFamily.medium,
    fontSize: 11,
    color: '#737373',
  },
  reminderBtnSolid: {
    flex: 1.8,
    backgroundColor: '#F0EEFF',
    paddingVertical: 7,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  reminderBtnSolidText: {
    ...fontFamily.medium,
    fontSize: 11,
    color: '#1F2937',
  },

  // ── Stats ───────────────────────────────
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    ...shadows.cardSm,
  },
  statRow: {
    flexDirection: 'row',
  },
  statCell: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statLabel: {
    ...fontFamily.medium,
    fontSize: 10,
    color: '#9CA3AF',
    marginBottom: 3,
  },
  statValue: {
    ...fontFamily.medium,
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 2,
  },
  statSub: {
    ...fontFamily.regular,
    fontSize: 9.5,
    color: '#9CA3AF',
    lineHeight: 9.5 * 1.35,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#F0F0F0',
  },
  statRowDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
  },
  nextSection: {
    ...fontFamily.medium,
    fontSize: fontSize[18],
    color: '#0F172A',
    marginTop: 18,
    opacity: 0.35,
  },
});
