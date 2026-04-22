// Phase 3 — Shared UI primitive: LogoAvatar
// Replicates the web app's LogoAvatar:
//   Shows a logo image if available, otherwise initials on a
//   deterministic pastel background.
//
// Web:
//   Sizes: sm(32) md(40) lg(48)
//   Shape: rounded-xl (12px)
//   With logo: border border-gray-100 shadow-sm bg-white
//   Initials: deterministic pastel bg/fg via getAvatarPastel
//
// Logo URLs must be PNG/JPEG (not SVG) — use Google Favicons API

import React, { useState } from 'react';
import { View, Text, Image, type ViewStyle, type StyleProp } from 'react-native';
import { fontFamily, fontSize } from '../design/typography';
import { radius } from '../design/radius';
import { shadows } from '../design/shadows';
import { borderWidth } from '../design/borders';

// ─── Size config ────────────────────────────────────────────────────

type AvatarSize = 'sm' | 'md' | 'lg';

const SIZE_CONFIG: Record<AvatarSize, { dimension: number; fontSize: number }> = {
  sm: { dimension: 32, fontSize: fontSize[14] },
  md: { dimension: 40, fontSize: fontSize[14] },
  lg: { dimension: 48, fontSize: fontSize[15] },
};

// ─── Deterministic pastel palette ───────────────────────────────────
// Exact copy from web: lib/utils/logos.ts

const PASTEL_PAIRS: ReadonlyArray<{ bg: string; fg: string }> = [
  { bg: '#FDE8E8', fg: '#9B1C1C' },
  { bg: '#FEF3C7', fg: '#92400E' },
  { bg: '#D1FAE5', fg: '#065F46' },
  { bg: '#DBEAFE', fg: '#1E3A8A' },
  { bg: '#EDE9FE', fg: '#4C1D95' },
  { bg: '#FCE7F3', fg: '#831843' },
  { bg: '#E0F2FE', fg: '#0C4A6E' },
  { bg: '#FEF9C3', fg: '#713F12' },
  { bg: '#DCFCE7', fg: '#14532D' },
  { bg: '#F3E8FF', fg: '#581C87' },
  { bg: '#FFE4E6', fg: '#9F1239' },
  { bg: '#E0E7FF', fg: '#3730A3' },
];

function getAvatarPastel(name: string): { bg: string; fg: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PASTEL_PAIRS[Math.abs(hash) % PASTEL_PAIRS.length];
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

// ─── Component ──────────────────────────────────────────────────────

interface LogoAvatarProps {
  name: string;
  logoUrl?: string | null;
  size?: AvatarSize;
  style?: StyleProp<ViewStyle>;
}

export function LogoAvatar({
  name,
  logoUrl,
  size = 'md',
  style,
}: LogoAvatarProps) {
  const config = SIZE_CONFIG[size];
  const [imgError, setImgError] = useState(false);

  const containerBase: ViewStyle = {
    width: config.dimension,
    height: config.dimension,
    borderRadius: radius.xl, // 12px = rounded-xl
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  };

  // Image logo path
  if (logoUrl && !imgError) {
    return (
      <View
        style={[
          containerBase,
          {
            backgroundColor: '#FFFFFF',
            borderWidth: borderWidth.default,
            borderColor: '#F5F5F5',
          },
          shadows.sm,
          style,
        ]}
      >
        <Image
          source={{ uri: logoUrl }}
          style={{ width: config.dimension, height: config.dimension }}
          resizeMode="cover"
          onError={() => setImgError(true)}
        />
      </View>
    );
  }

  // Initials fallback
  const pastel = getAvatarPastel(name);
  return (
    <View style={[containerBase, { backgroundColor: pastel.bg }, style]}>
      <Text
        style={{
          ...fontFamily.semibold,
          fontSize: config.fontSize,
          color: pastel.fg,
        }}
        numberOfLines={1}
      >
        {getInitials(name)}
      </Text>
    </View>
  );
}

// Re-export utilities for SubscriptionAvatar
export { getAvatarPastel, getInitials };
