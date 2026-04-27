// Phase 3 — Shared UI primitive: Divider
// Simple horizontal line separator.
// Web uses border-top with theme-aware colors.

import React from 'react';
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { useTheme } from '../design/useTheme';
import { borderWidth } from '../design/borders';

interface DividerProps {
  /** Override color */
  color?: string;
  /** Horizontal margin (for inset dividers). Default: 0 */
  inset?: number;
  style?: StyleProp<ViewStyle>;
}

export function Divider({ color, inset = 0, style }: DividerProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.line,
        {
          backgroundColor: color ?? colors.borderLight,
          marginHorizontal: inset,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  line: {
    height: StyleSheet.hairlineWidth,
  },
});
