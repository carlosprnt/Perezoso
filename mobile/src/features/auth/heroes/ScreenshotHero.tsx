// Screenshot-based hero — shows a full phone screenshot asset.
// As the user swipes between slides, the active screenshot pivots 3D
// toward the side it's leaving and picks up a soft blur; the incoming
// screenshot arrives tilted from the opposite side and settles flat.
// Mirrors the framer-motion variants used in the web app.

import React from 'react';
import { Dimensions, Image, StyleSheet } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

const AnimatedImage = Animated.createAnimatedComponent(Image);

const { width: SCREEN_W } = Dimensions.get('window');
const SIDE_MARGIN = 20;
const IMG_W = SCREEN_W - SIDE_MARGIN * 2;
// Source PNGs are 1080×2340.
const IMG_H = IMG_W * (2340 / 1080);

// Max rotation angle when the slide is fully off-screen.
const MAX_ROT_DEG = 22;
// Max blur radius at the edges of the transition.
const MAX_BLUR = 10;

interface Props {
  source: number;
  parallax: SharedValue<number>;
}

export function ScreenshotHero({ source, parallax }: Props) {
  const heroStyle = useAnimatedStyle(() => {
    const p = parallax.value;
    const abs = Math.abs(p);
    return {
      opacity: interpolate(abs, [0, 0.8, 1], [1, 0.4, 0], Extrapolation.CLAMP),
      transform: [
        { perspective: 1200 },
        { translateX: p * 40 },
        { rotateY: `${p * MAX_ROT_DEG}deg` },
        {
          scale: interpolate(abs, [0, 1], [1, 0.94], Extrapolation.CLAMP),
        },
      ],
    };
  });

  const imgAnimatedProps = useAnimatedProps(() => ({
    blurRadius: Math.abs(parallax.value) * MAX_BLUR,
  }));

  return (
    <Animated.View style={[styles.root, heroStyle]}>
      <AnimatedImage
        source={source}
        style={styles.img}
        resizeMode="contain"
        animatedProps={imgAnimatedProps}
      />
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
  },
  img: {
    width: IMG_W,
    height: IMG_H,
  },
});
