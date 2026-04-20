// SharedProfileHeader — the "Hola, Carlos." + avatar that sits on top
// of both the dashboard surface and the UnderlyingProfileLayer, and
// morphs between the two visual states as the reveal opens.
//
// It is the SAME React element in both states (closed dashboard vs
// open profile layer). Its style interpolates with the reveal progress:
//
//   progress 0 (closed)   →  fontSize 18, dark text
//   progress 1 (open)     →  fontSize 26 (+8 px), white text
//
// The avatar is pressable — tapping it toggles the reveal.
//
// Scroll-away behaviour (dashboard mode)
// ──────────────────────────────────────
// On the dashboard, the header is no longer "sticky". As the user scrolls
// down it fades out (opacity 1 → 0 over 60 px of scroll) and drifts
// slightly upward (−30 px max) so it reads like normal scrollable content.
// The fade is GATED by the reveal progress: the moment the profile layer
// starts revealing, the header is forced back to full opacity / centered
// position so the greeting is always legible on the black panel.
//
// The actual "blur" part of the "fade out via blur" is provided by the
// ProgressiveBlurView that already sits on the hero below — the header
// sits above the blur veil at the top of the screen, so as the hero
// glass hardens the header's fading silhouette reads against a softer
// backdrop (no extra blur layer needed).
//
// Positioning
// ───────────
// Absolute at the top of the screen, above everything (zIndex high).
// Horizontal padding matches both the SummaryHero and the
// UnderlyingProfileLayer content padding so the element lines up with
// whatever is behind it in either state.

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  type ImageSourcePropType,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  interpolateColor,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { revealProgress } from './useDashboardReveal';
import { fontFamily } from '../../design/typography';
import { getAvatarPastel, getInitials } from '../../components/LogoAvatar';

const AVATAR_SOURCE: ImageSourcePropType = require('../../../assets/logo.png');

const AnimatedText = Animated.createAnimatedComponent(Text);

// Font sizes for the two rest states — the interpolation lerps between.
const FONT_CLOSED = 18;
const FONT_OPEN = 26; // +8 px per spec

// Scroll fade tunables.
const SCROLL_FADE_END = 60;   // px of scroll at which opacity reaches 0
const SCROLL_LIFT_MAX = 30;   // px the header drifts upward at full fade

interface Props {
  firstName: string;
  fullName?: string;
  avatarUrl?: string | null;
  onAvatarPress: () => void;
  /** Dashboard scroll offset — when supplied the header fades & lifts with scroll. */
  scrollY?: SharedValue<number>;
}

export function SharedProfileHeader({
  firstName,
  fullName,
  avatarUrl,
  onAvatarPress,
  scrollY,
}: Props) {
  const insets = useSafeAreaInsets();
  const displayName = fullName || firstName;
  const pastel = getAvatarPastel(displayName);

  // Greeting text — fontSize + color both drive off the same progress.
  // Reanimated's useAnimatedStyle can animate `fontSize` via RN 0.81's
  // native animated text support; `color` works directly with
  // interpolateColor.
  const greetingStyle = useAnimatedStyle(() => {
    const p = revealProgress.value;
    return {
      fontSize: interpolate(
        p,
        [0, 1],
        [FONT_CLOSED, FONT_OPEN],
        Extrapolation.CLAMP,
      ),
      color: interpolateColor(p, [0, 1], ['#000000', '#FFFFFF']),
    };
  });

  // Root scroll-away style — opacity fade + subtle upward drift, overridden
  // by revealProgress so the header returns to full visibility when the
  // profile layer reveals.
  const rootStyle = useAnimatedStyle(() => {
    const s = scrollY ? Math.max(0, scrollY.value) : 0;
    const fade = Math.min(s / SCROLL_FADE_END, 1);
    const lift = Math.min((s / SCROLL_FADE_END) * SCROLL_LIFT_MAX, SCROLL_LIFT_MAX);
    const reveal = revealProgress.value;
    return {
      // max() lets revealProgress fully override the scroll fade whenever
      // the profile layer is even partially visible.
      opacity: Math.max(1 - fade, reveal),
      transform: [
        { translateY: (1 - reveal) * -lift },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.root, { paddingTop: insets.top + 12 }, rootStyle]}
    >
      <View style={styles.row}>
        <AnimatedText style={[styles.greetingBase, greetingStyle]} numberOfLines={1}>
          Hola, {firstName}.
        </AnimatedText>

        <Pressable
          onPress={onAvatarPress}
          hitSlop={12}
          accessibilityLabel="Abrir / cerrar menú de perfil"
          accessibilityRole="button"
        >
          {avatarUrl ? (
            <View style={styles.avatar}>
              <Image
                source={{ uri: avatarUrl }}
                style={styles.avatarImg}
                resizeMode="cover"
              />
            </View>
          ) : (
            <View style={[styles.avatar, { backgroundColor: pastel.bg }]}>
              <Text style={[styles.avatarText, { color: pastel.fg }]}>
                {getInitials(displayName)}
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    // Above both the dashboard surface and the UnderlyingProfileLayer.
    zIndex: 50,
    elevation: 50,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    // Reserve vertical room that matches the greeting at its largest
    // size so the row height doesn't change during the interpolation.
    minHeight: 44,
  },
  greetingBase: {
    ...fontFamily.bold,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: 40,
    height: 40,
  },
  avatarText: {
    ...fontFamily.semibold,
    fontSize: 14,
  },
});
