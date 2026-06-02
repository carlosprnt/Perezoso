// Skeleton screens shown while subscriptions data is loading.
// Used by DashboardScreen and SubscriptionsScreen on first mount.

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Skeleton } from './Skeleton';
import { useTheme } from '../design/useTheme';

export function DashboardSkeleton() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 56, backgroundColor: colors.background }]}>
      {/* Greeting line */}
      <Skeleton style={{ width: 180, height: 20, marginBottom: 24 }} borderRadius={6} />

      {/* Hero amount */}
      <Skeleton style={{ width: 120, height: 16, marginBottom: 8 }} borderRadius={4} />
      <Skeleton style={{ width: 220, height: 44, marginBottom: 12 }} borderRadius={8} />

      {/* Second amount */}
      <Skeleton style={{ width: 100, height: 16, marginBottom: 8 }} borderRadius={4} />
      <Skeleton style={{ width: 200, height: 44, marginBottom: 28 }} borderRadius={8} />

      {/* Support text */}
      <Skeleton style={{ width: 260, height: 18, marginBottom: 6 }} borderRadius={5} />
      <Skeleton style={{ width: 180, height: 18, marginBottom: 32 }} borderRadius={5} />

      {/* Card placeholders */}
      <Skeleton style={{ width: '100%', height: 100, marginBottom: 14 }} borderRadius={16} />
      <Skeleton style={{ width: '100%', height: 100, marginBottom: 14 }} borderRadius={16} />
      <Skeleton style={{ width: '100%', height: 80 }} borderRadius={16} />
    </View>
  );
}

export function SubscriptionsSkeleton() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20, backgroundColor: colors.background }]}>
      {/* Title */}
      <Skeleton style={{ width: 200, height: 28, marginBottom: 20 }} borderRadius={6} />

      {/* Summary row */}
      <Skeleton style={{ width: 260, height: 18, marginBottom: 6 }} borderRadius={5} />
      <Skeleton style={{ width: 180, height: 18, marginBottom: 24 }} borderRadius={5} />

      {/* Filter chips */}
      <View style={styles.chipsRow}>
        <Skeleton style={{ width: 70, height: 30 }} borderRadius={15} />
        <Skeleton style={{ width: 90, height: 30 }} borderRadius={15} />
        <Skeleton style={{ width: 80, height: 30 }} borderRadius={15} />
      </View>

      {/* Card skeletons */}
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton
          key={i}
          style={{ width: '100%', height: 90, marginBottom: 12 }}
          borderRadius={24}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
});
