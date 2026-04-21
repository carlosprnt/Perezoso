// Slide 1 hero — Perezoso sloth mascot surrounded by floating
// subscription-service logos. Each logo has its own subtle idle drift
// (Y oscillation at different periods) so the composition feels alive
// without ever looping obviously.
//
// Tapping anywhere on the hero fires a broadcast bounce: every logo
// pops in scale with a random delay, mirroring the webapp's
// `handleHeroTap` stagger effect.

import React, { useCallback, useEffect } from 'react';
import {
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { haptic } from '../../../lib/haptics';

import { radius } from '../../../design/radius';
import { shadows } from '../../../design/shadows';
import { logoUrlFromDomain } from '../../../lib/constants/platforms';
import { FLOATING_LOGOS } from '../constants';

const { width: SCREEN_W } = Dimensions.get('window');

// Positions are expressed as fractions of the hero's width/height so
// the layout feels consistent across device sizes. x/y are % from the
// top-left corner of the hero area, size in px.
//
// The arrangement deliberately mimics the web app: bigger logos near
// the mascot, smaller ones scattered further out, asymmetric so it
// doesn't read as a ring.
const LOGO_LAYOUT: { x: number; y: number; size: number; delay: number }[] = [
  { x: 0.09, y: 0.22, size: 64, delay: 0 },       // Netflix
  { x: 0.46, y: 0.08, size: 60, delay: 180 },     // Figma
  { x: 0.76, y: 0.20, size: 60, delay: 320 },     // Spotify
  { x: 0.57, y: 0.32, size: 46, delay: 90 },      // Revolut
  { x: 0.78, y: 0.46, size: 72, delay: 260 },     // YouTube
  { x: 0.08, y: 0.46, size: 56, delay: 420 },     // Duolingo
  { x: 0.05, y: 0.68, size: 52, delay: 150 },     // Notion
  { x: 0.72, y: 0.70, size: 58, delay: 310 },     // Twitch
  { x: 0.17, y: 0.82, size: 44, delay: 220 },     // iCloud
  { x: 0.54, y: 0.80, size: 50, delay: 60 },      // GitHub
];

const HERO_HEIGHT = 460;
const MASCOT_SIZE = 130;

interface Props {
  /** Scroll-driven parallax progress (−1, 0, +1). 0 = this slide active. */
  parallax: SharedValue<number>;
}

export function FloatingLogosHero({ parallax }: Props) {
  // Broadcast trigger — every increment fans out a bounce to every
  // logo. Children watch the value via useAnimatedReaction.
  const popTrigger = useSharedValue(0);

  const heroStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: parallax.value * 20 }],
  }));

  const onTapAnywhere = useCallback(() => {
    haptic.light();
    popTrigger.value = popTrigger.value + 1;
  }, [popTrigger]);

  return (
    <Animated.View style={[styles.root, heroStyle]}>
      <Pressable
        onPress={onTapAnywhere}
        style={styles.canvas}
        accessibilityRole="button"
        accessibilityLabel="Animar logos"
      >
        {FLOATING_LOGOS.map((l, i) => {
          const pos = LOGO_LAYOUT[i];
          if (!pos) return null;
          return (
            <FloatingLogo
              key={l.domain}
              domain={l.domain}
              x={pos.x}
              y={pos.y}
              size={pos.size}
              delay={pos.delay}
              popTrigger={popTrigger}
            />
          );
        })}

        {/* Mascot — the sloth. We use the bundled logo asset as a
            stand-in; swap for a dedicated hero illustration later. */}
        <MascotPulse />
      </Pressable>
    </Animated.View>
  );
}

function FloatingLogo({
  domain,
  x,
  y,
  size,
  delay,
  popTrigger,
}: {
  domain: string;
  x: number;
  y: number;
  size: number;
  delay: number;
  popTrigger: SharedValue<number>;
}) {
  const offset = useSharedValue(0);
  const pop = useSharedValue(1);

  useEffect(() => {
    const period = 2600 + ((delay * 7) % 1400);
    offset.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: period, easing: Easing.inOut(Easing.sin) }),
        withTiming( 6, { duration: period, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, [offset, delay]);

  // Random per-tap delay keeps the bounce feeling organic — no two
  // logos ever pop at the same instant.
  useAnimatedReaction(
    () => popTrigger.value,
    (v, prev) => {
      if (prev === null || v === prev) return;
      const d = Math.random() * 240;
      pop.value = withDelay(
        d,
        withSequence(
          withSpring(1.4, { damping: 6, stiffness: 400 }),
          withSpring(1, { damping: 8, stiffness: 300 }),
        ),
      );
    },
  );

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }, { scale: pop.value }],
  }));

  const left = SCREEN_W * x - size / 2;
  const top = HERO_HEIGHT * y - size / 2;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.logoCard,
        {
          left,
          top,
          width: size,
          height: size,
          borderRadius: Math.max(14, size * 0.26),
        },
        style,
      ]}
    >
      <Image
        source={{ uri: logoUrlFromDomain(domain) }}
        style={{ width: size * 0.62, height: size * 0.62 }}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

function MascotPulse() {
  const breath = useSharedValue(0);
  useEffect(() => {
    breath.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, [breath]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 + breath.value * 0.03 },
      { translateY: breath.value * -3 },
    ],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.mascot, style]}>
      <Image
        source={require('../../../../assets/icon.png')}
        style={styles.mascotImg}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: SCREEN_W,
    height: HERO_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvas: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  logoCard: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.cardMd,
  },
  mascot: {
    position: 'absolute',
    top: HERO_HEIGHT / 2 - MASCOT_SIZE / 2,
    left: SCREEN_W / 2 - MASCOT_SIZE / 2,
    width: MASCOT_SIZE,
    height: MASCOT_SIZE,
    borderRadius: radius['4xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotImg: {
    width: '100%',
    height: '100%',
    borderRadius: radius['4xl'],
  },
});
