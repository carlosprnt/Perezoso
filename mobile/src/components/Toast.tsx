// Toast — slim banner that drops from the very top of the screen.
//
// The <Toast /> instance is mounted once at the app root. Anywhere in
// the app can fire one with:
//   useToastStore.getState().show('success', 'Suscripción creada');
//
// Visual matches the iOS "notification-style" banner shown in the
// spec screenshot: full-width rounded-bottom card, leading icon,
// bold-ish message, green for success / red for error.

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, X } from 'lucide-react-native';

import { useToastStore } from './useToastStore';
import { fontFamily, fontSize } from '../design/typography';

const SHOW_DURATION_MS = 2800;

export function Toast() {
  const visible = useToastStore((s) => s.visible);
  const kind = useToastStore((s) => s.kind);
  const message = useToastStore((s) => s.message);
  const hide = useToastStore((s) => s.hide);
  const insets = useSafeAreaInsets();

  // Slide translateY from -220 (fully off-screen above) to 0.
  // Kept simple with Animated.timing — no bounce.
  const translateY = useRef(new Animated.Value(-220)).current;

  useEffect(() => {
    if (!visible) {
      translateY.setValue(-220);
      return;
    }

    Animated.timing(translateY, {
      toValue: 0,
      duration: 260,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(translateY, {
        toValue: -220,
        duration: 240,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) hide();
      });
    }, SHOW_DURATION_MS);

    return () => clearTimeout(timer);
  }, [visible, translateY, hide]);

  if (!visible) return null;

  const bg = kind === 'success' ? '#22C55E' : '#EF4444';
  const Icon = kind === 'success' ? Check : X;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.root,
        {
          backgroundColor: bg,
          paddingTop: insets.top + 14,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.inner}>
        <Icon size={22} color="#FFFFFF" strokeWidth={3} />
        <Text style={styles.text}>{message}</Text>
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
    paddingBottom: 22,
    paddingHorizontal: 18,
    zIndex: 9999,
    elevation: 9999,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  text: {
    ...fontFamily.semibold,
    fontSize: fontSize[16],
    color: '#FFFFFF',
    letterSpacing: -0.2,
    flex: 1,
  },
});
