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
import { Settings, Share2, LogOut, Sun } from 'lucide-react-native';

import { fontFamily, fontSize } from '../../design/typography';

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
  onSettings?: () => void;
  onShareData?: () => void;
  onManagePlus?: () => void;
  onLogout?: () => void;
  onToggleTheme?: () => void;
}

export function UnderlyingProfileLayer({
  progress,
  onSettings,
  onShareData,
  onManagePlus,
  onLogout,
  onToggleTheme,
}: Props) {
  const insets = useSafeAreaInsets();

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
            label="Ajustes"
            onPress={onSettings}
          />
          <DarkTile
            icon={<Share2 size={22} color="#FFFFFF" strokeWidth={2} />}
            label="Compartir datos"
            onPress={onShareData}
          />
        </View>

        {/* ─── Perezoso Plus block — border-only, no fill ──── */}
        <View style={styles.plusBlock}>
          <View style={styles.plusTextCol}>
            <Text style={styles.plusTitle}>Perezoso Plus</Text>
            <Text style={styles.plusSubtitle}>Ya tienes la versión Pro</Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.plusBtn,
              pressed && styles.plusBtnPressed,
            ]}
            onPress={onManagePlus}
            accessibilityLabel="Gestionar suscripción Perezoso Plus"
          >
            <Text style={styles.plusBtnText}>Gestionar</Text>
          </Pressable>
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
            onPress={onLogout}
            hitSlop={8}
            accessibilityLabel="Cerrar sesión"
          >
            <LogOut size={18} color="#FCA5A5" strokeWidth={2} />
            <Text style={[styles.bottomBtnText, { color: '#FCA5A5' }]}>
              Cerrar sesión
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.bottomBtn,
              pressed && { opacity: 0.7 },
            ]}
            onPress={onToggleTheme}
            hitSlop={8}
            accessibilityLabel="Cambiar a modo claro"
          >
            <Text style={[styles.bottomBtnText, { color: '#FFFFFF' }]}>
              Light mode
            </Text>
            <Sun size={18} color="#FFFFFF" strokeWidth={2} />
          </Pressable>
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
}: {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        pressed && styles.tilePressed,
      ]}
      accessibilityLabel={label}
    >
      <View style={styles.tileIconWrap}>{icon}</View>
      <Text style={styles.tileLabel} numberOfLines={2}>
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
    ...fontFamily.bold,
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
    borderRadius: 9999,
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
    ...fontFamily.medium,
    fontSize: fontSize[14],
    letterSpacing: -0.1,
  },
});
