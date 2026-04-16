// Empty state for DashboardScreen when there are 0 subscriptions.
//
// Replaces the hero + card stack so the screen doesn't show "0,00€ al mes"
// next to a bunch of blank cards. Feels more welcome-mat than list:
//   · big gradient card hero with a friendly headline
//   · "Prueba con una" — horizontal scroll of popular platform pills
//   · primary "Añadir una suscripción" button → opens AddSubscriptionOverlay
//
// Distinct from SubscriptionsEmptyState on purpose: this one is visual and
// centered, the other one is list-style. Matches each screen's own language
// (dashboard = insight cards, subs = wallet rows).

import React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, Sparkles } from 'lucide-react-native';

import { useTheme } from '../../design/useTheme';
import {
  fontFamily,
  fontSize,
  letterSpacing,
  lineHeight,
} from '../../design/typography';
import { radius } from '../../design/radius';
import { PLATFORMS, logoUrlFromDomain } from '../../lib/constants/platforms';
import { useCreateSubscriptionStore } from '../add-subscription/useCreateSubscriptionStore';

// 8 popular options — enough to feel like a catalog, fits one horizontal
// scroll before the "+" tile at the end.
const FEATURED_IDS = [
  'netflix',
  'spotify',
  'disney-plus',
  'apple-tv',
  'prime-video',
  'hbo-max',
  'youtube-premium',
  'notion',
] as const;

const FEATURED = FEATURED_IDS
  .map((id) => PLATFORMS.find((p) => p.id === id))
  .filter((p): p is NonNullable<typeof p> => !!p);

export function DashboardEmptyState() {
  const { colors, isDark } = useTheme();

  const heroGradient: [string, string] = isDark
    ? ['#1C1C1E', '#0A0A0A']
    : ['#F5F5F5', '#EDEDED'];
  const tileBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const tileBorder = isDark ? '#2C2C2E' : '#EEEEEE';

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
      {/* Hero — soft gradient card with greeting + CTA */}
      <LinearGradient
        colors={heroGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={[styles.iconBubble, { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' }]}>
          <Sparkles size={24} strokeWidth={2} color={colors.textPrimary} />
        </View>
        <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
          Empieza a ver tus gastos
        </Text>
        <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
          Añade una suscripción y te mostraremos el gasto mensual, las
          próximas renovaciones y dónde puedes ahorrar.
        </Text>

        <Pressable
          onPress={handleManual}
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: colors.textPrimary },
            pressed && { opacity: 0.85 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Añadir una suscripción"
        >
          <Plus size={18} strokeWidth={2.5} color={colors.background} />
          <Text style={[styles.primaryBtnText, { color: colors.background }]}>
            Añadir una suscripción
          </Text>
        </Pressable>
      </LinearGradient>

      {/* Popular services — horizontal scroll of logo tiles */}
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
        Prueba con una popular
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tilesScroll}
      >
        {FEATURED.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => handleSelect(p.name, p.domain)}
            style={({ pressed }) => [
              styles.tile,
              { backgroundColor: tileBg, borderColor: tileBorder },
              pressed && { opacity: 0.85 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Añadir ${p.name}`}
          >
            <View style={styles.tileLogoWrap}>
              <Image
                source={{ uri: logoUrlFromDomain(p.domain) }}
                style={styles.tileLogo}
                resizeMode="contain"
              />
            </View>
            <Text
              style={[styles.tileText, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {p.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 10,
    paddingTop: 20,
  },
  hero: {
    borderRadius: radius.card,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  iconBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    ...fontFamily.extrabold,
    fontSize: fontSize[28],
    lineHeight: fontSize[28] * lineHeight.tight,
    letterSpacing: letterSpacing.tight,
    marginBottom: 8,
  },
  heroSubtitle: {
    ...fontFamily.regular,
    fontSize: fontSize[15],
    lineHeight: fontSize[15] * 1.5,
    marginBottom: 20,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 9999,
  },
  primaryBtnText: {
    ...fontFamily.bold,
    fontSize: fontSize[15],
    letterSpacing: -0.1,
  },

  sectionLabel: {
    ...fontFamily.bold,
    fontSize: fontSize[12],
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  tilesScroll: {
    gap: 10,
    paddingHorizontal: 10,
    paddingBottom: 4,
  },
  tile: {
    width: 112,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  tileLogoWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  tileLogo: {
    width: 36,
    height: 36,
  },
  tileText: {
    ...fontFamily.bold,
    fontSize: fontSize[13],
    letterSpacing: -0.1,
    textAlign: 'center',
  },
});
