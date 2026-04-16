// Empty state for SubscriptionsScreen when the list is 0.
//
// Sits in place of the WalletCard stack (below the header + controls) and
// invites the user to add their first subscription. Visual language matches
// this screen's minimalist, typographic feel — no cards, just a big
// "Empieza aquí" block and a vertical list of popular services the user can
// tap to pre-fill the create form.
//
// Tap behavior
//   · Row with logo → opens CreateSubscriptionSheet with that platform
//     prefilled (name + logoUrl). Same helper AddSubscriptionOverlay uses.
//   · "Ver todas las opciones" → opens the full AddSubscriptionOverlay so
//     the user can pick a service not in this short list or add manually.

import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { useTheme } from '../../design/useTheme';
import { fontFamily, fontSize, letterSpacing, lineHeight } from '../../design/typography';
import { PLATFORMS, logoUrlFromDomain } from '../../lib/constants/platforms';
import { useCreateSubscriptionStore } from '../add-subscription/useCreateSubscriptionStore';

// 6 most recognizable platforms — long enough to feel populated, short
// enough to fit above the fold on a small iPhone.
const FEATURED_IDS = [
  'netflix',
  'spotify',
  'disney-plus',
  'apple-tv',
  'prime-video',
  'notion',
] as const;

const FEATURED = FEATURED_IDS
  .map((id) => PLATFORMS.find((p) => p.id === id))
  .filter((p): p is NonNullable<typeof p> => !!p);

export function SubscriptionsEmptyState() {
  const { colors, isDark } = useTheme();

  const rowBg = isDark ? '#1C1C1E' : '#F5F5F5';
  const logoBg = isDark ? '#2C2C2E' : '#FFFFFF';

  const handleSelect = (name: string, domain: string) => {
    useCreateSubscriptionStore.getState().open({
      name,
      logoUrl: logoUrlFromDomain(domain),
    });
  };

  const handleManual = () => {
    useCreateSubscriptionStore.getState().open();
  };

  return (
    <View style={styles.root}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        Todavía no tienes suscripciones
      </Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Añade la primera para ver cuánto gastas cada mes y cuándo se renueva.
      </Text>

      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
        Empieza con una popular
      </Text>

      <View style={styles.list}>
        {FEATURED.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => handleSelect(p.name, p.domain)}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: rowBg },
              pressed && { opacity: 0.85 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Añadir ${p.name}`}
          >
            <View style={[styles.logoBox, { backgroundColor: logoBg }]}>
              <Image
                source={{ uri: logoUrlFromDomain(p.domain) }}
                style={styles.logoImg}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.rowText, { color: colors.textPrimary }]}>
              {p.name}
            </Text>
            <ChevronRight
              size={18}
              strokeWidth={2}
              color={colors.textMuted}
            />
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={handleManual}
        style={({ pressed }) => [
          styles.seeAll,
          pressed && { opacity: 0.7 },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Añadir manualmente"
      >
        <Text style={[styles.seeAllText, { color: colors.textPrimary }]}>
          Añadir manualmente
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  title: {
    ...fontFamily.extrabold,
    fontSize: fontSize[28],
    lineHeight: fontSize[28] * lineHeight.tight,
    letterSpacing: letterSpacing.tight,
    marginBottom: 8,
  },
  subtitle: {
    ...fontFamily.regular,
    fontSize: fontSize[16],
    lineHeight: fontSize[16] * 1.45,
    marginBottom: 28,
  },
  sectionLabel: {
    ...fontFamily.bold,
    fontSize: fontSize[12],
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  list: {
    gap: 8,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  logoBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImg: {
    width: 28,
    height: 28,
  },
  rowText: {
    flex: 1,
    ...fontFamily.bold,
    fontSize: fontSize[17],
    letterSpacing: -0.1,
  },
  seeAll: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  seeAllText: {
    ...fontFamily.bold,
    fontSize: fontSize[15],
    letterSpacing: -0.1,
    textDecorationLine: 'underline',
  },
});
