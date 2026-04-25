// ThemeToggleButton — binary light ↔ dark toggle with animated transitions.
//
// Composition
//   [ label-text ] [ icon ]
//
// Animation
//   · On tap, the *label* slides down out of view while the new label
//     slides in from the top (two overlaid Texts in a fixed-height slot).
//   · The *icon* crossfades between Sun and Moon while rotating 90°.
//   · A small scale-down press feedback is handled by the wrapper Pressable.
//
// The button reads/writes `usePreferencesStore.appearance` directly, so
// callers just render it without any wiring. The label always reflects
// the *current* state ("Light mode" in light, "Dark mode" in dark) —
// tapping flips to the opposite.

import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Moon, Sun } from 'lucide-react-native';

import { fontFamily, fontSize } from '../design/typography';
import { haptic } from '../lib/haptics';
import { usePreferencesStore } from '../features/settings/useSettingsStore';
import { useTheme } from '../design/useTheme';

interface ThemeToggleButtonProps {
  /** Override color for the label + icon. Defaults to current theme text. */
  color?: string;
  /** Optional container style. */
  style?: ViewStyle;
}

const ROW_HEIGHT = 22;           // slot height for the label slider
const ANIM_DURATION = 320;

export function ThemeToggleButton({ color, style }: ThemeToggleButtonProps) {
  const { colors, isDark } = useTheme();
  const setAppearance = usePreferencesStore((s) => s.setAppearance);
  const resolvedColor = color ?? colors.textPrimary;

  // 0 = light mode, 1 = dark mode. Drives every piece of the animation.
  const progress = useSharedValue(isDark ? 1 : 0);

  // Keep the shared value in sync when the theme flips elsewhere
  // (e.g. the Apariencia row in the settings sheet).
  useEffect(() => {
    progress.value = withTiming(isDark ? 1 : 0, { duration: ANIM_DURATION });
  }, [isDark, progress]);

  const handlePress = () => {
    haptic.selection();
    setAppearance(isDark ? 'Claro' : 'Oscuro');
  };

  // ── Label slot: old slides DOWN out, new slides IN from TOP ─────────
  const lightLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [1, 0, 0], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [0, 1],
          [0, ROW_HEIGHT],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const darkLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [0, 0, 1], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [0, 1],
          [-ROW_HEIGHT, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  // ── Icon crossfade + rotation ───────────────────────────────────────
  const sunStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [1, 0, 0], Extrapolation.CLAMP),
    transform: [
      { rotate: `${interpolate(progress.value, [0, 1], [0, 90], Extrapolation.CLAMP)}deg` },
    ],
  }));

  const moonStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [0, 0, 1], Extrapolation.CLAMP),
    transform: [
      { rotate: `${interpolate(progress.value, [0, 1], [-90, 0], Extrapolation.CLAMP)}deg` },
    ],
  }));

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={8}
      style={({ pressed }) => [styles.root, pressed && { opacity: 0.7 }, style]}
      accessibilityRole="button"
      accessibilityLabel={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      <View style={styles.labelSlot}>
        {/* Invisible sizer — widest label reserves the slot width so the
            row doesn't jump when the label swaps. */}
        <Animated.Text
          style={[styles.label, styles.labelSizer]}
          numberOfLines={1}
        >
          Light mode
        </Animated.Text>
        <Animated.Text
          style={[styles.label, styles.labelAbsolute, { color: resolvedColor }, lightLabelStyle]}
          numberOfLines={1}
        >
          Light mode
        </Animated.Text>
        <Animated.Text
          style={[styles.label, styles.labelAbsolute, { color: resolvedColor }, darkLabelStyle]}
          numberOfLines={1}
        >
          Dark mode
        </Animated.Text>
      </View>
      <View style={styles.iconSlot}>
        <Animated.View style={[styles.iconLayer, sunStyle]}>
          <Sun size={18} color={resolvedColor} strokeWidth={2} />
        </Animated.View>
        <Animated.View style={[styles.iconLayer, moonStyle]}>
          <Moon size={18} color={resolvedColor} strokeWidth={2} />
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  labelSlot: {
    height: ROW_HEIGHT,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  label: {
    ...fontFamily.regular,
    fontSize: fontSize[14],
    letterSpacing: -0.1,
    lineHeight: ROW_HEIGHT,
  },
  labelSizer: {
    opacity: 0,
  },
  labelAbsolute: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  iconSlot: {
    width: 18,
    height: 18,
  },
  iconLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
