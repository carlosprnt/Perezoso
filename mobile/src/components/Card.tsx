// Phase 3 — Shared UI primitive: Card
// Replicates the web app's Card component:
//   bg-white dark:bg-[#1C1C1E]
//   rounded-[32px]
//   padding: none | sm(16) | md(20) | lg(24)
//   optional onClick → pressable behavior
//   optional hover border change (mapped to press on mobile)
//
// This is the primary surface container. Subscription cards,
// dashboard sections, settings groups — they all use Card.
// The 32px radius is a defining visual trait of the product.

import React, { type ReactNode } from 'react';
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { useTheme } from '../design/useTheme';
import { radius } from '../design/radius';
import { Pressable } from './Pressable';

type Padding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps {
  children: ReactNode;
  /** Padding preset. Default: 'md' (20px) */
  padding?: Padding;
  /** Makes the card tappable with press feedback */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Accessibility label when tappable */
  accessibilityLabel?: string;
  testID?: string;
}

const PADDING: Record<Padding, number> = {
  none: 0,
  sm: 16,
  md: 20,
  lg: 24,
};

export function Card({
  children,
  padding = 'md',
  onPress,
  style,
  accessibilityLabel,
  testID,
}: CardProps) {
  const { colors } = useTheme();

  const cardStyle: ViewStyle = {
    backgroundColor: colors.surface,
    borderRadius: radius.card, // 32px — product identity
    padding: PADDING[padding],
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        style={[cardStyle, style]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={[cardStyle, style]} testID={testID}>
      {children}
    </View>
  );
}

// ─── CardHeader ─────────────────────────────────────────────────────
// Web: title 17px bold, subtitle 12px, flex between with optional action.

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={headerStyles.container}>
      <View style={headerStyles.textGroup}>
        <Animated_Text
          style={[headerStyles.title, { color: colors.textPrimary }]}
        >
          {title}
        </Animated_Text>
        {subtitle ? (
          <Animated_Text
            style={[headerStyles.subtitle, { color: colors.textSecondary }]}
          >
            {subtitle}
          </Animated_Text>
        ) : null}
      </View>
      {action ? <View>{action}</View> : null}
    </View>
  );
}

// Using Text directly to avoid circular deps — no animation needed here
import { Text as Animated_Text } from 'react-native';
import { fontFamily, fontSize, letterSpacing, lineHeight } from '../design/typography';

const headerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  textGroup: {
    flex: 1,
  },
  title: {
    ...fontFamily.semiBold,
    fontSize: fontSize[18],
    lineHeight: fontSize[18] * lineHeight.tight,
    letterSpacing: letterSpacing.tight,
  },
  subtitle: {
    ...fontFamily.medium,
    fontSize: fontSize[14],
    lineHeight: fontSize[14] * lineHeight.snug,
    marginTop: 2,
  },
});
