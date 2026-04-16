// Reusable pieces that compose the Ajustes (Settings) sheet.
//
// All rows share the same iOS-style visual language:
//   · Icon inside a white rounded square on the left
//   · Title in black on the row line
//   · Optional trailing value / chevron / switch on the right
//   · Rows grouped inside a light-gray rounded container, separated
//     by a hairline divider that starts after the icon column.
//
// These components are deliberately pure visual shells — they don't
// own any state or navigation. The SettingsSheet composes them and
// wires up real behaviour via the `onPress` prop.

import React, { type ReactNode } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { ChevronRight, Trash2 } from 'lucide-react-native';

import { fontFamily, fontSize } from '../../design/typography';

// ─── Palette (colocated — kept tight, iOS-literal) ──────────────────
const C = {
  cardBg: '#F2F2F4',       // gray-50 with a subtle cool tint (as in screenshots)
  cardDivider: '#DEDEE3',
  iconTileBg: '#FFFFFF',
  iconStroke: '#0F0F10',
  textPrimary: '#000000',
  textMuted: '#8E8E93',
  destructiveBg: '#FCE6E5',
  destructiveText: '#FF3B30',
};

// ─── SettingsSectionCard ─────────────────────────────────────────────
// A light-gray rounded container that groups 1..N rows. Children are
// expected to be <SettingsRow /> elements; dividers between them are
// painted here (not inside each row) so the divider treatment stays
// consistent.

interface SectionCardProps {
  children: ReactNode;
  /** Inset left side of dividers to line up with the row text. */
  dividerInset?: number;
  style?: object;
}

export function SettingsSectionCard({
  children,
  dividerInset = 64,
  style,
}: SectionCardProps) {
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[styles.card, style]}>
      {items.map((child, i) => (
        <React.Fragment key={i}>
          {child}
          {i < items.length - 1 && (
            <View
              style={[
                styles.divider,
                { marginLeft: dividerInset },
              ]}
            />
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

// ─── IconTile ───────────────────────────────────────────────────────
// 36x36 white rounded square hosting the row's lucide icon. Also used
// by the destructive card with a red tint instead of white.

interface IconTileProps {
  children: ReactNode;
  tint?: 'neutral' | 'destructive';
}

export function IconTile({ children, tint = 'neutral' }: IconTileProps) {
  return (
    <View
      style={[
        styles.iconTile,
        tint === 'destructive' && { backgroundColor: C.destructiveBg },
      ]}
    >
      {children}
    </View>
  );
}

// ─── SettingsRow ────────────────────────────────────────────────────
// The atom every list row is built from. Caller controls what's on
// the right: a value string, a switch, a plain chevron, or nothing.

interface SettingsRowProps {
  icon: ReactNode;
  label: string;
  /** Muted text shown just before the chevron — e.g. "€ EUR", "Claro". */
  value?: string;
  /** Render a switch on the right. Takes precedence over `value`. */
  switchValue?: boolean;
  onSwitchChange?: (v: boolean) => void;
  /** Hide the trailing chevron (defaults to visible). */
  hideChevron?: boolean;
  /** Slot fully replacing the right-hand area (takes precedence). */
  rightAccessory?: ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  /** Accessibility-only — defaults to `label`. */
  a11yLabel?: string;
}

export function SettingsRow({
  icon,
  label,
  value,
  switchValue,
  onSwitchChange,
  hideChevron,
  rightAccessory,
  onPress,
  destructive,
  a11yLabel,
}: SettingsRowProps) {
  const hasSwitch = typeof switchValue === 'boolean';
  const isPressable = !!onPress && !hasSwitch;

  const body = (
    <View style={styles.row}>
      <IconTile tint={destructive ? 'destructive' : 'neutral'}>{icon}</IconTile>
      <Text
        style={[
          styles.rowLabel,
          destructive && { color: C.destructiveText },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <View style={styles.rowRight}>
        {rightAccessory ? (
          rightAccessory
        ) : hasSwitch ? (
          <Switch
            value={switchValue}
            onValueChange={onSwitchChange}
            trackColor={{ false: '#E5E5EA', true: '#34C759' }}
            thumbColor="#FFFFFF"
            ios_backgroundColor="#E5E5EA"
          />
        ) : (
          <>
            {value ? (
              <Text style={styles.rowValue} numberOfLines={1}>
                {value}
              </Text>
            ) : null}
            {!hideChevron && (
              <ChevronRight
                size={18}
                color={C.textMuted}
                strokeWidth={2.4}
              />
            )}
          </>
        )}
      </View>
    </View>
  );

  if (!isPressable) {
    return <View accessibilityLabel={a11yLabel ?? label}>{body}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => pressed && { opacity: 0.55 }}
    >
      {body}
    </Pressable>
  );
}

// ─── ProfileCard ────────────────────────────────────────────────────
// User avatar (fallback to initials) + name + email in a single card.

interface ProfileCardProps {
  name: string;
  email: string;
  avatarUrl?: string;
  onPress?: () => void;
}

export function ProfileCard({
  name,
  email,
  avatarUrl,
  onPress,
}: ProfileCardProps) {
  const initials = React.useMemo(() => {
    const parts = name.trim().split(/\s+/);
    return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
  }, [name]);

  const inner = (
    <View style={styles.profileRow}>
      <View style={styles.avatar}>
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <Text style={styles.avatarInitials}>{initials.toUpperCase()}</Text>
        )}
      </View>
      <View style={styles.profileTextCol}>
        <Text style={styles.profileName} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.profileEmail} numberOfLines={1}>
          {email}
        </Text>
      </View>
    </View>
  );

  if (!onPress) {
    return <View style={styles.card}>{inner}</View>;
  }
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
      accessibilityLabel={`Perfil de ${name}`}
    >
      {inner}
    </Pressable>
  );
}

// ─── SubscriptionCard ───────────────────────────────────────────────
// "Perezoso Plus" highlight with a black pill "Gestionar" CTA on the
// right. Tall, border-less, visually distinct from settings rows.

interface SubscriptionCardProps {
  title: string;
  status: string;
  ctaLabel: string;
  onManage: () => void;
}

export function SubscriptionCard({
  title,
  status,
  ctaLabel,
  onManage,
}: SubscriptionCardProps) {
  return (
    <View style={styles.subCard}>
      <View style={styles.subTextCol}>
        <Text style={styles.subTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.subStatus} numberOfLines={1}>
          {status}
        </Text>
      </View>
      <Pressable
        onPress={onManage}
        hitSlop={8}
        style={({ pressed }) => [
          styles.subBtn,
          pressed && { opacity: 0.85 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={ctaLabel}
      >
        <Text style={styles.subBtnText}>{ctaLabel}</Text>
      </Pressable>
    </View>
  );
}

// ─── DestructiveCard ────────────────────────────────────────────────
// Standalone card used for the final "Eliminar cuenta" action.

interface DestructiveCardProps {
  label: string;
  onPress: () => void;
}

export function DestructiveCard({ label, onPress }: DestructiveCardProps) {
  return (
    <View style={styles.card}>
      <SettingsRow
        icon={<Trash2 size={18} color={C.destructiveText} strokeWidth={2.2} />}
        label={label}
        onPress={onPress}
        destructive
        hideChevron
      />
    </View>
  );
}

// ─── Re-export palette so siblings can match colors ────────────────
export const SETTINGS_PALETTE = C;

// ─── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Cards (grouped container)
  card: {
    backgroundColor: C.cardBg,
    borderRadius: 18,
    overflow: 'hidden',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.cardDivider,
  },

  // Generic row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 60,
  },
  rowLabel: {
    ...fontFamily.semibold,
    fontSize: fontSize[16],
    color: C.textPrimary,
    letterSpacing: -0.2,
    flex: 1,
    paddingLeft: 12,
    paddingRight: 8,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '60%',
  },
  rowValue: {
    ...fontFamily.regular,
    fontSize: fontSize[15],
    color: C.textMuted,
    letterSpacing: -0.1,
    maxWidth: 180,
  },

  // White rounded icon tile
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.iconTileBg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Profile
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 9999,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E4C8B8',
  },
  avatarInitials: {
    ...fontFamily.bold,
    fontSize: fontSize[18],
    color: '#3B2A1A',
    letterSpacing: -0.2,
  },
  profileTextCol: {
    flex: 1,
    paddingLeft: 14,
  },
  profileName: {
    ...fontFamily.bold,
    fontSize: fontSize[18],
    color: C.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  profileEmail: {
    ...fontFamily.regular,
    fontSize: fontSize[14],
    color: C.textMuted,
    letterSpacing: -0.1,
  },

  // Subscription highlight card
  subCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.cardBg,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  subTextCol: {
    flex: 1,
    paddingRight: 12,
  },
  subTitle: {
    ...fontFamily.bold,
    fontSize: fontSize[20],
    color: C.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  subStatus: {
    ...fontFamily.regular,
    fontSize: fontSize[14],
    color: C.textMuted,
    letterSpacing: -0.1,
  },
  subBtn: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 9999,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subBtnText: {
    ...fontFamily.semibold,
    fontSize: fontSize[14],
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
});
