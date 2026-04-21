// Slide 2 hero — animated notification-opt-in card. Shows a
// "turn on renewal alerts" prompt with a wobbling bell, auto-taps the
// CTA, then stagger-reveals several subscriptions with active
// notification badges. The whole sequence loops.

import React, { useEffect } from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  FadeInDown,
  interpolate,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Bell, Check } from 'lucide-react-native';

import { useTheme } from '../../../design/useTheme';
import { fontFamily, fontSize, lineHeight } from '../../../design/typography';
import { radius } from '../../../design/radius';
import { shadows } from '../../../design/shadows';
import { logoUrlFromDomain } from '../../../lib/constants/platforms';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

const { width: SCREEN_W } = Dimensions.get('window');
const SIDE_MARGIN = 20;
const CARD_W = SCREEN_W - SIDE_MARGIN * 2;
const CARD_H = 480;

const MAX_ROT_DEG = 22;
const MAX_BLUR_INTENSITY = 38;

// Total loop cycle duration.
const CYCLE_MS = 8000;
// When the "tap" fires within the cycle.
const TAP_AT = 2200;
// When subscription rows start appearing.
const ROWS_START = 2800;
const ROW_STAGGER = 350;

const NOTIF_SUBS = [
  { domain: 'netflix.com',    name: 'Netflix',          days: '3 días' },
  { domain: 'spotify.com',    name: 'Spotify Premium',  days: '12 días' },
  { domain: 'disneyplus.com', name: 'Disney+',          days: '15 días' },
  { domain: 'youtube.com',    name: 'YouTube Premium',  days: '8 días' },
  { domain: 'amazon.com',     name: 'Amazon Prime',     days: '21 días' },
];

interface Props {
  parallax: SharedValue<number>;
}

export function NotificationHero({ parallax }: Props) {
  // Master clock: 0→1 over CYCLE_MS, repeats. Children derive their
  // show/hide timing from this single shared value.
  const clock = useSharedValue(0);
  const bellRot = useSharedValue(0);
  const btnScale = useSharedValue(1);
  const btnDone = useSharedValue(0);
  const rowScales = NOTIF_SUBS.map(() => useSharedValue(0));

  useEffect(() => {
    // Bell wobble — continuous, independent of cycle.
    bellRot.value = withRepeat(
      withSequence(
        withTiming(12, { duration: 200, easing: Easing.inOut(Easing.sin) }),
        withTiming(-12, { duration: 200, easing: Easing.inOut(Easing.sin) }),
        withTiming(8, { duration: 160, easing: Easing.inOut(Easing.sin) }),
        withTiming(-8, { duration: 160, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 140, easing: Easing.out(Easing.sin) }),
        withTiming(0, { duration: 1800 }),
      ),
      -1,
      false,
    );

    const runCycle = () => {
      'worklet';
      // Reset rows
      for (const s of rowScales) {
        s.value = 0;
      }
      btnDone.value = 0;
      btnScale.value = 1;

      // Button tap at TAP_AT
      btnScale.value = withDelay(
        TAP_AT,
        withSequence(
          withTiming(0.92, { duration: 120 }),
          withTiming(1, { duration: 180 }),
        ),
      );
      btnDone.value = withDelay(TAP_AT + 300, withTiming(1, { duration: 250 }));

      // Staggered row reveals
      for (let i = 0; i < rowScales.length; i++) {
        const delay = ROWS_START + i * ROW_STAGGER;
        rowScales[i].value = withDelay(
          delay,
          withSpring(1, { damping: 12, stiffness: 200 }),
        );
      }
    };

    // Kick off first cycle.
    runCycle();

    // Re-trigger every CYCLE_MS. We drive this through a clock value
    // that resets, which triggers useAnimatedReaction.
    clock.value = withRepeat(
      withSequence(
        withTiming(1, { duration: CYCLE_MS }),
        withTiming(0, { duration: 0 }),
      ),
      -1,
      false,
    );

    return undefined;
  }, []);

  // Re-run the cycle each time the clock resets.
  useAnimatedReaction(
    () => clock.value,
    (v, prev) => {
      if (prev !== null && prev > 0.5 && v < 0.1) {
        // Reset rows
        for (const s of rowScales) {
          s.value = 0;
        }
        btnDone.value = 0;
        btnScale.value = 1;

        btnScale.value = withDelay(
          TAP_AT,
          withSequence(
            withTiming(0.92, { duration: 120 }),
            withTiming(1, { duration: 180 }),
          ),
        );
        btnDone.value = withDelay(TAP_AT + 300, withTiming(1, { duration: 250 }));

        for (let i = 0; i < rowScales.length; i++) {
          const delay = ROWS_START + i * ROW_STAGGER;
          rowScales[i].value = withDelay(
            delay,
            withSpring(1, { damping: 12, stiffness: 200 }),
          );
        }
      }
    },
  );

  const wrapStyle = useAnimatedStyle(() => {
    const p = parallax.value;
    const abs = Math.abs(p);
    return {
      opacity: interpolate(abs, [0, 0.8, 1], [1, 0.4, 0], Extrapolation.CLAMP),
      transform: [
        { perspective: 1200 },
        { translateX: p * 40 },
        { rotateY: `${p * MAX_ROT_DEG}deg` },
        { scale: interpolate(abs, [0, 1], [1, 0.94], Extrapolation.CLAMP) },
      ],
    };
  });

  const blurAnimatedProps = useAnimatedProps(() => ({
    intensity: Math.abs(parallax.value) * MAX_BLUR_INTENSITY,
  }));

  const bellStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${bellRot.value}deg` }],
  }));

  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const btnLabelStyle = useAnimatedStyle(() => ({
    opacity: 1 - btnDone.value,
  }));

  const btnDoneStyle = useAnimatedStyle(() => ({
    opacity: btnDone.value,
  }));

  const { colors } = useTheme();
  const accentGreen = '#22C55E';

  return (
    <Animated.View style={[styles.root, wrapStyle]}>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.borderLight },
        ]}
      >
        {/* Prompt card */}
        <View style={styles.promptCard}>
          <Animated.View style={bellStyle}>
            <Bell size={28} color={colors.textPrimary} strokeWidth={1.8} />
          </Animated.View>
          <Text style={[styles.promptTitle, { color: colors.textPrimary }]}>
            Activa avisos de renovación
          </Text>
          <Text style={[styles.promptBody, { color: colors.textSecondary }]}>
            Recibe una alerta 7 días antes de cada cobro automático
          </Text>
          <Animated.View
            style={[
              styles.ctaBtn,
              { backgroundColor: colors.textPrimary },
              btnStyle,
            ]}
          >
            <Animated.Text
              style={[styles.ctaBtnText, { color: colors.background }, btnLabelStyle]}
            >
              Avísame 7 días antes
            </Animated.Text>
            <Animated.View style={[styles.ctaDoneWrap, btnDoneStyle]}>
              <Check size={16} color={colors.background} strokeWidth={2.5} />
              <Text style={[styles.ctaBtnText, { color: colors.background }]}>
                {' '}Activado
              </Text>
            </Animated.View>
          </Animated.View>
        </View>

        {/* Subscription rows with notification badges */}
        <View style={styles.rowList}>
          {NOTIF_SUBS.map((sub, i) => (
            <NotifRow
              key={sub.domain}
              sub={sub}
              scale={rowScales[i]}
              colors={colors}
              accentGreen={accentGreen}
            />
          ))}
        </View>
      </View>

      <AnimatedBlurView
        tint="default"
        intensity={0}
        animatedProps={blurAnimatedProps}
        style={styles.blurOverlay}
        pointerEvents="none"
      />
    </Animated.View>
  );
}

function NotifRow({
  sub,
  scale,
  colors,
  accentGreen,
}: {
  sub: (typeof NOTIF_SUBS)[number];
  scale: SharedValue<number>;
  colors: Record<string, string>;
  accentGreen: string;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: scale.value,
    transform: [{ scale: interpolate(scale.value, [0, 1], [0.88, 1], Extrapolation.CLAMP) }],
  }));

  return (
    <Animated.View style={[styles.row, { borderBottomColor: colors.borderLight }, style]}>
      <Image
        source={{ uri: logoUrlFromDomain(sub.domain) }}
        style={[styles.logo, { backgroundColor: colors.borderLight }]}
        resizeMode="contain"
      />
      <View style={styles.rowText}>
        <Text style={[styles.rowName, { color: colors.textPrimary }]} numberOfLines={1}>
          {sub.name}
        </Text>
        <Text style={[styles.rowSub, { color: colors.textMuted }]} numberOfLines={1}>
          Renueva en {sub.days}
        </Text>
      </View>
      <View style={[styles.badge, { backgroundColor: accentGreen }]}>
        <Bell size={11} color="#FFFFFF" strokeWidth={2.2} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 100,
    left: SIDE_MARGIN,
    width: CARD_W,
    height: CARD_H,
    borderRadius: radius['2xl'],
    overflow: 'hidden',
  },
  card: {
    flex: 1,
    borderRadius: radius['2xl'],
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    ...shadows.cardMd,
  },
  promptCard: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 20,
    gap: 8,
  },
  promptTitle: {
    ...fontFamily.bold,
    fontSize: fontSize[18],
    textAlign: 'center',
    marginTop: 4,
  },
  promptBody: {
    ...fontFamily.regular,
    fontSize: fontSize[13],
    lineHeight: fontSize[13] * lineHeight.normal,
    textAlign: 'center',
  },
  ctaBtn: {
    height: 44,
    borderRadius: radius.full,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    flexDirection: 'row',
  },
  ctaBtnText: {
    ...fontFamily.semibold,
    fontSize: fontSize[14],
  },
  ctaDoneWrap: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowList: {
    paddingHorizontal: 16,
  },
  row: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    ...fontFamily.semibold,
    fontSize: fontSize[14],
    lineHeight: fontSize[14] * lineHeight.compact,
  },
  rowSub: {
    ...fontFamily.regular,
    fontSize: fontSize[11],
    lineHeight: fontSize[11] * lineHeight.normal,
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius['2xl'],
  },
});
