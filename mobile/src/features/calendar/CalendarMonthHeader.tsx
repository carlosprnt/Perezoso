// Big month title on the left, circular prev/next nav buttons on the
// right. Month label cross-fades with a soft blur-like scale when the
// month changes: the outgoing label scales up slightly while fading
// out, the incoming one scales from 1.04 → 1 while fading in. Layered
// on the same spot so the transition reads as "breathing" into place.

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
  const btnBg      = isDark ? '#2C2C2E' : '#F5F5F5';
  const iconColor  = isDark ? '#AEAEB2' : '#333333';

  // Two stacked title layers so the old and new labels can cross-fade
  // without remounting. Whichever slot is "current" holds the freshly
  // set month label; the other holds the label we're transitioning away
  // from.
  const [labelA, setLabelA] = React.useState(monthLabel(year, month));
  const [labelB, setLabelB] = React.useState<string | null>(null);
  const currentSlot = React.useRef<'A' | 'B'>('A');

  const opA = useSharedValue(1);
  const opB = useSharedValue(0);
  const scaleA = useSharedValue(1);
  const scaleB = useSharedValue(1);

  const prev = React.useRef({ year, month });

  if (prev.current.year !== year || prev.current.month !== month) {
    const nextLabel = monthLabel(year, month);
    prev.current = { year, month };

    if (currentSlot.current === 'A') {
      // A → B: move new label to B, fade A out + scale up, fade B in + scale from 1.04
      setLabelB(nextLabel);
      opB.value = 0;
      scaleB.value = 1.04;
      opA.value = withTiming(0, { duration: DURATION, easing: EASE });
      scaleA.value = withTiming(1.08, { duration: DURATION, easing: EASE });
      opB.value = withTiming(1, { duration: DURATION, easing: EASE });
      scaleB.value = withTiming(1, { duration: DURATION, easing: EASE });
      currentSlot.current = 'B';
    } else {
      setLabelA(nextLabel);
      opA.value = 0;
      scaleA.value = 1.04;
      opB.value = withTiming(0, { duration: DURATION, easing: EASE });
      scaleB.value = withTiming(1.08, { duration: DURATION, easing: EASE });
      opA.value = withTiming(1, { duration: DURATION, easing: EASE });
      scaleA.value = withTiming(1, { duration: DURATION, easing: EASE });
      currentSlot.current = 'A';
    }
  }

  const titleAStyle = useAnimatedStyle(() => ({
    opacity: opA.value,
    transform: [{ scale: scaleA.value }],
  }));
  const titleBStyle = useAnimatedStyle(() => ({
    opacity: opB.value,
    transform: [{ scale: scaleB.value }],
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
            styles.titleLayer,
            { color: titleColor, ...fontFamily.medium },
            titleAStyle,
          ]}
          numberOfLines={1}
        >
          {labelA}
        </Animated.Text>
        {labelB !== null ? (
          <Animated.Text
            style={[
              styles.title,
              styles.titleLayer,
              { color: titleColor, ...fontFamily.medium },
              titleBStyle,
            ]}
            numberOfLines={1}
          >
            {labelB}
          </Animated.Text>
        ) : null}
        {/* Invisible sizing placeholder — pushes the row to the correct
            height so the absolutely-positioned title layers stay anchored. */}
        <Text
          style={[styles.title, styles.titleSpacer, { ...fontFamily.medium }]}
          numberOfLines={1}
        >
          {labelA}
        </Text>
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
    position: 'relative',
  },
  title: {
    fontSize: 28,
    lineHeight: 30,
    letterSpacing: -0.4,
  },
  titleLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  titleSpacer: {
    opacity: 0,
  },
  navGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
