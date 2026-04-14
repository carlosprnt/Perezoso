// Dashboard: LogoStack
// Replicates web's LogoStack from DashboardSummaryHero.
// Overlapping circular subscription logos shown inline.
//
// Web: w-8 h-8 (32px), border-2, overlap -10px, rounded-full
//   z-index: 4 - i (first logo highest)
//   Border: #F7F8FA (light) / #121212 (dark)
//   Background: #F0F0F0 (light) / #2C2C2E (dark)
//   "..." dot: bg #E5E5EA/#3A3A3C, text 11px bold #737373/#AEAEB2
//
// Logo URLs must be PNG/JPEG (not SVG) — use Google Favicons API

import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '../../design/useTheme';
import { fontFamily, fontSize } from '../../design/typography';

interface LogoStackProps {
  /** Up to 3 URLs shown; if more exist, show "..." indicator */
  logoUrls: string[];
  /** Total subscription count (determines whether "..." is shown) */
  totalCount: number;
}

const LOGO_SIZE = 32; // w-8 h-8
const OVERLAP = -10; // ml-[-10px]
const BORDER_WIDTH = 2;
const ICON_SIZE = LOGO_SIZE - BORDER_WIDTH * 2 - 4; // 24px

export function LogoStack({ logoUrls, totalCount }: LogoStackProps) {
  const { isDark } = useTheme();
  const borderColor = isDark ? '#121212' : '#F7F8FA';
  const bgColor = isDark ? '#2C2C2E' : '#F0F0F0';
  const dotBg = isDark ? '#3A3A3C' : '#E5E5EA';
  const dotTextColor = isDark ? '#AEAEB2' : '#737373';

  const visibleLogos = logoUrls.slice(0, 3);
  const showDots = totalCount > 3;

  return (
    <View style={styles.container}>
      {visibleLogos.map((url, i) => (
        <View
          key={i}
          style={[
            styles.logoWrap,
            {
              borderColor,
              backgroundColor: bgColor,
              zIndex: 4 - i,
              marginLeft: i === 0 ? 0 : OVERLAP,
            },
          ]}
        >
          <Image
            source={{ uri: url }}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
      ))}
      {showDots ? (
        <View
          style={[
            styles.logoWrap,
            styles.dotWrap,
            {
              borderColor,
              backgroundColor: dotBg,
              zIndex: 0,
              marginLeft: visibleLogos.length > 0 ? OVERLAP : 0,
            },
          ]}
        >
          <Text style={[styles.dotText, { color: dotTextColor }]}>
            ···
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 6,
    marginVertical: -4,
  },
  logoWrap: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    borderWidth: BORDER_WIDTH,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  logoImage: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
  },
  dotWrap: {},
  dotText: {
    ...fontFamily.bold,
    fontSize: fontSize[11],
  },
});
