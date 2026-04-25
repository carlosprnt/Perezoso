// UnderlyingProfileLayer — the dark panel revealed behind the Dashboard
// when the user pulls down. Direct port of AccountMenuPanel.tsx:
//
//   - Deep dark background (#0a0a0a) — matches web's bg-[#0a0a0a]
//   - 2-col grid of dark tiles (#151517) with icon-top / label-bottom
//   - "Perezoso Plus" card — bordered only, no fill, with a muted pill
//     button ("Gestionar" — bg-white/10)
//   - Footer row: red "Cerrar sesión" left, "Light mode" + Sun right
//
// Reveal animation
//   Opacity 0→1 AND translateY -30→0 are applied to the layer's ROOT
//   (not the content). When the dashboard is closed, the whole black
//   layer is invisible; as the user drags the dashboard down, the
//   layer fades in behind it simultaneously. This matches the
//   web's `bgOpacity` + `bgTranslate` pair on the backdrop motion.div.
//
// Bottom padding clears the 120px peek of the dashboard that's still
// visible at the bottom when the layer is fully revealed.

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Settings, Share2, LogOut } from 'lucide-react-native';

import { fontFamily, fontSize } from '../../design/typography';
import { radius } from '../../design/radius';
import { haptic } from '../../lib/haptics';
import { ThemeToggleButton } from '../../components/ThemeToggleButton';
import { GlowBorder } from '../settings/components';
import { useT } from '../../lib/i18n/LocaleProvider';

// Must stay in sync with PEEK_HEIGHT in useDashboardReveal.ts.
const PEEK_HEIGHT = 120;

// Vertical room reserved at the top for the SharedProfileHeader that
// overlays the whole app shell — greeting + avatar live there, not in
// this layer. We just leave the area clear so the grid/cards start
// below it and line up with the header at the same Y as the hero.
const HEADER_RESERVED = 44;

interface Props {
  /** 0 (closed) → 1 (fully open). Drives the fade + parallax. */
  progress: SharedValue<number>;
  /** Whether the user currently has Perezoso Plus. Drives the Plus block
   *  copy + CTA — active users see "Gestionar", free users see "Mejorar". */
  isPlusActive?: boolean;
  shareDisabled?: boolean;
  onSettings?: () => void;
  onShareData?: () => void;
  onManagePlus?: () => void;
  onLogout?: () => void;
}

export function UnderlyingProfileLayer({
  progress,
  isPlusActive = false,
  shareDisabled = false,
  onSettings,
  onShareData,
  onManagePlus,
  onLogout,
}: Props) {
  const insets = useSafeAreaInsets();
  const t = useT();

  // Root-level animation — mirrors `opacity: bgOpacity` + `y: bgTranslate`
  // on the web's backdrop layer. The entire panel fades in from -30px.
  const rootStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, [0, 1], [0, 1], Extrapolation.CLAMP),
      transform: [
        {
          translateY: interpolate(p, [0, 1], [-30, 0], Extrapolation.CLAMP),
        },
      ],
    };
  });

  return (
    <Animated.View
      style={[styles.root, rootStyle]}
      // box-none so children can still receive presses even though the
      // container itself is positioned absolute + fills the screen.
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.content,
          {
            // Top padding clears the safe-area notch + SharedProfileHeader
            // row (44 px) + a small gap. The header itself is rendered
            // above us (DashboardScreen level) so the grid starts below.
            paddingTop: insets.top + HEADER_RESERVED + 20,
            // Clear the foreground peek strip + home indicator.
            paddingBottom: PEEK_HEIGHT + insets.bottom + 24,
          },
        ]}
      >
        {/* ─── 2-col grid of dark tiles ────────────────────── */}
        <View style={styles.cardsRow}>
          <DarkTile
            icon={<Settings size={22} color="#FFFFFF" strokeWidth={2} />}
            label={t('profile.settings')}
            onPress={onSettings}
          />
          <DarkTile
            icon={<Share2 size={22} color="#FFFFFF" strokeWidth={2} />}
            label={t('profile.shareData')}
            onPress={onShareData}
            disabled={shareDisabled}
          />
        </View>

        {/* ─── Perezoso Pro block — border-only + animated glow ──── */}
        <View style={{ position: 'relative' }}>
        <GlowBorder borderRadius={18} />
        <View style={styles.plusBlock}>
          <View style={styles.plusTextCol}>
            <Text style={styles.plusTitle}>{t('profile.perezosoPro')}</Text>
            <Text style={styles.plusSubtitle}>
              {isPlusActive
                ? t('profile.proSubActive')
                : t('profile.proSubInactive')}
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.plusBtn,
              pressed && styles.plusBtnPressed,
            ]}
            onPress={() => { haptic.selection(); onManagePlus?.(); }}
            accessibilityLabel={
              isPlusActive
                ? t('profile.managePro')
                : t('profile.upgradePro')
            }
          >
            <Text style={styles.plusBtnText}>
              {isPlusActive ? t('profile.manage') : t('profile.upgrade')}
            </Text>
          </Pressable>
        </View>
        </View>

        {/* Spacer — pushes the footer row down to the peek boundary. */}
        <View style={{ flex: 1 }} />

        {/* ─── Footer: logout / theme ──────────────────────── */}
        <View style={styles.bottomRow}>
          <Pressable
            style={({ pressed }) => [
              styles.bottomBtn,
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => { haptic.light(); onLogout?.(); }}
            hitSlop={8}
            accessibilityLabel={t('profile.logout')}
          >
            <LogOut size={18} color="#FCA5A5" strokeWidth={2} />
            <Text style={[styles.bottomBtnText, { color: '#FCA5A5' }]}>
              {t('profile.logout')}
            </Text>
          </Pressable>
          <ThemeToggleButton color="#FFFFFF" />
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Dark tile — icon top, label bottom ───────────────────────────────
// Matches web's DarkTile: flex-col items-start gap-6 px-5 py-5
// rounded-[20px] bg-[#151517] active:bg-[#1F1F22] min-h-[120px]
function DarkTile({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={() => { if (disabled) return; haptic.selection(); onPress?.(); }}
      style={({ pressed }) => [
        styles.tile,
        pressed && !disabled && styles.tilePressed,
        disabled && styles.tileDisabled,
      ]}
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
    >
      <View style={[styles.tileIconWrap, disabled && { opacity: 0.35 }]}>{icon}</View>
      <Text style={[styles.tileLabel, disabled && { opacity: 0.35 }]} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A0A0A',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  // ── Cards row ──────────────────────────────────────────
  cardsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tile: {
    flex: 1,
    minHeight: 120,
    backgroundColor: '#151517',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
    // icon pinned to top, label pinned to bottom via the spacer / margins.
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tilePressed: {
    backgroundColor: '#1F1F22',
  },
  tileDisabled: {
    opacity: 0.5,
  },
  tileIconWrap: {
    opacity: 0.95,
  },
  tileLabel: {
    ...fontFamily.semibold,
    fontSize: fontSize[15],
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
  // ── Perezoso Plus block ────────────────────────────────
  plusBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  plusTextCol: {
    flex: 1,
    paddingRight: 12,
  },
  plusTitle: {
    ...fontFamily.semibold,
    fontSize: fontSize[20],
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  plusSubtitle: {
    ...fontFamily.regular,
    fontSize: fontSize[13],
    color: 'rgba(255,255,255,0.50)',
  },
  plusBtn: {
    height: 40,
    paddingHorizontal: 20,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusBtnPressed: {
    backgroundColor: 'rgba(255,255,255,0.20)',
  },
  plusBtnText: {
    ...fontFamily.semibold,
    fontSize: fontSize[14],
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
  // ── Bottom row ─────────────────────────────────────────
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 16,
  },
  bottomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  bottomBtnText: {
    ...fontFamily.regular,
    fontSize: fontSize[14],
    letterSpacing: -0.1,
  },
});
