// Dashboard: ReminderCards
// Replicates web's SavingsOpportunityCard (reminder variant).
//
// Shell: rounded-[32px] bg-white px-4 pt-4 pb-3, shadow subtle
//   [Icon 44x44 rounded-xl gradient bg (135deg #DBEAFE -> #BFDBFE)]
//   [Body text 14px, lineHeight 1.45]
//   [Dismiss button 36px] [CTA button 36px rounded-full]
//
// Icon: Bell from lucide-react (20px, strokeWidth 2, color #1E3A5F)
// The reminder card tells users about annual renewals.
// Key text bolding pattern: specific words are bold (<strong> in web).

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell } from 'lucide-react-native';
import { useTheme } from '../../design/useTheme';
import { fontFamily, fontSize, lineHeight } from '../../design/typography';
import { radius } from '../../design/radius';
import { shadows } from '../../design/shadows';
import { Pressable } from '../../components/Pressable';

interface ReminderCardsProps {
  annualCount: number;
  onActivate?: () => void;
  onDismiss?: () => void;
}

export function ReminderCards({ annualCount, onActivate, onDismiss }: ReminderCardsProps) {
  const { colors, isDark } = useTheme();

  if (annualCount <= 0) return null;

  return (
    <View style={[styles.shell, { backgroundColor: colors.surface }, shadows.cardSm]}>
      {/* Body row */}
      <View style={styles.body}>
        {/* Bell icon with gradient bg */}
        <LinearGradient
          colors={['#DBEAFE', '#BFDBFE']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconWrap}
        >
          <Bell size={20} strokeWidth={2} color="#1E3A5F" />
        </LinearGradient>

        {/* Text */}
        <Text style={[styles.bodyText, { color: colors.textPrimary }]}>
          Podr{'\u00ED'}as evitar una{' '}
          <Text style={styles.bodyBold}>renovaci{'\u00F3'}n anual</Text>
          {' '}por sorpresa si activas un aviso 7 d{'\u00ED'}as antes.
        </Text>
      </View>

      {/* Buttons */}
      <View style={styles.buttons}>
        <Pressable onPress={onDismiss} activeScale={0.97}>
          <View style={styles.dismissBtn}>
            <Text style={[styles.dismissText, {
              color: isDark ? '#636366' : '#8E8E93',
            }]}>No me interesa</Text>
          </View>
        </Pressable>
        <Pressable onPress={onActivate} activeScale={0.97} style={{ flex: 1 }}>
          <View style={[styles.ctaBtn, {
            backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
          }]}>
            <Text style={[styles.ctaText, { color: colors.textPrimary }]}>
              Avisarme 7 d{'\u00ED'}as antes
            </Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: radius.card, // 32px
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12, // gap-3
    marginBottom: 12, // mb-3
  },
  iconWrap: {
    width: 44, // w-11
    height: 44, // h-11
    borderRadius: radius.xl, // 12px
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bodyText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize[14],
    lineHeight: fontSize[14] * 1.45,
  },
  bodyBold: {
    fontFamily: fontFamily.bold,
  },
  buttons: {
    flexDirection: 'row',
    gap: 8, // gap-2
  },
  dismissBtn: {
    height: 36, // h-9
    paddingHorizontal: 16, // px-4
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize[13],
  },
  ctaBtn: {
    height: 36,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  ctaText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize[13],
  },
});
