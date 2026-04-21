// Screenshot-based hero — shows a full phone screenshot asset with the
// same parallax/scale motion used by the mockup heroes. Mirrors the web
// app's behavior where slides 2+ swap in static PNGs from /public/onboarding.

import React from 'react';
import { Dimensions, Image, StyleSheet } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

const { width: SCREEN_W } = Dimensions.get('window');
const SIDE_MARGIN = 20;
const IMG_W = SCREEN_W - SIDE_MARGIN * 2;
// Source PNGs are 1080×2340.
const IMG_H = IMG_W * (2340 / 1080);

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
      <Image source={source} style={styles.img} resizeMode="contain" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 100,
    left: SIDE_MARGIN,
    width: IMG_W,
    height: IMG_H,
    overflow: 'hidden',
  },
  img: {
    width: IMG_W,
    height: IMG_H,
  },
});
