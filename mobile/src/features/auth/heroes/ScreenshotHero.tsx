// Screenshot-based hero — shows a full phone screenshot asset.
// As the user swipes between slides, the active screenshot pivots 3D
// toward the side it's leaving and picks up a soft blur; the incoming
// screenshot arrives tilted from the opposite side and settles flat.
// Users can also drag the screenshot vertically to peek more content;
// releasing springs it back into place with a small overshoot.

import React from 'react';
import { Dimensions, Image, StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

const { width: SCREEN_W } = Dimensions.get('window');
const SIDE_MARGIN = 20;
const IMG_W = SCREEN_W - SIDE_MARGIN * 2;
// Source PNGs are 1080×2340.
const IMG_H = IMG_W * (2340 / 1080);

// Max rotation angle when the slide is fully off-screen.
const MAX_ROT_DEG = 22;
// Max BlurView intensity (0–100) applied during transition.
const MAX_BLUR_INTENSITY = 38;

interface Props {
  source: number;
  parallax: SharedValue<number>;
}

export function ScreenshotHero({ source, parallax }: Props) {
  const dragY = useSharedValue(0);

  const wrapStyle = useAnimatedStyle(() => {
    const p = parallax.value;
    const abs = Math.abs(p);
    return {
      opacity: interpolate(abs, [0, 0.8, 1], [1, 0.4, 0], Extrapolation.CLAMP),
      transform: [
        { perspective: 1200 },
        { translateX: p * 40 },
        { translateY: dragY.value },
        { rotateY: `${p * MAX_ROT_DEG}deg` },
        {
          scale: interpolate(abs, [0, 1], [1, 0.94], Extrapolation.CLAMP),
        },
      ],
    };
  });

  // BlurView's intensity is animatable via useAnimatedProps on every
  // frame — more reliable than Image's blurRadius prop, which on iOS
  // tends to coalesce updates until the gesture settles.
  const blurAnimatedProps = useAnimatedProps(() => ({
    intensity: Math.abs(parallax.value) * MAX_BLUR_INTENSITY,
  }));

  // Vertical drag-to-peek with rubber-band resistance. Horizontal
  // movement is deferred to the parent paging ScrollView.
  const pan = Gesture.Pan()
    .activeOffsetY([-12, 12])
    .failOffsetX([-24, 24])
    .onUpdate((e) => {
      'worklet';
      const ty = e.translationY;
      // Asymmetric resistance: easier to pull up (peek more of the
      // screenshot) than to push down.
      dragY.value = ty < 0 ? ty * 0.55 : ty * 0.22;
    })
    .onEnd(() => {
      'worklet';
      dragY.value = withSpring(0, {
        damping: 12,
        stiffness: 180,
        mass: 0.8,
      });
    });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.root, wrapStyle]}>
        <Image source={source} style={styles.img} resizeMode="contain" />
        <AnimatedBlurView
          tint="default"
          intensity={0}
          animatedProps={blurAnimatedProps}
          style={styles.blurOverlay}
          pointerEvents="none"
        />
      </Animated.View>
    </GestureDetector>
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
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
