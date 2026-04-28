// A single day tile inside the calendar grid. Replicates the webapp
// visual: rounded grey tile, day number top-left, logo centered at
// bottom, "+N" badge when a day holds more than one renewal. "Today"
// is marked with a 1.5px black border.

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../../design/useTheme';
import { fontFamily } from '../../design/typography';
import { SubscriptionAvatar } from '../../components/SubscriptionAvatar';
import type { Subscription } from '../subscriptions/types';

interface Props {
  day: number | null;          // null → empty cell (pre-month / post-month)
  isToday: boolean;
  subs: Subscription[];
  onPress?: (day: number, subs: Subscription[]) => void;
}

export function CalendarDayCell({ day, isToday, subs, onPress }: Props) {
  const { isDark } = useTheme();

  const emptyBg   = isDark ? '#252527' : '#F7F8FA';
  const filledBg  = isDark ? '#2C2C2E' : '#F5F5F5';
  const todayLine = isDark ? '#FFFFFF' : '#000000';
  // Day numbers are muted grey across the board — the logo + today
  // border carry the visual weight, so the numbers stay quiet.
  const dayColor  = isDark ? '#8E8E93' : '#A0A0A0';
  const badgeBg   = isDark ? '#3A3A3C' : '#F0F0F0';
  const badgeFg   = isDark ? '#8E8E93' : '#737373';

  // Empty placeholder cells keep the same tile shape as the real cells
  // so the grid feels consistent.
  if (day === null) {
    return (
      <View
        style={[
          styles.cell,
          { backgroundColor: emptyBg, borderColor: 'transparent' },
        ]}
      />
    );
  }

  const hasSubs = subs.length > 0;
  const first   = subs[0];
  const extra   = subs.length - 1;

  const content = (
    <>
      <Text
        style={[
          styles.dayNumber,
          {
            color: dayColor,
            ...(isToday ? fontFamily.semiBold : fontFamily.semiBold),
          },
        ]}
      >
        {day}
      </Text>

      {hasSubs ? (
        <View style={styles.logoWrap}>
          <SubscriptionAvatar
            name={first.name}
            logoUrl={first.logo_url}
            size="sm"
            cornerRadius={8}
          />
          {extra > 0 ? (
            <View style={[styles.overflow, { backgroundColor: badgeBg }]}>
              <Text
                style={[
                  styles.overflowText,
                  { color: badgeFg, ...fontFamily.semiBold },
                ]}
              >
                +{extra}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </>
  );

  const borderColor = isToday ? todayLine : 'transparent';

  if (!hasSubs) {
    return (
      <View
        style={[
          styles.cell,
          { backgroundColor: filledBg, borderColor },
        ]}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => onPress?.(day, subs)}
      accessibilityRole="button"
      accessibilityLabel={`Día ${day}, ${subs.length} renovación${subs.length === 1 ? '' : 'es'}`}
      style={({ pressed }) => [
        styles.cell,
        {
          backgroundColor: filledBg,
          borderColor,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        },
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 8,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  dayNumber: {
    fontSize: 13,
    lineHeight: 13,
  },
  logoWrap: {
    marginTop: 'auto',
    alignSelf: 'center',
    alignItems: 'center',
    gap: 3,
  },
  overflow: {
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 999,
  },
  overflowText: {
    fontSize: 9,
    lineHeight: 9,
  },
});
