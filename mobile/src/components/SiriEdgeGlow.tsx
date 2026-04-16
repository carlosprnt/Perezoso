// SiriEdgeGlow — one continuous glowing stroke traces the rounded
// perimeter of the screen, with a green → cyan → violet → pink →
// green conic-like gradient slowly revolving around the device.
//
// How it's built
// ──────────────
// React Native doesn't support gradient borders natively. We fake the
// ring by masking a large rotating rectangular gradient with a
// ring-shaped mask:
//
//   MaskedView.mask = a transparent View with a rounded borderRadius
//                     plus a thick white borderWidth. The mask's
//                     alpha is 1 only on that border ring; everything
//                     inside (and outside the screen) is 0.
//   MaskedView.content = an oversized `LinearGradient` rotating on
//                        its own axis. Because the gradient is bigger
//                        than the screen, the rotation never exposes
//                        empty corners.
//
// Two layers are stacked to imitate a blurred neon stroke:
//
//   1. Halo layer  — ~24 px border, soft (opacity ~0.5). Fakes blur.
//   2. Core layer  — ~3 px border, crisp. The sharp line itself.
//
// Both read the same rotation shared value so they stay perfectly
// in sync. Expo Go compatible — only uses expo-linear-gradient,
// @react-native-masked-view, and reanimated.

import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// The rotating gradient needs to stay bigger than the screen at every
// angle. 1.5× the diagonal is more than enough at 45°.
const DIAGONAL = Math.sqrt(SCREEN_W * SCREEN_W + SCREEN_H * SCREEN_H);
const ROTOR_SIZE = Math.ceil(DIAGONAL * 1.5);
const ROTOR_OFFSET = (ROTOR_SIZE - Math.max(SCREEN_W, SCREEN_H)) / 2;

// iPhone 14/15/16 screen corner radius is ~55 pt. Good-looking on
// modern devices; on square-cornered iPhone SE it still reads as a
// rounded rectangle floating just inside the edges.
const SCREEN_CORNER_R = 55;

const CYCLE_MS = 4800;
const FADE_IN_MS = 520;
const FADE_OUT_MS = 420;

// Four-stop gradient so every colour shows through the ring on every
// full rotation. Extra "return to emerald" stop makes the animation
// seamless at the loop point.
const GRADIENT_COLORS = [
  '#34D399', // emerald 400
  '#22D3EE', // cyan 400
  '#A855F7', // violet 500
  '#EC4899', // pink 500
  '#34D399', // emerald again → seamless wrap
];
const GRADIENT_LOCATIONS = [0, 0.28, 0.55, 0.82, 1];

export function SiriEdgeGlow({ visible }: { visible: boolean }) {
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Keep the rotation ticking so the halo is "alive" the moment we
    // fade in. Restarting it each time would give a dead first frame.
    rotation.value = withRepeat(
      withTiming(360, { duration: CYCLE_MS, easing: Easing.linear }),
      -1,
    );
  }, [rotation]);

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, {
      duration: visible ? FADE_IN_MS : FADE_OUT_MS,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
    });
  }, [visible, opacity]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, overlayStyle]}
    >
      {/* Soft halo — the "bleed" that reads as blur. */}
      <RingLayer
        rotation={rotation}
        borderWidth={24}
        opacity={0.55}
      />
      {/* Secondary mid stroke — adds body between the halo and core. */}
      <RingLayer
        rotation={rotation}
        borderWidth={10}
        opacity={0.75}
      />
      {/* Crisp core stroke — the sharp neon line itself. */}
      <RingLayer
        rotation={rotation}
        borderWidth={2.5}
        opacity={1}
      />
    </Animated.View>
  );
}

function RingLayer({
  rotation,
  borderWidth,
  opacity,
}: {
  rotation: SharedValue<number>;
  borderWidth: number;
  opacity: number;
}) {
  const rotorStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View style={[StyleSheet.absoluteFill, { opacity }]}>
      <MaskedView
        style={StyleSheet.absoluteFill}
        maskElement={
          // A View with a rounded border paints its alpha as a ring:
          // 1 under the border stroke, 0 inside and outside.
          <View
            style={{
              flex: 1,
              borderWidth,
              borderColor: '#FFFFFF',
              borderRadius: SCREEN_CORNER_R,
              backgroundColor: 'transparent',
            }}
          />
        }
      >
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: ROTOR_SIZE,
              height: ROTOR_SIZE,
              left: -ROTOR_OFFSET,
              top: -ROTOR_OFFSET,
            },
            rotorStyle,
          ]}
        >
          <LinearGradient
            colors={GRADIENT_COLORS}
            locations={GRADIENT_LOCATIONS}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
      </MaskedView>
    </View>
  );
}
