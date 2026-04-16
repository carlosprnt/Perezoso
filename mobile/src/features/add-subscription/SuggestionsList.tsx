// SuggestionsList — vertical list of popular platforms used by both
// empty states (Dashboard + Subscriptions).
//
// Row: [logo 40×40] · [platform name] · [+ icon on the right]
// Divider: thin gray line between rows (no divider after the last).
// Tap: opens the CreateSubscriptionSheet with that platform prefilled.

import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Plus } from 'lucide-react-native';

import { useTheme } from '../../design/useTheme';
import { fontFamily } from '../../design/typography';
import { PLATFORMS, logoUrlFromDomain } from '../../lib/constants/platforms';
import { useCreateSubscriptionStore } from './useCreateSubscriptionStore';

// Curated order — most recognizable first, mixed across streaming /
// music / productivity so the column feels like a catalog, not a category.
const FEATURED_IDS = [
  'netflix',
  'spotify',
  'disney-plus',
  'apple-tv',
  'prime-video',
  'hbo-max',
  'youtube-premium',
  'notion',
  'apple-music',
  'figma',
  'adobe',
  'canva',
] as const;

const FEATURED = FEATURED_IDS
  .map((id) => PLATFORMS.find((p) => p.id === id))
  .filter((p): p is NonNullable<typeof p> => !!p);

export function SuggestionsList() {
  const { colors, isDark } = useTheme();
  const dividerColor = isDark ? '#2C2C2E' : '#EAEAEA';
  const plusBg = isDark ? '#2C2C2E' : '#F0F0F0';

  const handleSelect = (name: string, domain: string) => {
    useCreateSubscriptionStore.getState().open({
      name,
      logoUrl: logoUrlFromDomain(domain),
    });
  };

  return (
    <View style={styles.list}>
      {FEATURED.map((p, i) => (
        <View key={p.id}>
          <Pressable
            onPress={() => handleSelect(p.name, p.domain)}
            style={({ pressed }) => [
              styles.row,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Añadir ${p.name}`}
          >
            <View style={styles.logoBox}>
              <Image
                source={{ uri: logoUrlFromDomain(p.domain) }}
                style={styles.logoImg}
                resizeMode="contain"
              />
            </View>
            <Text
              style={[styles.name, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {p.name}
            </Text>
            <View style={[styles.plusCircle, { backgroundColor: plusBg }]}>
              <Plus size={18} strokeWidth={2.5} color={colors.textPrimary} />
            </View>
          </Pressable>
          {i < FEATURED.length - 1 && (
            <View style={[styles.divider, { backgroundColor: dividerColor }]} />
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  logoBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  logoImg: {
    width: 28,
    height: 28,
  },
  name: {
    flex: 1,
    ...fontFamily.bold,
    fontSize: 17,
    letterSpacing: -0.1,
  },
  plusCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 54, // align under the name (logo width 40 + gap 14)
  },
});
