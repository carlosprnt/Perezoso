// Money confetti overlay — matches web's spawnMoneyConfetti()
// 40 emoji particles with realistic physics: multi-burst, gravity, spin, tumble
// Emojis: 💸 💵 💶 💰 🤑 💴 🪙 💎
// Duration: ~2.8s, staggered bursts for natural feel

import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';

const EMOJIS = ['💸', '💵', '💶', '💰', '🤑', '💴', '🪙', '💎'];
const PARTICLE_COUNT = 40;
const DURATION = 2800;

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
    // 3 bursts: immediate, +100ms, +250ms for cascade effect
    const burst = i < 15 ? 0 : i < 28 ? 100 : 250;
    const delay = burst + Math.random() * 60;

    // Wider spread for outer bursts
    const spread = burst === 0 ? 1 : burst === 100 ? 1.3 : 1.6;
    const vx = (Math.random() - 0.5) * 16 * spread;
    const vy = -(Math.random() * 20 + 5);
    const gravity = 0.45;

    const endX = vx * 45;
    const peakY = (vy * vy) / (2 * gravity);
    const endY = vy * 140 + 0.5 * gravity * 140 * 140;

    return {
      emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      size: Math.random() * 12 + 20,
      delay,
      peakY: Math.min(peakY, 280),
      endX: Math.max(-240, Math.min(240, endX)),
      endY: Math.min(endY, 700),
      rotation: (Math.random() - 0.5) * 900,
      scaleEnd: 0.3 + Math.random() * 0.4,
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

  const translateX = progress.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, particle.endX * 0.5, particle.endX],
  });
  const translateY = progress.interpolate({
    inputRange: [0, 0.12, 0.3, 0.6, 1],
    outputRange: [0, -particle.peakY * 0.7, -particle.peakY, particle.endY * 0.3, particle.endY],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.05, 0.55, 0.85, 1],
    outputRange: [0, 1, 1, 0.6, 0],
  });
  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${particle.rotation}deg`],
  });
  const scale = progress.interpolate({
    inputRange: [0, 0.05, 0.15, 0.8, 1],
    outputRange: [0.2, 1.1, 1, 0.85, particle.scaleEnd],
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
    const timer = setTimeout(onComplete, DURATION + 400);
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
