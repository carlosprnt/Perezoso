// SuggestionsList — vertical list of popular platforms used by both
// empty states (Dashboard + Subscriptions).
//
// Row: [logo 40×40] · [platform name] · [+ icon on the right]
// Divider: thin gray line between rows (no divider after the last).
// Tap: opens the CreateSubscriptionSheet with that platform prefilled.
//
// Viewport cascade: each row fades + scales (0.9 → 1) as it enters the
// viewport from below, and reverses (1 → 0.9, fade out) as it leaves
// the top. The staggering is SPATIAL — rows further down animate in
// later simply because they cross the enter threshold later as the
// user scrolls. Parent supplies `scrollY` so a single worklet drives
// every row's progress in sync with the ScrollView.
//
// Each row measures its Y in two steps:
//   · the list root uses a native ref + `measureInWindow` on layout
//     to record its absolute window-Y offset at scrollY=0
//   · each row's onLayout yields its y within the list
// → screenY = baselineY + rowY − scrollY

import React, { useRef } from 'react';
import {
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useAnimatedReaction,
  useSharedValue,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';
import { Plus } from 'lucide-react-native';
import { haptic } from '../../lib/haptics';

import { useTheme } from '../../design/useTheme';
import { fontFamily } from '../../design/typography';
import { PLATFORMS, logoUrlFromDomain } from '../../lib/constants/platforms';
import { useCreateSubscriptionStore } from './useCreateSubscriptionStore';

const FEATURED_IDS = [
  // Streaming
  'netflix',
  'spotify',
  'youtube-premium',
  'disney-plus',
  'prime-video',
  'hbo-max',
  'apple-tv',
  'apple-music',
  'hulu',
  'paramount-plus',
  'crunchyroll',
  'twitch',
  'dazn',
  'mubi',
  // Music & audio
  'tidal',
  'deezer',
  'soundcloud',
  'audible',
  'amazon-prime',
  // AI
  'chatgpt',
  'claude',
  'midjourney',
  'perplexity',
  'copilot',
  'cursor',
  // Productivity
  'notion',
  'figma',
  'adobe',
  'canva',
  'microsoft-365',
  'google-workspace',
  'slack',
  'zoom',
  'dropbox',
  'grammarly',
  'todoist',
  'evernote',
  // Cloud & storage
  'icloud',
  'google-one',
  'github',
  'onedrive',
  // Gaming
  'playstation-plus',
  'xbox-gamepass',
  'nintendo-switch',
  'ea-play',
  'geforce-now',
  // Education & wellness
  'duolingo',
  'coursera',
  'masterclass',
  'skillshare',
  'headspace',
  'calm',
  // Communication
  'discord',
  'telegram',
  // VPN & security
  'nordvpn',
  'expressvpn',
  '1password',
  'protonvpn',
  // Fitness
  'strava',
  'apple-fitness',
] as const;

const FEATURED = FEATURED_IDS
  .map((id) => PLATFORMS.find((p) => p.id === id))
  .filter((p): p is NonNullable<typeof p> => !!p);

// Enter window: row's top crosses from `H − ENTER_START` (first sign of
// the row appearing at the bottom of the viewport) to `H − ENTER_END`
// (row fully past the entry line) — progress 0 → 1.
const ENTER_START_FROM_BOTTOM = 40;
const ENTER_END_FROM_BOTTOM   = 180;
// Exit window: row's top travels from `EXIT_START` (still fully visible
// near the top) to `EXIT_END` (crossing out) — progress 1 → 0.
const EXIT_START = 120;
const EXIT_END   = 20;

const { height: SCREEN_H } = Dimensions.get('window');

interface Props {
  /** Shared scroll offset of the parent ScrollView. Required for the
   *  viewport-driven cascade. */
  scrollY: SharedValue<number>;
}

export function SuggestionsList({ scrollY }: Props) {
  const { colors, isDark } = useTheme();
  const dividerColor = isDark ? '#2C2C2E' : '#EAEAEA';
  const plusBg = isDark ? '#2C2C2E' : '#F0F0F0';

  // `measureInWindow` gives window-Y. We record it ONCE on layout and
  // bake in the current scroll offset so `baselineY` represents the
  // list's absolute Y within the scroll content — stable across scrolls.
  const rootRef = useRef<View>(null);
  const baselineY = useSharedValue(-1);

  const handleRootLayout = () => {
    rootRef.current?.measureInWindow((_x, y) => {
      baselineY.value = y + scrollY.value;
    });
  };

  const handleSelect = (name: string, domain: string) => {
    useCreateSubscriptionStore.getState().open({
      name,
      logoUrl: logoUrlFromDomain(domain),
    });
  };

  return (
    <View
      ref={rootRef}
      onLayout={handleRootLayout}
      collapsable={false}
      style={styles.list}
    >
      {FEATURED.map((p, i) => (
        <Row
          key={p.id}
          scrollY={scrollY}
          baselineY={baselineY}
          textColor={colors.textPrimary}
          dividerColor={dividerColor}
          plusBg={plusBg}
          showDivider={i < FEATURED.length - 1}
          name={p.name}
          domain={p.domain}
          onPress={() => handleSelect(p.name, p.domain)}
        />
      ))}
    </View>
  );
}

interface RowProps {
  scrollY: SharedValue<number>;
  baselineY: SharedValue<number>;
  textColor: string;
  dividerColor: string;
  plusBg: string;
  showDivider: boolean;
  name: string;
  domain: string;
  onPress: () => void;
}

function Row({
  scrollY,
  baselineY,
  textColor,
  dividerColor,
  plusBg,
  showDivider,
  name,
  domain,
  onPress,
}: RowProps) {
  const rowY = useSharedValue(0);
  const measured = useSharedValue(0);

  const onLayout = (e: LayoutChangeEvent) => {
    rowY.value = e.nativeEvent.layout.y;
    measured.value = 1;
  };

  const animatedStyle = useAnimatedStyle(() => {
    // Until both measurements have landed, render at identity so there
    // is no one-frame flicker where the row renders invisible.
    if (measured.value === 0 || baselineY.value < 0) {
      return { opacity: 1, transform: [{ scale: 1 }] };
    }
    const screenY = baselineY.value + rowY.value - scrollY.value;
    const enter = interpolate(
      screenY,
      [SCREEN_H - ENTER_START_FROM_BOTTOM, SCREEN_H - ENTER_END_FROM_BOTTOM],
      [0, 1],
      Extrapolation.CLAMP,
    );
    const exit = interpolate(
      screenY,
      [EXIT_START, EXIT_END],
      [1, 0],
      Extrapolation.CLAMP,
    );
    const p = Math.min(enter, exit);
    return {
      opacity: p,
      transform: [
        { scale: interpolate(p, [0, 1], [0.9, 1], Extrapolation.CLAMP) },
      ],
    };
  });

  const hasEnteredHaptic = useSharedValue(0);
  useAnimatedReaction(
    () => {
      if (measured.value === 0 || baselineY.value < 0) return 1;
      const screenY = baselineY.value + rowY.value - scrollY.value;
      return interpolate(
        screenY,
        [SCREEN_H - ENTER_START_FROM_BOTTOM, SCREEN_H - ENTER_END_FROM_BOTTOM],
        [0, 1],
        Extrapolation.CLAMP,
      );
    },
    (cur, prev) => {
      if (prev === null) return;
      // Rising through the 0.5 gate: row has scaled into view — vibrate.
      if (prev < 0.5 && cur >= 0.5 && hasEnteredHaptic.value === 0) {
        hasEnteredHaptic.value = 1;
        runOnJS(haptic.light)();
      }
      // Falling back below the gate: arm the haptic again so the next
      // re-entry (user scrolls the row back into view) retriggers it.
      else if (prev >= 0.5 && cur < 0.5 && hasEnteredHaptic.value === 1) {
        hasEnteredHaptic.value = 0;
      }
    },
  );

  return (
    <Animated.View onLayout={onLayout} style={animatedStyle}>
      <Pressable
        onPress={() => { haptic.light(); onPress(); }}
        style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
        accessibilityRole="button"
        accessibilityLabel={`Añadir ${name}`}
      >
        <View style={styles.logoBox}>
          <Image
            source={{ uri: logoUrlFromDomain(domain) }}
            style={styles.logoImg}
            resizeMode="contain"
          />
        </View>
        <Text style={[styles.name, { color: textColor }]} numberOfLines={1}>
          {name}
        </Text>
        <View style={[styles.plusCircle, { backgroundColor: plusBg }]}>
          <Plus size={18} strokeWidth={2.5} color={textColor} />
        </View>
      </Pressable>
      {showDivider && (
        <View style={[styles.divider, { backgroundColor: dividerColor }]} />
      )}
    </Animated.View>
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
    ...fontFamily.medium,
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
    marginLeft: 54,
  },
});
