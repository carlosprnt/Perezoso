// Screenshot-based hero — shows a full phone screenshot asset with the
// same parallax/scale motion used by the mockup heroes. Mirrors the web
// app's behavior where slides 2+ swap in static PNGs from /public/onboarding.

import React from 'react';
import { Image, StyleSheet } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

// Ratio of the source PNGs (1080×2340).
const IMG_ASPECT = 1080 / 2340;

interface Props {
  source: number;
  parallax: SharedValue<number>;
}

export function ScreenshotHero({ source, parallax }: Props) {
  const heroStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: parallax.value * 22 },
      {
        scale: interpolate(
          Math.abs(parallax.value),
          [0, 1],
          [1, 0.96],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return (
    <Animated.View style={[styles.root, heroStyle]}>
      <Image source={source} style={styles.img} resizeMode="cover" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Mirror of the web: absolutely anchored at 100px from top, 20px sides,
  // extended to the bottom — the bottom sheet (also absolute) covers the
  // excess so the screenshot reads as "full image, anchored from the top".
  root: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    bottom: 0,
    overflow: 'hidden',
  },
  img: {
    width: '100%',
    aspectRatio: IMG_ASPECT,
  },
});
