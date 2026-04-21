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
const FRAME_MARGIN_X = 32;
const FRAME_WIDTH = SCREEN_W - FRAME_MARGIN_X * 2;

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
    flex: 1,
    width: FRAME_WIDTH,
    alignSelf: 'center',
    overflow: 'hidden',
  },
  img: {
    width: '100%',
    height: '100%',
  },
});
