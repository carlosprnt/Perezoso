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
// Positioning
// ───────────
// Absolute at the top of the screen, above everything (zIndex high).
// Horizontal padding matches both the SummaryHero and the
// UnderlyingProfileLayer content padding so the element lines up with
// whatever is behind it in either state.
//
// We DO NOT give it a solid background — in both states the element
// lines up with matching padding on the layer behind, so it just sits
// over whatever is there (dashboard surface when closed, black panel
// when open). A subtle backdrop blur could be added later if scrolled
// content reading through becomes an issue.

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

interface Props {
  firstName: string;
  fullName?: string;
  avatarUrl?: string | null;
  onAvatarPress: () => void;
}

export function SharedProfileHeader({
  firstName,
  fullName,
  avatarUrl,
  onAvatarPress,
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

  return (
    <View
      pointerEvents="box-none"
      style={[styles.root, { paddingTop: insets.top + 12 }]}
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
                source={AVATAR_SOURCE}
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
    </View>
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
