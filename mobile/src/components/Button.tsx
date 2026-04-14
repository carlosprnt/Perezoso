// Phase 3 — Shared UI primitive: Button
// Replicates the web app's Button component exactly:
//   4 variants: primary, secondary, ghost, danger
//   3 sizes: sm, md, lg (all h-12 = 48px height)
//   loading state with spinner
//   disabled state with opacity 0.4
//   pressable behavior (scale 0.98)
//
// The button's physical weight (48px height, 16px rounded-2xl corners,
// semibold text) is a product identity trait. Generic thin buttons
// or pill-shaped buttons would break the visual language.

import React, { type ReactNode } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  type StyleProp,
  type GestureResponderEvent,
} from 'react-native';
import { useTheme } from '../design/useTheme';
import { fontFamily, fontSize, lineHeight } from '../design/typography';
import { radius } from '../design/radius';
import { opacity } from '../design/opacity';
import { Pressable } from './Pressable';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  onPress?: (e: GestureResponderEvent) => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  onPress,
  disabled = false,
  loading = false,
  icon,
  style,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  const { colors, isDark } = useTheme();
  const isDisabled = disabled || loading;

  const variantStyle = getVariantStyle(variant, colors, isDark);
  const sizeStyle = getSizeStyle(size);

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      testID={testID}
      style={[
        styles.base,
        variantStyle.container,
        sizeStyle.container,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variantStyle.textColor}
          style={styles.spinner}
        />
      ) : icon ? (
        <View style={sizeStyle.iconGap}>{icon}</View>
      ) : null}
      <Text
        style={[
          sizeStyle.text,
          { color: variantStyle.textColor },
        ]}
      >
        {children}
      </Text>
    </Pressable>
  );
}

// ─── Variant styles ─────────────────────────────────────────────────
// Exact colors from web: Card.tsx analysis

function getVariantStyle(
  variant: Variant,
  colors: ReturnType<typeof useTheme>['colors'],
  isDark: boolean,
): { container: ViewStyle; textColor: string } {
  switch (variant) {
    case 'primary':
      return {
        container: {
          backgroundColor: '#000000',
          borderColor: '#000000',
          borderWidth: 1,
        },
        textColor: '#FFFFFF',
      };
    case 'secondary':
      return {
        container: {
          backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF',
          borderColor: isDark ? '#3A3A3C' : '#D4D4D4',
          borderWidth: 1,
        },
        textColor: isDark ? '#F2F2F7' : '#000000',
      };
    case 'ghost':
      return {
        container: {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          borderWidth: 1,
        },
        textColor: isDark ? '#AEAEB2' : '#000000',
      };
    case 'danger':
      return {
        container: {
          backgroundColor: '#DC2626',
          borderColor: '#DC2626',
          borderWidth: 1,
        },
        textColor: '#FFFFFF',
      };
  }
}

// ─── Size styles ────────────────────────────────────────────────────
// Web: all sizes are h-12 (48px). Difference is padding + font size.

function getSizeStyle(size: Size): {
  container: ViewStyle;
  text: TextStyle;
  iconGap: ViewStyle;
} {
  switch (size) {
    case 'sm':
      return {
        container: { paddingHorizontal: 16 },
        text: {
          fontFamily: fontFamily.semibold,
          fontSize: fontSize[14],
          lineHeight: fontSize[14] * lineHeight.none,
        },
        iconGap: { marginRight: 6 },
      };
    case 'md':
      return {
        container: { paddingHorizontal: 16 },
        text: {
          fontFamily: fontFamily.semibold,
          fontSize: fontSize[14],
          lineHeight: fontSize[14] * lineHeight.none,
        },
        iconGap: { marginRight: 8 },
      };
    case 'lg':
      return {
        container: { paddingHorizontal: 24 },
        text: {
          fontFamily: fontFamily.semibold,
          fontSize: fontSize[14],
          lineHeight: fontSize[14] * lineHeight.none,
        },
        iconGap: { marginRight: 8 },
      };
  }
}

const styles = StyleSheet.create({
  base: {
    height: 48,
    borderRadius: radius['3xl'], // 16px = rounded-2xl in Tailwind
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: opacity.disabled, // 0.4
  },
  spinner: {
    marginRight: 8,
  },
});
