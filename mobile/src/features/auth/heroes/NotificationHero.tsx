// Slide 2 hero — animated notification-opt-in card. Shows a
// "turn on renewal alerts" prompt with a wobbling bell, auto-taps the
// CTA, then stagger-reveals several subscriptions with active
// notification badges. The prompt starts vertically centered and
// slides up when the rows appear. Whole sequence loops.

import React, { useEffect } from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
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

// How far the prompt section shifts down to appear centered before tap.
const CENTER_OFFSET = 90;

const CYCLE_MS = 6000;
const TAP_AT = 1400;
const ROWS_START = 1700;
const ROW_STAGGER = 220;

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
  const clock = useSharedValue(0);
  const bellRot = useSharedValue(0);
  const btnScale = useSharedValue(1);
  const btnDone = useSharedValue(0);
  const shiftY = useSharedValue(CENTER_OFFSET);
  const cardY = useSharedValue(0);
  const rowScales = NOTIF_SUBS.map(() => useSharedValue(0));

  const runCycle = () => {
    'worklet';
    for (const s of rowScales) s.value = 0;
    btnDone.value = 0;
    btnScale.value = 1;
    shiftY.value = CENTER_OFFSET;
    cardY.value = 0;

    // Button tap
    btnScale.value = withDelay(
      TAP_AT,
      withSequence(
        withTiming(0.9, { duration: 100 }),
        withTiming(1, { duration: 140 }),
      ),
    );
    btnDone.value = withDelay(TAP_AT + 150, withTiming(1, { duration: 150 }));

    // Shift content up inside card
    shiftY.value = withDelay(
      TAP_AT + 100,
      withTiming(0, { duration: 350, easing: Easing.out(Easing.cubic) }),
    );

    // Move entire card up to make room for subscription rows
    cardY.value = withDelay(
      TAP_AT + 100,
      withTiming(-100, { duration: 450, easing: Easing.out(Easing.cubic) }),
    );

    // Staggered row reveals
    for (let i = 0; i < rowScales.length; i++) {
      const delay = ROWS_START + i * ROW_STAGGER;
      rowScales[i].value = withDelay(
        delay,
        withSpring(1, { damping: 14, stiffness: 220 }),
      );
    }
  };

  useEffect(() => {
    // Bell wobble — always runs (lightweight, decorative).
    bellRot.value = withRepeat(
      withSequence(
        withTiming(14, { duration: 180, easing: Easing.inOut(Easing.sin) }),
        withTiming(-14, { duration: 180, easing: Easing.inOut(Easing.sin) }),
        withTiming(8, { duration: 140, easing: Easing.inOut(Easing.sin) }),
        withTiming(-8, { duration: 140, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 120, easing: Easing.out(Easing.sin) }),
        withTiming(0, { duration: 1600 }),
      ),
      -1,
      false,
    );
  }, []);

  // Start/stop the cycle based on whether this slide is in view.
  useAnimatedReaction(
    () => Math.abs(parallax.value) < 0.5,
    (active, wasActive) => {
      if (active && !wasActive) {
        runCycle();
        clock.value = 0;
        clock.value = withRepeat(
          withSequence(
            withTiming(1, { duration: CYCLE_MS }),
            withTiming(0, { duration: 0 }),
          ),
          -1,
          false,
        );
      } else if (!active && wasActive) {
        for (const s of rowScales) s.value = 0;
        btnDone.value = 0;
        btnScale.value = 1;
        shiftY.value = CENTER_OFFSET;
        cardY.value = 0;
        clock.value = 0;
      }
    },
  );

  // Re-run the cycle each time the clock resets (loop while active).
  useAnimatedReaction(
    () => clock.value,
    (v, prev) => {
      if (prev !== null && prev > 0.5 && v < 0.1) {
        runCycle();
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
        { translateY: cardY.value },
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

  const promptShiftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: shiftY.value }],
  }));

  const { colors } = useTheme();
  const accentGreen = '#30D158';

  return (
    <Animated.View style={[styles.root, wrapStyle]}>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.borderLight },
        ]}
      >
        <Animated.View style={promptShiftStyle}>
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
        </Animated.View>
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
    top: 200,
    left: SIDE_MARGIN,
    width: CARD_W,
    height: CARD_H,
    borderRadius: radius['2xl'] * 2,
    overflow: 'hidden',
  },
  card: {
    flex: 1,
    borderRadius: radius['2xl'] * 2,
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
    ...fontFamily.semibold,
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
    borderRadius: radius['2xl'] * 2,
  },
});
