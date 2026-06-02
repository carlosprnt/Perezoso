// Logo confetti overlay — matches web's BubbleOverlay
// Logos float upward like bubbles from the tap origin.
// Each logo: pop in with spring, float up with wobble, fade out.
// Uses Image (PNG from Google Favicons) — not SvgUri.

import React, { useEffect, useRef, useMemo } from 'react';
import { View, Image, StyleSheet, Animated, Easing } from 'react-native';

const LOGO_SIZE = 44;
const PARTICLE_COUNT = 12;

interface LogoParticle {
  url: string;
  delay: number;
  duration: number;
  driftY: number;
  driftX: number;
  peakScale: number;
  wobbleAmp: number;
  wobbleFreq: number;
}

function generateParticles(logoUrls: string[]): LogoParticle[] {
  const urls: string[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    urls.push(logoUrls[i % logoUrls.length]);
  }

  return urls.map((url, i) => {
    // Spread particles in a fan pattern from center
    const angle = ((i / PARTICLE_COUNT) * Math.PI * 0.8) + Math.PI * 0.1; // 10°-170° arc
    const speed = 180 + Math.random() * 200;

    return {
      url,
      delay: i * 120 + Math.random() * 80, // tighter stagger
      duration: 2200 + Math.random() * 800,
      driftY: -(Math.sin(angle) * speed + 80), // always upward
      driftX: Math.cos(angle) * speed * 0.5 * (Math.random() > 0.5 ? 1 : -1),
      peakScale: 0.6 + Math.random() * 0.5,
      wobbleAmp: 3 + Math.random() * 8,
      wobbleFreq: 2 + Math.random() * 3,
    };
  });
}

interface LogoConfettiProps {
  logoUrls: string[];
  originX: number;
  originY: number;
  onComplete: () => void;
}

function LogoParticleView({
  particle,
  originX,
  originY,
}: {
  particle: LogoParticle;
  originX: number;
  originY: number;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const wobble = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      // Main trajectory
      Animated.timing(progress, {
        toValue: 1,
        duration: particle.duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();

      // Wobble side-to-side like a real bubble
      Animated.loop(
        Animated.sequence([
          Animated.timing(wobble, {
            toValue: 1,
            duration: 300 + Math.random() * 200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(wobble, {
            toValue: -1,
            duration: 300 + Math.random() * 200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }, particle.delay);
    return () => clearTimeout(timer);
  }, []);

  const translateY = progress.interpolate({
    inputRange: [0, 0.15, 1],
    outputRange: [0, particle.driftY * 0.1, particle.driftY],
  });
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, particle.driftX],
  });
  const wobbleX = wobble.interpolate({
    inputRange: [-1, 1],
    outputRange: [-particle.wobbleAmp, particle.wobbleAmp],
  });
  const scale = progress.interpolate({
    inputRange: [0, 0.08, 0.2, 0.75, 1],
    outputRange: [0, particle.peakScale * 1.15, particle.peakScale, particle.peakScale * 0.9, 0.3],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.08, 0.15, 0.7, 1],
    outputRange: [0, 0.9, 1, 0.9, 0],
  });
  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${(Math.random() - 0.5) * 30}deg`],
  });

  return (
    <Animated.View
      style={[
        styles.logo,
        {
          left: originX - LOGO_SIZE / 2,
          top: originY - LOGO_SIZE / 2,
          opacity,
          transform: [
            { translateX },
            { translateY },
            { translateX: wobbleX },
            { scale },
            { rotate },
          ],
        },
      ]}
    >
      <View style={styles.logoInner}>
        <Image
          source={{ uri: particle.url }}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>
    </Animated.View>
  );
}

export function LogoConfetti({ logoUrls, originX, originY, onComplete }: LogoConfettiProps) {
  const particles = useMemo(
    () => generateParticles(logoUrls),
    [logoUrls],
  );

  useEffect(() => {
    const maxTime = particles.reduce(
      (max, p) => Math.max(max, p.delay + p.duration),
      0,
    );
    const timer = setTimeout(onComplete, maxTime + 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.overlay} pointerEvents="none">
      {particles.map((p, i) => (
        <LogoParticleView
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
  logo: {
    position: 'absolute',
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  logoInner: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  logoImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
});
