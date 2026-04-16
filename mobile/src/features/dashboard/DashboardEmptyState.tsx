// Empty state for DashboardScreen when there are 0 subscriptions.
//
// Replaces the hero + card stack so the screen doesn't show "0,00€ al mes"
// next to a bunch of blank cards. Light visual language: smaller headline,
// plain CTA button (no icon), and a long vertical list of suggested
// platforms with dividers between rows.

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles } from 'lucide-react-native';

import { useTheme } from '../../design/useTheme';
import { fontFamily, fontSize, lineHeight } from '../../design/typography';
import { radius } from '../../design/radius';
import { useCreateSubscriptionStore } from '../add-subscription/useCreateSubscriptionStore';
import { SuggestionsList } from '../add-subscription/SuggestionsList';

export function DashboardEmptyState() {
  const { colors, isDark } = useTheme();

  const heroGradient: [string, string] = isDark
    ? ['#1C1C1E', '#0A0A0A']
    : ['#F5F5F5', '#EDEDED'];

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
          <Sparkles size={22} strokeWidth={2} color={colors.textPrimary} />
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
          <Text style={[styles.primaryBtnText, { color: colors.background }]}>
            Añadir suscripción
          </Text>
        </Pressable>
      </LinearGradient>

      {/* Suggestions — vertical list, tap any row to prefill the form */}
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        Sugerencia de suscripciones
      </Text>
      <SuggestionsList />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  hero: {
    borderRadius: radius.card,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroTitle: {
    ...fontFamily.extrabold,
    fontSize: 25,
    lineHeight: 25 * lineHeight.tight,
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  heroSubtitle: {
    ...fontFamily.regular,
    fontSize: 15,
    lineHeight: 15 * 1.5,
    marginBottom: 20,
  },
  primaryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 9999,
  },
  primaryBtnText: {
    ...fontFamily.bold,
    fontSize: fontSize[15],
    letterSpacing: -0.1,
  },
  sectionTitle: {
    ...fontFamily.bold,
    fontSize: fontSize[18],
    letterSpacing: -0.2,
    marginBottom: 4,
  },
});
