// Logo confetti overlay — matches web's BubbleOverlay
// Logos float upward from origin point with staggered timing
// Each logo: scale in, drift up with slight horizontal offset, fade out
// Stagger: 250ms apart, duration 1.8-3.0s each

import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { SvgUri } from 'react-native-svg';

const { width: SCREEN_W } = Dimensions.get('window');
const LOGO_SIZE = 40;

interface LogoParticle {
  url: string;
  delay: number;
  duration: number;
  driftY: number;
  driftX: number;
  peakScale: number;
}

function generateParticles(logoUrls: string[]): LogoParticle[] {
  // Up to 8 logos, repeat if needed for minimum count
  const urls: string[] = [];
  const count = Math.max(8, logoUrls.length);
  for (let i = 0; i < count; i++) {
    urls.push(logoUrls[i % logoUrls.length]);
  }

  return urls.map((url, i) => ({
    url,
    delay: i * 250 + Math.random() * 150,
    duration: 1800 + Math.random() * 1200,
    driftY: -(200 + Math.random() * 180),
    driftX: (Math.random() - 0.5) * 60,
    peakScale: 0.7 + Math.random() * 0.6,
  }));
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

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(progress, {
        toValue: 1,
        duration: particle.duration,
        easing: Easing.bezier(0.15, 0, 0.25, 1),
        useNativeDriver: true,
      }).start();
    }, particle.delay);
    return () => clearTimeout(timer);
  }, []);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, particle.driftY],
  });
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, particle.driftX],
  });
  const scale = progress.interpolate({
    inputRange: [0, 0.15, 0.7, 1],
    outputRange: [0.3, particle.peakScale, particle.peakScale * 0.95, particle.peakScale * 0.9],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.15, 0.7, 1],
    outputRange: [0, 1, 1, 0],
  });

  const isSvg = particle.url.includes('simpleicons') || particle.url.includes('.svg');

  return (
    <Animated.View
      style={[
        styles.logo,
        {
          left: originX - LOGO_SIZE / 2,
          top: originY - LOGO_SIZE / 2,
          opacity,
          transform: [{ translateX }, { translateY }, { scale }],
        },
      ]}
    >
      <View style={styles.logoInner}>
        {isSvg ? (
          <SvgUri uri={particle.url} width={28} height={28} />
        ) : null}
      </View>
    </Animated.View>
  );
}

export function LogoConfetti({ logoUrls, originX, originY, onComplete }: LogoConfettiProps) {
  const particles = useMemo(
    () => generateParticles(logoUrls),
    [logoUrls],
  );

  // Auto-dismiss after all animations complete
  useEffect(() => {
    const maxTime = particles.reduce(
      (max, p) => Math.max(max, p.delay + p.duration),
      0,
    );
    const timer = setTimeout(onComplete, maxTime + 200);
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
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
});
