// Big month title on the left, circular prev/next nav buttons on the
// right. Month label cross-fades + slides when changing months so the
// transition mirrors the webapp's AnimatePresence behavior.

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../design/useTheme';
import { fontFamily } from '../../design/typography';
import { monthLabel } from './dateHelpers';
import { haptic } from '../../lib/haptics';

interface Props {
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
}

const EASE = Easing.bezier(0.4, 0, 0.2, 1);
const DURATION = 320;

export function CalendarMonthHeader({ year, month, onPrev, onNext }: Props) {
  const { isDark } = useTheme();

  const titleColor = isDark ? '#F2F2F7' : '#000000';
  const btnBg      = isDark ? '#2C2C2E' : '#FFFFFF';
  const btnBorder  = isDark ? '#3A3A3C' : '#E4E4E4';
  const iconColor  = isDark ? '#AEAEB2' : '#333333';

  // Track the previous (year, month) so we can animate on change.
  // Positive direction → swipe title to the left, incoming from right.
  const dir = React.useRef<1 | -1>(1);
  const prev = React.useRef({ year, month });
  const tx      = useSharedValue(0);
  const opacity = useSharedValue(1);

  if (prev.current.year !== year || prev.current.month !== month) {
    const forward =
      year > prev.current.year ||
      (year === prev.current.year && month > prev.current.month);
    dir.current = forward ? 1 : -1;
    prev.current = { year, month };
    // Kick the title in from the new direction.
    tx.value = dir.current * 24;
    opacity.value = 0;
    tx.value = withTiming(0, { duration: DURATION, easing: EASE });
    opacity.value = withTiming(1, { duration: DURATION, easing: EASE });
  }

  const titleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
    opacity: opacity.value,
  }));

  const handlePrev = React.useCallback(() => {
    haptic.selection();
    onPrev();
  }, [onPrev]);

  const handleNext = React.useCallback(() => {
    haptic.selection();
    onNext();
  }, [onNext]);

  return (
    <View style={styles.row}>
      <View style={styles.titleWrap}>
        <Animated.Text
          style={[
            styles.title,
            { color: titleColor, ...fontFamily.bold },
            titleStyle,
          ]}
          numberOfLines={1}
        >
          {monthLabel(year, month)}
        </Animated.Text>
      </View>

      <View style={styles.navGroup}>
        <Pressable
          onPress={handlePrev}
          accessibilityLabel="Mes anterior"
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.navBtn,
            {
              backgroundColor: btnBg,
              borderColor: btnBorder,
              opacity: pressed ? 0.6 : 1,
            },
          ]}
        >
          <ChevronLeft size={17} color={iconColor} strokeWidth={2} />
        </Pressable>
        <Pressable
          onPress={handleNext}
          accessibilityLabel="Mes siguiente"
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.navBtn,
            {
              backgroundColor: btnBg,
              borderColor: btnBorder,
              opacity: pressed ? 0.6 : 1,
            },
          ]}
        >
          <ChevronRight size={17} color={iconColor} strokeWidth={2} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleWrap: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 28,
    lineHeight: 30,
    letterSpacing: -0.4,
  },
  navGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
