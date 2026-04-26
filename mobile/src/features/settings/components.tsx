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

import React, { createContext, useContext, useEffect, type ReactNode } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { ChevronRight, Trash2 } from 'lucide-react-native';

import { fontFamily, fontSize } from '../../design/typography';
import { radius } from '../../design/radius';

// ─── Palette (colocated — kept tight, iOS-literal) ──────────────────
const C = {
  cardBg: '#F2F2F4',
  cardDivider: '#DEDEE3',
  iconTileBg: '#FFFFFF',
  iconStroke: '#0F0F10',
  textPrimary: '#000000',
  textMuted: '#8E8E93',
  destructiveBg: '#FCE6E5',
  destructiveText: '#FF3B30',
};

const CDark = {
  cardBg: '#1C1C1E',
  cardDivider: '#38383A',
  iconTileBg: '#2C2C2E',
  iconStroke: '#FFFFFF',
  textPrimary: '#FFFFFF',
  textMuted: '#8E8E93',
  destructiveBg: '#3A1515',
  destructiveText: '#FF6961',
};

export type SettingsPalette = typeof C;
const PaletteContext = createContext<SettingsPalette>(C);
export function SettingsPaletteProvider({ dark, children }: { dark: boolean; children: ReactNode }) {
  return <PaletteContext.Provider value={dark ? CDark : C}>{children}</PaletteContext.Provider>;
}
function usePalette() { return useContext(PaletteContext); }

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
  const p = usePalette();
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[styles.card, { backgroundColor: p.cardBg }, style]}>
      {items.map((child, i) => (
        <React.Fragment key={i}>
          {child}
          {i < items.length - 1 && (
            <View
              style={[
                styles.divider,
                { marginLeft: dividerInset, backgroundColor: p.cardDivider },
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
  const p = usePalette();
  return (
    <View
      style={[
        styles.iconTile,
        { backgroundColor: tint === 'destructive' ? p.destructiveBg : p.iconTileBg },
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
  const p = usePalette();
  const hasSwitch = typeof switchValue === 'boolean';
  const isPressable = !!onPress && !hasSwitch;

  const body = (
    <View style={styles.row}>
      <IconTile tint={destructive ? 'destructive' : 'neutral'}>{icon}</IconTile>
      <Text
        style={[
          styles.rowLabel,
          { color: destructive ? p.destructiveText : p.textPrimary },
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
            trackColor={{ false: '#E5E5EA', true: '#30D158' }}
            thumbColor="#FFFFFF"
            ios_backgroundColor="#E5E5EA"
          />
        ) : (
          <>
            {value ? (
              <Text style={[styles.rowValue, { color: p.textMuted }]} numberOfLines={1}>
                {value}
              </Text>
            ) : null}
            {!hideChevron && (
              <ChevronRight
                size={18}
                color={p.textMuted}
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
  const p = usePalette();
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
        <Text style={[styles.profileName, { color: p.textPrimary }]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.profileEmail, { color: p.textMuted }]} numberOfLines={1}>
          {email}
        </Text>
      </View>
    </View>
  );

  if (!onPress) {
    return <View style={[styles.card, { backgroundColor: p.cardBg }]}>{inner}</View>;
  }
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, { backgroundColor: p.cardBg }, pressed && { opacity: 0.7 }]}
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
  const p = usePalette();

  return (
    <View style={styles.subCardOuter}>
      <GlowBorder borderRadius={20} />
      <View style={[styles.subCard, { backgroundColor: p.cardBg }]}>
        <View style={styles.subTextCol}>
          <Text style={[styles.subTitle, { color: p.textPrimary }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.subStatus, { color: p.textMuted }]} numberOfLines={1}>
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
    </View>
  );
}

// ─── GlowBorder ────────────────────────────────────────────────────
// Reusable subtle animated glow ring. Pulsing opacity gives a soft
// "breathing" light effect around a card — elegant, not flashy.
export function GlowBorder({ borderRadius = 20 }: { borderRadius?: number }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 3500, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [progress]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.15, 0.5]),
  }));

  return (
    <Animated.View
      style={[
        {
          ...StyleSheet.absoluteFillObject,
          borderRadius: borderRadius + 2,
          borderWidth: 1,
          borderColor: '#93C5FD',
          top: -1,
          left: -1,
          right: -1,
          bottom: -1,
        },
        animStyle,
      ]}
      pointerEvents="none"
    />
  );
}

// ─── DestructiveCard ────────────────────────────────────────────────
// Standalone card used for the final "Eliminar cuenta" action.

interface DestructiveCardProps {
  label: string;
  onPress: () => void;
}

export function DestructiveCard({ label, onPress }: DestructiveCardProps) {
  const p = usePalette();
  return (
    <View style={[styles.card, { backgroundColor: p.cardBg }]}>
      <SettingsRow
        icon={<Trash2 size={18} color={p.destructiveText} strokeWidth={2.2} />}
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
    ...fontFamily.medium,
    fontSize: fontSize[16],
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
    letterSpacing: -0.1,
    maxWidth: 180,
  },

  // Rounded icon tile
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: 12,
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
    borderRadius: radius.full,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E4C8B8',
  },
  avatarInitials: {
    ...fontFamily.medium,
    fontSize: fontSize[18],
    color: '#3B2A1A',
    letterSpacing: -0.2,
  },
  profileTextCol: {
    flex: 1,
    paddingLeft: 14,
  },
  profileName: {
    ...fontFamily.medium,
    fontSize: fontSize[18],
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  profileEmail: {
    ...fontFamily.regular,
    fontSize: fontSize[14],
    letterSpacing: -0.1,
  },

  // Subscription highlight card
  subCardOuter: {
    position: 'relative',
  },
  subCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  subTextCol: {
    flex: 1,
    paddingRight: 12,
  },
  subTitle: {
    ...fontFamily.medium,
    fontSize: fontSize[20],
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  subStatus: {
    ...fontFamily.regular,
    fontSize: fontSize[14],
    letterSpacing: -0.1,
  },
  subBtn: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subBtnText: {
    ...fontFamily.medium,
    fontSize: fontSize[14],
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
});
