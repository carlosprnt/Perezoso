// Slide 1 hero — Perezoso sloth mascot surrounded by floating
// subscription-service logos. Each logo has its own subtle idle drift
// (Y oscillation at different periods) so the composition feels alive
// without ever looping obviously.

import React, { useEffect } from 'react';
import {
  Dimensions,
  Image,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

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
  { x: 0.09, y: 0.34, size: 64, delay: 0 },       // Netflix
  { x: 0.46, y: 0.14, size: 60, delay: 180 },     // Figma
  { x: 0.76, y: 0.30, size: 60, delay: 320 },     // Spotify
  { x: 0.57, y: 0.37, size: 46, delay: 90 },      // Revolut
  { x: 0.78, y: 0.50, size: 72, delay: 260 },     // YouTube
  { x: 0.08, y: 0.54, size: 56, delay: 420 },     // Duolingo
  { x: 0.05, y: 0.84, size: 52, delay: 150 },     // Notion
  { x: 0.72, y: 0.85, size: 58, delay: 310 },     // Twitch
  { x: 0.17, y: 0.96, size: 44, delay: 220 },     // iCloud
  { x: 0.54, y: 0.96, size: 50, delay: 60 },      // GitHub
];

const HERO_HEIGHT = 460;
const MASCOT_SIZE = 130;

interface Props {
  /** Scroll-driven parallax progress (−1, 0, +1). 0 = this slide active. */
  parallax: Animated.SharedValue<number>;
}

export function FloatingLogosHero({ parallax }: Props) {
  const heroStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: parallax.value * 20 }],
  }));

  return (
    <Animated.View style={[styles.root, heroStyle]}>
      <View style={styles.canvas}>
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
            />
          );
        })}

        {/* Mascot — the sloth. We use the bundled logo asset as a
            stand-in; swap for a dedicated hero illustration later. */}
        <MascotPulse />
      </View>
    </Animated.View>
  );
}

function FloatingLogo({
  domain,
  x,
  y,
  size,
  delay,
}: {
  domain: string;
  x: number;
  y: number;
  size: number;
  delay: number;
}) {
  const offset = useSharedValue(0);

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

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
  }));

  // Position in px within the hero canvas (SCREEN_W × HERO_HEIGHT).
  // Subtract half the size so x/y anchor the logo's center.
  const left = SCREEN_W * x - size / 2;
  const top = HERO_HEIGHT * y - size / 2;

  return (
    <Animated.View
      style={[
        styles.logoCard,
        {
          width: size,
          height: size,
          borderRadius: Math.max(14, size * 0.26),
          left,
          top,
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
    <Animated.View style={[styles.mascot, style]}>
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
