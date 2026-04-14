// Phase 3 — Shared UI primitive: Badge
// Replicates the web app's StatusBadge and CategoryBadge.
//
// StatusBadge: inline pill showing subscription status (active/trial/paused/cancelled)
//   Web: inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border
//   Colors are WCAG AA compliant pairs.
//
// CategoryBadge: inline pill showing category label with colored background.

import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { fontFamily, fontSize, lineHeight } from '../design/typography';
import { radius } from '../design/radius';
import { borderWidth } from '../design/borders';

// ─── Status Badge ───────────────────────────────────────────────────

type SubscriptionStatus = 'active' | 'trial' | 'paused' | 'cancelled';

interface StatusBadgeProps {
  status: SubscriptionStatus;
}

// Exact Tailwind color values from the web app
const STATUS_COLORS: Record<SubscriptionStatus, {
  bg: string;
  text: string;
  border: string;
}> = {
  active: {
    bg: '#dcfce7',     // green-100
    text: '#166534',   // green-800
    border: '#86efac', // green-300
  },
  trial: {
    bg: '#e7e5e4',     // stone-200
    text: '#292524',   // stone-800
    border: '#d6d3d1', // stone-300
  },
  paused: {
    bg: '#fef3c7',     // yellow-100
    text: '#854d0e',   // yellow-800 (Tailwind 4 default)
    border: '#fcd34d', // yellow-300
  },
  cancelled: {
    bg: '#f5f5f5',     // neutral-100
    text: '#404040',   // neutral-700
    border: '#d4d4d4', // neutral-300
  },
};

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: 'Activa',
  trial: 'Prueba',
  paused: 'Pausada',
  cancelled: 'Cancelada',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const colors = STATUS_COLORS[status];

  return (
    <View
      style={[
        styles.badgeBase,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.badgeText, { color: colors.text }]}>
        {STATUS_LABELS[status]}
      </Text>
    </View>
  );
}

// ─── Category Badge ─────────────────────────────────────────────────

interface CategoryBadgeProps {
  label: string;
  color: string;
  textColor: string;
  icon?: React.ReactNode;
}

export function CategoryBadge({ label, color, textColor, icon }: CategoryBadgeProps) {
  return (
    <View style={[styles.badgeBase, { backgroundColor: color, borderWidth: 0 }]}>
      {icon ? <View style={styles.categoryIcon}>{icon}</View> : null}
      <Text style={[styles.badgeText, { color: textColor }]}>
        {label}
      </Text>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  badgeBase: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,  // px-2
    paddingVertical: 2,    // py-0.5
    borderRadius: radius.full,
    borderWidth: borderWidth.default,
  },
  badgeText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize[14],
    lineHeight: fontSize[14] * lineHeight.snug,
  },
  categoryIcon: {
    marginRight: 4, // gap-1
  },
});
