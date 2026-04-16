// SubscriptionDetailView — read-only detail view rendered inside the
// native iOS pageSheet. Shows hero gradient, price hero card, data rows,
// billing-progress card, and the "Editar suscripción" CTA.

import React, { useCallback } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell,
  BellOff,
  CalendarDays,
  CreditCard,
  RefreshCw,
  Tag,
  X,
} from 'lucide-react-native';

import { LogoAvatar } from '../../components/LogoAvatar';
import { useTheme } from '../../design/useTheme';
import { fontFamily, fontSize, lineHeight, letterSpacing } from '../../design/typography';
import { radius } from '../../design/radius';
import { STATUS_LABELS, CATEGORY_LABELS } from '../subscriptions/types';
import type { Subscription } from '../subscriptions/types';
import {
  heroGradientColors,
  formatAmount,
  formatDateShort,
  billingProgress,
  daysUntil,
  daysLabel,
  BILLING_PERIOD_LABELS,
  toYearly,
  toMonthly,
} from './helpers';

// ─── Sub-components ──────────────────────────────────────────────────

/** Small horizontal divider used between card rows. */
function RowDivider() {
  return <View style={styles.divider} />;
}

/** Icon + label + value data row — matches the screenshot's card rows. */
function DataRow({
  icon,
  label,
  value,
  valueBold = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueBold?: boolean;
}) {
  return (
    <View style={styles.dataRow}>
      <View style={styles.dataRowIcon}>{icon}</View>
      <Text style={styles.dataRowLabel}>{label}</Text>
      <Text style={[styles.dataRowValue, valueBold && styles.dataRowValueBold]}>
        {value}
      </Text>
    </View>
  );
}

// ─── Main component ──────────────────────────────────────────────────

interface Props {
  sub: Subscription;
  onClose: () => void;
  onEdit: () => void;
}

export function SubscriptionDetailView({ sub, onClose, onEdit }: Props) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // ── Derived values ──────────────────────────────────────────────
  const monthly = toMonthly(sub.price_amount, sub.billing_period, sub.billing_interval_count);
  const yearly = toYearly(sub.price_amount, sub.billing_period, sub.billing_interval_count);
  const daysLeft = daysUntil(sub.next_billing_date);
  const progress = billingProgress(sub);
  const nextDate = new Date(sub.next_billing_date);

  // Status badge
  const statusColors: Record<string, string> = {
    active: colors.statusActive,
    trial: colors.statusTrial,
    paused: colors.statusPaused,
    cancelled: colors.statusCancelled,
  };
  const statusColor = statusColors[sub.status] ?? colors.statusActive;

  // Hero gradient
  const gradientColors = heroGradientColors(sub, colors.surface);

  // Billing amount label: show MY cost per period
  const billingAmountFmt = formatAmount(sub.price_amount, sub.currency);

  const handleClose = useCallback(() => onClose(), [onClose]);
  const handleEdit = useCallback(() => onEdit(), [onEdit]);

  const iconSize = 16;
  const iconColor = isDark ? '#9E9E9E' : '#8E8E93';
  const cardBg = colors.surface;
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';

  return (
    <View style={[styles.root, { backgroundColor: colors.surface }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 16 },
        ]}
        showsVerticalScrollIndicator={false}
        bounces
      >
        {/* ── Hero header ── */}
        <View style={styles.heroWrapper}>
          <LinearGradient
            colors={gradientColors}
            locations={[0, 0.55, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Close button */}
          <View style={styles.heroTopBar}>
            <View style={{ flex: 1 }} />
            <Pressable
              style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }]}
              onPress={handleClose}
              hitSlop={10}
            >
              <X size={15} color={isDark ? '#F2F2F7' : '#3C3C43'} strokeWidth={2.5} />
            </Pressable>
          </View>

          {/* Logo */}
          <View style={styles.heroLogoWrap}>
            <LogoAvatar name={sub.name} logoUrl={sub.logo_url} size="lg" style={styles.heroLogo} />
          </View>

          {/* Name */}
          <Text style={[styles.heroName, { color: isDark ? '#F2F2F7' : '#000000' }]}>
            {sub.name}
          </Text>

          {/* Status badge */}
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}22` }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>
              {STATUS_LABELS[sub.status]}
            </Text>
          </View>
        </View>

        {/* ── Cards ── */}
        <View style={styles.cardStack}>
          {/* 1. Price hero card */}
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.priceHero}>
              {/* Monthly */}
              <View style={styles.priceBlock}>
                <Text style={[styles.priceBig, { color: colors.textPrimary }]}>
                  {formatAmount(monthly, sub.currency)}
                </Text>
                <Text style={[styles.priceCaption, { color: colors.textMuted }]}>Al mes</Text>
              </View>

              {/* Vertical separator */}
              <View style={[styles.priceSep, { backgroundColor: cardBorder }]} />

              {/* Yearly */}
              <View style={[styles.priceBlock, styles.priceBlockRight]}>
                <Text style={[styles.priceBig, { color: colors.textPrimary }]}>
                  {formatAmount(yearly, sub.currency)}
                </Text>
                <Text style={[styles.priceCaption, { color: colors.textMuted }]}>Anualmente</Text>
              </View>
            </View>
          </View>

          {/* 2. Main data rows card */}
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <DataRow
              icon={<CalendarDays size={iconSize} color={iconColor} strokeWidth={2} />}
              label="Siguiente cobro"
              value={formatDateShort(nextDate)}
            />
            <RowDivider />
            <DataRow
              icon={<CreditCard size={iconSize} color={iconColor} strokeWidth={2} />}
              label="Importe del cobro"
              value={billingAmountFmt}
            />
            <RowDivider />
            <DataRow
              icon={<RefreshCw size={iconSize} color={iconColor} strokeWidth={2} />}
              label="Frecuencia de cobro"
              value={BILLING_PERIOD_LABELS[sub.billing_period]}
              valueBold
            />
          </View>

          {/* 3. Billing progress card */}
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
              TIEMPO HASTA EL SIGUIENTE COBRO
            </Text>
            <View style={styles.progressDates}>
              <Text style={[styles.progressDateText, { color: colors.textMuted }]}>Hoy</Text>
              <Text style={[styles.progressDateText, { color: colors.textMuted }]}>
                {formatDateShort(nextDate)}
              </Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: isDark ? '#2C2C2E' : '#E8E8E8' }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.round(progress * 100)}%` as `${number}%`,
                    backgroundColor: statusColor,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressDaysLeft, { color: colors.textPrimary }]}>
              {daysLabel(daysLeft)}
            </Text>
          </View>

          {/* 4. Extras: reminder + category */}
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <DataRow
              icon={
                sub.reminderEnabled
                  ? <Bell size={iconSize} color={iconColor} strokeWidth={2} />
                  : <BellOff size={iconSize} color={iconColor} strokeWidth={2} />
              }
              label="Aviso de renovación"
              value={sub.reminderEnabled ? (sub.reminderDays ?? '1 día antes') : 'Sin aviso'}
            />
            <RowDivider />
            <DataRow
              icon={<Tag size={iconSize} color={iconColor} strokeWidth={2} />}
              label="Categoría"
              value={CATEGORY_LABELS[sub.category]}
              valueBold
            />
            {sub.is_shared && (
              <>
                <RowDivider />
                <DataRow
                  icon={<Tag size={iconSize} color={iconColor} strokeWidth={2} />}
                  label="Compartida con"
                  value={`${sub.shared_with_count} personas`}
                  valueBold
                />
              </>
            )}
          </View>
        </View>
      </ScrollView>

      {/* ── Footer CTA ── */}
      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: cardBorder }]}>
        <Pressable
          style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.85 }]}
          onPress={handleEdit}
        >
          <Text style={styles.editBtnText}>Editar suscripción</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: 0,
  },

  // ── Hero ──
  heroWrapper: {
    paddingTop: 14,
    paddingBottom: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 10,
  },
  heroTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 4,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLogoWrap: {
    // Subtle lift + white card treatment to separate logo from gradient
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  heroLogo: {
    // Override LogoAvatar border so it blends into the card
    borderWidth: 0,
  },
  heroName: {
    ...fontFamily.bold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: letterSpacing.tight,
    textAlign: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusBadgeText: {
    ...fontFamily.semibold,
    fontSize: fontSize[14],
    lineHeight: fontSize[14] * lineHeight.snug,
  },

  // ── Cards ──
  cardStack: {
    padding: 14,
    gap: 10,
  },
  card: {
    borderRadius: radius['3xl'], // 16
    borderWidth: 1,
    overflow: 'hidden',
  },

  // ── Price hero ──
  priceHero: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  priceBlock: {
    flex: 1,
    gap: 4,
  },
  priceBlockRight: {
    alignItems: 'flex-end',
  },
  priceBig: {
    ...fontFamily.bold,
    fontSize: fontSize[24],
    lineHeight: fontSize[24] * lineHeight.tight,
    letterSpacing: letterSpacing.tight,
    fontVariant: ['tabular-nums'],
  },
  priceCaption: {
    ...fontFamily.regular,
    fontSize: fontSize[13],
    lineHeight: fontSize[13] * lineHeight.snug,
  },
  priceSep: {
    width: 1,
    marginHorizontal: 16,
    alignSelf: 'stretch',
  },

  // ── Data rows ──
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    minHeight: 48,
    gap: 10,
  },
  dataRowIcon: {
    width: 20,
    alignItems: 'center',
  },
  dataRowLabel: {
    ...fontFamily.regular,
    fontSize: fontSize[15],
    lineHeight: fontSize[15] * lineHeight.snug,
    color: '#8E8E93',
    flex: 1,
  },
  dataRowValue: {
    ...fontFamily.regular,
    fontSize: fontSize[15],
    lineHeight: fontSize[15] * lineHeight.snug,
    color: '#000000',
    textAlign: 'right',
  },
  dataRowValueBold: {
    ...fontFamily.semibold,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(60,60,67,0.1)',
    marginLeft: 46,
  },

  // ── Progress ──
  progressLabel: {
    ...fontFamily.semibold,
    fontSize: fontSize[11],
    lineHeight: fontSize[11] * lineHeight.snug,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  progressDates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  progressDateText: {
    ...fontFamily.regular,
    fontSize: fontSize[13],
  },
  progressTrack: {
    marginHorizontal: 16,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  progressDaysLeft: {
    ...fontFamily.bold,
    fontSize: fontSize[15],
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
  },

  // ── Footer ──
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  editBtn: {
    height: 52,
    borderRadius: radius.full,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnText: {
    ...fontFamily.semibold,
    fontSize: fontSize[16],
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
});
