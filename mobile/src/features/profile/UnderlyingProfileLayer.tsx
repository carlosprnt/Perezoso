// UnderlyingProfileLayer — the "behind" layer that's revealed when the
// user pulls down on the Dashboard. Lives behind the dashboard surface
// (zIndex below) so the dashboard physically slides off it, exposing
// this layer like a drawer. Designed to feel like part of the natural
// app surface, not a modal that animates in.
//
// Visual structure (from the reference screenshot):
//   - Dark background filling the full screen
//   - Header: "Hola, {name}." big bold + circular sloth avatar right
//   - Two square stat cards: Ajustes / Compartir datos
//   - Perezoso Plus block: title + subtitle + "Gestionar" pill
//   - Bottom row separated: Cerrar sesión (left, red) / Light mode (right)
//
// All actions are stubs — wire them up when the underlying flows exist.
//
// The layer accepts a SharedValue<number> `progress` (0 = closed → 1 = open)
// so it can apply subtle parallax / fade-in motion synchronized with the
// dashboard's translateY. The content stays mostly still; only opacity
// and a small translateY parallax animate to add depth.

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  type ImageSourcePropType,
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

// Use the bundled sloth logo as the user avatar placeholder.
const AVATAR_SOURCE: ImageSourcePropType = require('../../../assets/logo.png');

interface Props {
  /** 0 (closed) → 1 (fully open). Drives the layer's reveal animation. */
  progress: SharedValue<number>;
  /** Display name used in the greeting. */
  firstName?: string;
  // Action callbacks — stubbed for now.
  onSettings?: () => void;
  onShareData?: () => void;
  onManagePlus?: () => void;
  onLogout?: () => void;
  onToggleTheme?: () => void;
}

export function UnderlyingProfileLayer({
  progress,
  firstName = 'Carlos',
  onSettings,
  onShareData,
  onManagePlus,
  onLogout,
  onToggleTheme,
}: Props) {
  const insets = useSafeAreaInsets();

  // Gentle parallax + fade for the content. Stays mostly still — the
  // perceived motion comes from the dashboard sliding off, not from
  // the underlying layer entering.
  const contentStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, [0, 0.35, 1], [0, 0.4, 1], Extrapolation.CLAMP),
      transform: [
        {
          translateY: interpolate(
            p,
            [0, 1],
            [-12, 0],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  return (
    <View style={styles.root} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.content,
          contentStyle,
          {
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 24,
          },
        ]}
      >
        {/* ─── Header ────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.greeting} numberOfLines={1}>
            Hola, {firstName}.
          </Text>
          <Pressable hitSlop={12} accessibilityLabel="Tu perfil">
            <View style={styles.avatar}>
              <Image
                source={AVATAR_SOURCE}
                style={styles.avatarImg}
                resizeMode="cover"
              />
            </View>
          </Pressable>
        </View>

        {/* ─── Two square cards ──────────────────────────────── */}
        <View style={styles.cardsRow}>
          <Pressable
            style={({ pressed }) => [
              styles.squareCard,
              pressed && styles.squareCardPressed,
            ]}
            onPress={onSettings}
            accessibilityLabel="Ajustes"
          >
            <Settings size={22} color="#FFFFFF" strokeWidth={1.8} />
            <Text style={styles.squareCardLabel}>Ajustes</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.squareCard,
              pressed && styles.squareCardPressed,
            ]}
            onPress={onShareData}
            accessibilityLabel="Compartir datos"
          >
            <Share2 size={22} color="#FFFFFF" strokeWidth={1.8} />
            <Text style={styles.squareCardLabel}>Compartir datos</Text>
          </Pressable>
        </View>

        {/* ─── Perezoso Plus block ──────────────────────────── */}
        <View style={styles.plusBlock}>
          <View style={styles.plusTextCol}>
            <Text style={styles.plusTitle}>Perezoso Plus</Text>
            <Text style={styles.plusSubtitle}>Ya tienes la versión Pro</Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.plusBtn,
              pressed && { opacity: 0.85 },
            ]}
            onPress={onManagePlus}
            accessibilityLabel="Gestionar suscripción Perezoso Plus"
          >
            <Text style={styles.plusBtnText}>Gestionar</Text>
          </Pressable>
        </View>

        {/* ─── Spacer pushes the bottom row to the safe-area edge ── */}
        <View style={{ flex: 1 }} />

        {/* ─── Bottom row: logout / theme ───────────────────── */}
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
            <LogOut size={18} color="#F87171" strokeWidth={2} />
            <Text style={[styles.bottomBtnText, { color: '#F87171' }]}>
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
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  // ── Header ──────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  greeting: {
    ...fontFamily.bold,
    fontSize: 32,
    color: '#FFFFFF',
    letterSpacing: -0.6,
    flexShrink: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F2D9B8',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    width: 44,
    height: 44,
  },
  // ── Square cards ────────────────────────────────────────
  cardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  squareCard: {
    flex: 1,
    aspectRatio: 1.05,
    backgroundColor: '#1C1C1E',
    borderRadius: 22,
    padding: 18,
    justifyContent: 'space-between',
  },
  squareCardPressed: {
    backgroundColor: '#26262A',
  },
  squareCardLabel: {
    ...fontFamily.semibold,
    fontSize: fontSize[18],
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  // ── Plus block ─────────────────────────────────────────
  plusBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    borderRadius: 22,
    paddingVertical: 18,
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
    marginBottom: 4,
  },
  plusSubtitle: {
    ...fontFamily.regular,
    fontSize: fontSize[14],
    color: '#737373',
  },
  plusBtn: {
    backgroundColor: '#2C2C2E',
    borderRadius: 9999,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  plusBtnText: {
    ...fontFamily.semibold,
    fontSize: fontSize[15],
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
    ...fontFamily.semibold,
    fontSize: fontSize[15],
    letterSpacing: -0.1,
  },
});
