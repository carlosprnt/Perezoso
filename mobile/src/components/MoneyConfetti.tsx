// Money confetti overlay — matches web's spawnMoneyConfetti()
// 32 emoji particles with physics: velocity, gravity, friction, rotation
// Emojis: 💸 💵 💶 💰 🤑 💴
// Duration: ~2.2s, gravity 0.55, friction 0.98x

import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing } from 'react-native';

const EMOJIS = ['💸', '💵', '💶', '💰', '🤑', '💴'];
const PARTICLE_COUNT = 32;
const DURATION = 2200; // ~130 frames at 60fps
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface Particle {
  emoji: string;
  size: number;
  // Pre-computed trajectory points (approximate physics with keyframes)
  peakY: number;
  endX: number;
  endY: number;
  rotation: number;
}

function generateParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, () => {
    const vx = (Math.random() - 0.5) * 14;
    const vy = -(Math.random() * 18 + 6);
    // Approximate physics: x drifts, y arcs up then down
    const endX = vx * 40; // friction-dampened displacement
    const peakY = (vy * vy) / (2 * 0.55); // peak height (negative = up)
    const endY = vy * 130 + 0.5 * 0.55 * 130 * 130; // final Y after 130 frames

    return {
      emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      size: Math.random() * 14 + 18,
      peakY: Math.min(peakY, 250),
      endX: Math.max(-200, Math.min(200, endX)),
      endY: Math.min(endY, 800),
      rotation: (Math.random() - 0.5) * 720,
    };
  });
}

interface MoneyConfettiProps {
  originX: number;
  originY: number;
  onComplete: () => void;
}

export function MoneyConfetti({ originX, originY, onComplete }: MoneyConfettiProps) {
  const particles = useMemo(generateParticles, []);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: DURATION,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start(() => onComplete());
  }, []);

  return (
    <View style={styles.overlay} pointerEvents="none">
      {particles.map((p, i) => {
        const translateX = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, p.endX],
        });
        const translateY = progress.interpolate({
          inputRange: [0, 0.15, 0.35, 1],
          outputRange: [0, -p.peakY * 0.8, -p.peakY, p.endY],
        });
        const opacity = progress.interpolate({
          inputRange: [0, 0.6, 1],
          outputRange: [1, 0.8, 0],
        });
        const rotate = progress.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', `${p.rotation}deg`],
        });

        return (
          <Animated.Text
            key={i}
            style={[
              styles.particle,
              {
                left: originX,
                top: originY,
                fontSize: p.size,
                opacity,
                transform: [{ translateX }, { translateY }, { rotate }],
              },
            ]}
          >
            {p.emoji}
          </Animated.Text>
        );
      })}
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
