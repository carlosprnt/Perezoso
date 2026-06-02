// Individual slide shell — holds one hero in its upper section and
// leaves the bottom space clear so the shared bottom sheet can sit
// on top. Every slide exposes a `parallax` shared value equal to
// (page - index), so hero subcomponents can drive their own
// micro-animations off a value that's 0 when active.

import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface Props {
  index: number;
  page: SharedValue<number>;
  children: (parallax: SharedValue<number>) => React.ReactNode;
  heroTopInset: number;
  sheetHeight: number;
}

export function OnboardingSlide({
  index,
  page,
  children,
  heroTopInset,
  sheetHeight,
}: Props) {
  const parallax = useSharedValue(0);

  useAnimatedReaction(
    () => page.value - index,
    (v) => {
      parallax.value = v;
    },
    [index],
  );

  // Slight opacity falloff as the slide leaves center.
  const heroWrapStyle = useAnimatedStyle(() => {
    const d = Math.abs(parallax.value);
    return {
      opacity: interpolate(d, [0, 1], [1, 0.55], Extrapolation.CLAMP),
    };
  });

  return (
    <View style={styles.slide}>
      <Animated.View
        style={[
          styles.heroWrap,
          {
            paddingTop: heroTopInset,
            paddingBottom: sheetHeight,
          },
          heroWrapStyle,
        ]}
      >
        {children(parallax)}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: {
    width: SCREEN_W,
    height: SCREEN_H,
  },
  heroWrap: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
});
