// Money confetti overlay — matches web's spawnMoneyConfetti()
// 40 emoji particles with realistic physics: multi-burst, gravity, spin.
// Emojis: 💸 💵 💶 💰 🤑 💴 🪙 💎
//
// Motion profile (fluid, minimal friction):
//   0.00 - 0.22  Ascent: strong upward velocity, easeOut to peak
//   0.22 - 1.00  Descent: quadratic free-fall (accelerating), no drag
//   Fade to 0 starts at peak and runs through the entire descent so
//   particles dissolve as they fall instead of piling up at the floor.

import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';

const EMOJIS = ['💸', '💵', '💶', '💰', '🤑', '💴', '🪙', '💎'];
const PARTICLE_COUNT = 40;
const DURATION = 2400;

interface Particle {
  emoji: string;
  size: number;
  delay: number;
  peakY: number;
  endX: number;
  endY: number;
  rotation: number;
  scaleEnd: number;
}

function generateParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    // 3 bursts: immediate, +80ms, +200ms for cascade effect
    const burst = i < 15 ? 0 : i < 28 ? 80 : 200;
    const delay = burst + Math.random() * 50;

    // Wider spread for outer bursts
    const spread = burst === 0 ? 1 : burst === 80 ? 1.3 : 1.6;
    const vx = (Math.random() - 0.5) * 18 * spread;
    const vy = -(Math.random() * 22 + 8);
    const gravity = 0.5;

    // Longer horizontal travel — less drag feel
    const endX = vx * 55;
    const peakY = (vy * vy) / (2 * gravity);
    // Free-fall distance over the descent window
    const endY = Math.min(peakY + 600, 900);

    return {
      emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      size: Math.random() * 12 + 22,
      delay,
      peakY: Math.min(peakY, 320),
      endX: Math.max(-280, Math.min(280, endX)),
      endY,
      rotation: (Math.random() - 0.5) * 720,
      scaleEnd: 0.5 + Math.random() * 0.3,
    };
  });
}

interface MoneyConfettiProps {
  originX: number;
  originY: number;
  onComplete: () => void;
}

function ConfettiParticle({
  particle,
  originX,
  originY,
}: {
  particle: Particle;
  originX: number;
  originY: number;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(progress, {
        toValue: 1,
        duration: DURATION - particle.delay,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start();
    }, particle.delay);
    return () => clearTimeout(timer);
  }, []);

  // Horizontal drift — smooth ease-out
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, particle.endX],
  });

  // Vertical motion: ease-out to peak, then quadratic free-fall.
  // The descent keyframes approximate y = y0 + g*t^2 so speed *grows* over
  // time rather than tapering off — no "hesitation" at the bottom.
  const { peakY, endY } = particle;
  const translateY = progress.interpolate({
    inputRange: [0, 0.10, 0.22, 0.40, 0.60, 0.80, 1.0],
    outputRange: [
      0,
      -peakY * 0.75,
      -peakY,
      // free-fall: quadratic progression (0.25, 0.56, 1.0) of endY from peak
      -peakY + (endY + peakY) * 0.06,
      -peakY + (endY + peakY) * 0.25,
      -peakY + (endY + peakY) * 0.56,
      endY,
    ],
  });

  // Opacity: fade in fast, hold through ascent, fade out across the descent
  const opacity = progress.interpolate({
    inputRange: [0, 0.05, 0.22, 0.45, 0.75, 1],
    outputRange: [0, 1, 1, 0.85, 0.35, 0],
  });

  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${particle.rotation}deg`],
  });

  // Subtle scale breathing — no shrink at end (fade handles disappearance)
  const scale = progress.interpolate({
    inputRange: [0, 0.06, 0.22, 1],
    outputRange: [0.2, 1.1, 1, particle.scaleEnd],
  });

  return (
    <Animated.Text
      style={[
        styles.particle,
        {
          left: originX,
          top: originY,
          fontSize: particle.size,
          opacity,
          transform: [{ translateX }, { translateY }, { rotate }, { scale }],
        },
      ]}
    >
      {particle.emoji}
    </Animated.Text>
  );
}

export function MoneyConfetti({ originX, originY, onComplete }: MoneyConfettiProps) {
  const particles = useMemo(generateParticles, []);

  useEffect(() => {
    const timer = setTimeout(onComplete, DURATION + 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.overlay} pointerEvents="none">
      {particles.map((p, i) => (
        <ConfettiParticle
          key={i}
          particle={p}
          originX={originX}
          originY={originY}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  particle: {
    position: 'absolute',
  },
});
