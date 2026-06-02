import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

interface Props {
  /** Current page as a continuous value (e.g. scrollX / pageWidth). */
  page: SharedValue<number>;
  count: number;
  activeColor?: string;
  inactiveColor?: string;
}

const DOT_SIZE = 6;
const DOT_GAP = 8;
const ACTIVE_WIDTH = 22;

export function PaginationDots({
  page,
  count,
  activeColor = '#000000',
  inactiveColor = '#D4D4D4',
}: Props) {
  return (
    <View style={styles.row}>
      {Array.from({ length: count }).map((_, i) => (
        <Dot
          key={i}
          index={i}
          page={page}
          activeColor={activeColor}
          inactiveColor={inactiveColor}
        />
      ))}
    </View>
  );
}

interface DotProps {
  index: number;
  page: SharedValue<number>;
  activeColor: string;
  inactiveColor: string;
}

function Dot({ index, page, activeColor, inactiveColor }: DotProps) {
  const style = useAnimatedStyle(() => {
    const distance = Math.abs(page.value - index);
    const t = 1 - Math.min(distance, 1);
    const width = interpolate(
      t,
      [0, 1],
      [DOT_SIZE, ACTIVE_WIDTH],
      Extrapolation.CLAMP,
    );
    const bg = interpolateColor(t, [0, 1], [inactiveColor, activeColor]);
    return {
      width,
      backgroundColor: bg,
    };
  });

  return <Animated.View style={[styles.dot, style]} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: DOT_GAP,
    alignItems: 'center',
  },
  dot: {
    height: DOT_SIZE,
    width: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
});
