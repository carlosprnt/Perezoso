// Phase 3 — Shared UI primitive: IconButton
// Replicates the web app's close button / icon-only button pattern.
// Web: w-11 h-11 (44px), rounded-full, bg-[#F5F5F5] dark:bg-[#2C2C2E]
// Used in BottomSheet close, settings actions, etc.

import React, { type ReactNode } from 'react';
import { StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { useTheme } from '../design/useTheme';
import { radius } from '../design/radius';
import { Pressable } from './Pressable';

interface IconButtonProps {
  children: ReactNode;
  onPress: () => void;
  /** Visual size preset. Default: 'md' (44px) */
  size?: 'sm' | 'md' | 'lg';
  /** Override background color */
  backgroundColor?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

const SIZE_MAP = {
  sm: 32,
  md: 44,
  lg: 48,
} as const;

export function IconButton({
  children,
  onPress,
  size = 'md',
  backgroundColor,
  disabled = false,
  style,
  accessibilityLabel,
  testID,
}: IconButtonProps) {
  const { colors, isDark } = useTheme();

  const dimension = SIZE_MAP[size];
  const defaultBg = isDark ? '#2C2C2E' : '#F5F5F5';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      activeScale={0.95}
      style={[
        {
          width: dimension,
          height: dimension,
          borderRadius: radius.full,
          backgroundColor: backgroundColor ?? defaultBg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}
