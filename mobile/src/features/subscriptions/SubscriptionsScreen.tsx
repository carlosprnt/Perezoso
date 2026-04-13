// Phase 6 — Subscriptions: SubscriptionsScreen
// Replicates the web app's subscription list:
//   Header with title + count (fades in on scroll)
//   Sort mode selector
//   Filter chips (status)
//   WalletCard list with staggered entrance
//   Total monthly cost summary at bottom
//
// Uses mock data for now (Phase 5 will connect to Supabase/Zustand)

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SlidersHorizontal, ChevronDown } from 'lucide-react-native';
import { useTheme } from '../../design/useTheme';
import { fontFamily, fontSize, lineHeight, letterSpacing } from '../../design/typography';
import { radius } from '../../design/radius';
import { useStaggeredEntrance } from '../../motion/useStaggeredEntrance';

import { WalletCard } from './WalletCard';
import { MOCK_SUBSCRIPTIONS } from './mockData';
import type { Subscription, SubscriptionStatus, SortMode } from './types';
import { STATUS_LABELS } from './types';

// Staggered entrance wrapper
function StaggeredItem({ index, children }: { index: number; children: React.ReactNode }) {
  const { animatedStyle } = useStaggeredEntrance({ index });
  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

// Sort functions
function sortSubscriptions(subs: Subscription[], mode: SortMode): Subscription[] {
  const sorted = [...subs];
  switch (mode) {
    case 'alphabetical':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'price_high':
      return sorted.sort((a, b) => b.my_monthly_cost - a.my_monthly_cost);
    case 'price_low':
      return sorted.sort((a, b) => a.my_monthly_cost - b.my_monthly_cost);
    case 'recently_added':
      return sorted.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    default:
      return sorted;
  }
}

const SORT_LABELS: Record<SortMode, string> = {
  alphabetical: 'A-Z',
  price_high: 'Mayor precio',
  price_low: 'Menor precio',
  recently_added: 'Recientes',
};

const SORT_OPTIONS: SortMode[] = ['alphabetical', 'price_high', 'price_low', 'recently_added'];

const STATUS_FILTERS: SubscriptionStatus[] = ['active', 'trial', 'paused', 'cancelled'];

export function SubscriptionsScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [sortMode, setSortMode] = useState<SortMode>('alphabetical');
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | null>(null);
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Filter + sort
  const filtered = useMemo(() => {
    let subs = MOCK_SUBSCRIPTIONS;
    if (statusFilter) {
      subs = subs.filter((s) => s.status === statusFilter);
    }
    return sortSubscriptions(subs, sortMode);
  }, [sortMode, statusFilter]);

  // Stats
  const totalMonthly = filtered.reduce((sum, s) => sum + s.my_monthly_cost, 0);

  const chipBg = isDark ? '#2C2C2E' : '#F0F0F0';
  const chipActiveBg = isDark ? '#FFFFFF' : '#000000';
  const chipActiveFg = isDark ? '#000000' : '#FFFFFF';
  const chipFg = isDark ? '#AEAEB2' : '#616161';

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 100, // FloatingNav space
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Mis suscripciones
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {filtered.length} suscripciones · {totalMonthly.toFixed(2).replace('.', ',')}
              {'\u20AC'}/mes
            </Text>
          </View>
        </View>

        {/* Sort + Filters row */}
        <View style={styles.controlsRow}>
          {/* Sort selector */}
          <Pressable
            style={[styles.sortChip, { backgroundColor: chipBg }]}
            onPress={() => {
              // Cycle through sort modes
              const idx = SORT_OPTIONS.indexOf(sortMode);
              setSortMode(SORT_OPTIONS[(idx + 1) % SORT_OPTIONS.length]);
            }}
          >
            <SlidersHorizontal size={14} strokeWidth={2} color={chipFg} />
            <Text style={[styles.sortLabel, { color: chipFg }]}>
              {SORT_LABELS[sortMode]}
            </Text>
            <ChevronDown size={12} strokeWidth={2} color={chipFg} />
          </Pressable>

          {/* Status filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChips}
          >
            {STATUS_FILTERS.map((status) => {
              const isActive = statusFilter === status;
              return (
                <Pressable
                  key={status}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isActive ? chipActiveBg : chipBg,
                    },
                  ]}
                  onPress={() =>
                    setStatusFilter(isActive ? null : status)
                  }
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color: isActive ? chipActiveFg : chipFg,
                      },
                    ]}
                  >
                    {STATUS_LABELS[status]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Subscription list */}
        <View style={styles.list}>
          {filtered.map((sub, index) => (
            <StaggeredItem key={sub.id} index={index}>
              <WalletCard subscription={sub} />
            </StaggeredItem>
          ))}

          {filtered.length === 0 && (
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No hay suscripciones con este filtro
              </Text>
              <Pressable
                onPress={() => setStatusFilter(null)}
                style={[styles.clearBtn, { backgroundColor: chipBg }]}
              >
                <Text style={[styles.clearBtnText, { color: colors.textPrimary }]}>
                  Limpiar filtros
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize[24],
    lineHeight: fontSize[24] * lineHeight.tight,
    letterSpacing: letterSpacing.tight,
  },
  subtitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize[14],
    lineHeight: fontSize[14] * lineHeight.snug,
    marginTop: 4,
  },
  controlsRow: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  sortLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize[13],
  },
  filterChips: {
    flexDirection: 'row',
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  filterChipText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize[13],
  },
  list: {
    paddingHorizontal: 20,
    gap: 10,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 40,
    gap: 16,
  },
  emptyText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize[15],
  },
  clearBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.full,
  },
  clearBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize[14],
  },
});
