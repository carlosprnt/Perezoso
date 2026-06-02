// HalfSheet — reusable ~50% height modal sheet for pickers.
//
// Unlike BottomSheet, this one is compact, no peek bounce, designed for
// selection UIs (currency, language, timezone…). Content area is a flex
// column that fills the available space so consumers can put a sticky
// header/search field at the top and a scrollable list below.
//
// Features:
//   - ~50% screen height by default (overridable via heightFraction)
//   - Rounded top corners (32px)
//   - Drag-down handle to dismiss (>100px or velocity)
//   - Tap-outside (backdrop) to dismiss
//   - Smooth slide-up entrance (300ms decelerate) + backdrop fade
//   - Accelerating dismiss (280ms)

import React, { useCallback, useEffect, type ReactNode } from 'react';
import {
  View,
  Text,
  Modal,
  Dimensions,
  StyleSheet,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import { useTheme } from '../design/useTheme';
import { useT } from '../lib/i18n/LocaleProvider';
import { fontFamily, fontSize } from '../design/typography';
import { radius } from '../design/radius';
import { decelerate, swipeDismiss, snapBack } from '../motion/easing';
import { duration, velocity as vel } from '../motion/timing';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface HalfSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  /** Fraction of screen height. Default 0.55 (~55%). */
  heightFraction?: number;
  /** Show close (X) button in the header. Default false (drag-only). */
  showCloseButton?: boolean;
}

export function HalfSheet({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  heightFraction = 0.55,
  showCloseButton = false,
}: HalfSheetProps) {
  const t = useT();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const sheetMaxHeight = SCREEN_HEIGHT * heightFraction;

  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (isOpen) {
      translateY.value = SCREEN_HEIGHT;
      backdropOpacity.value = 0;

      translateY.value = withTiming(0, {
        duration: duration.slideUp,
        easing: decelerate,
      });
      backdropOpacity.value = withTiming(1, {
        duration: duration.backdrop,
        easing: decelerate,
      });
    }
  }, [isOpen, translateY, backdropOpacity]);

  const dismiss = useCallback(() => {
    translateY.value = withTiming(
      SCREEN_HEIGHT,
      { duration: duration.dismiss, easing: swipeDismiss },
      () => {
        runOnJS(onClose)();
      },
    );
    backdropOpacity.value = withTiming(0, {
      duration: duration.dismiss,
      easing: swipeDismiss,
    });
  }, [onClose, translateY, backdropOpacity]);

  const dragGesture = Gesture.Pan()
    .onUpdate((event) => {
      'worklet';
      const dy = event.translationY;
      translateY.value = dy < 0 ? dy * 0.15 : dy;
      backdropOpacity.value = interpolate(
        dy,
        [0, sheetMaxHeight],
        [1, 0],
        Extrapolation.CLAMP,
      );
    })
    .onEnd((event) => {
      'worklet';
      const shouldDismiss =
        event.translationY > vel.sheetDismissOffset ||
        event.velocityY > vel.swipe;

      if (shouldDismiss) {
        translateY.value = withTiming(
          SCREEN_HEIGHT,
          { duration: duration.dismiss, easing: swipeDismiss },
          () => {
            runOnJS(onClose)();
          },
        );
        backdropOpacity.value = withTiming(0, {
          duration: duration.dismiss,
          easing: swipeDismiss,
        });
      } else {
        translateY.value = withTiming(0, {
          duration: duration.dismiss,
          easing: snapBack,
        });
        backdropOpacity.value = withTiming(1, {
          duration: duration.dismiss,
          easing: snapBack,
        });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!isOpen) return null;

  const sheetBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const handleColor = isDark ? '#3A3A3C' : '#D4D4D4';
  const backdropColor = isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.35)';
  const titleColor = isDark ? '#FFFFFF' : '#000000';
  const subtitleColor = isDark ? '#8E8E93' : '#6B6B6B';
  const closeBtnBg = isDark ? '#2C2C2E' : '#EBEBF0';
  const closeBtnColor = isDark ? '#AEAEB2' : '#3C3C43';

  return (
    <Modal transparent statusBarTranslucent animationType="none" visible>
      {/* Backdrop */}
      <Animated.View
        style={[StyleSheet.absoluteFill, backdropStyle, { backgroundColor: backdropColor }]}
      >
        <GestureDetector gesture={Gesture.Tap().onEnd(() => {
          'worklet';
          runOnJS(dismiss)();
        })}>
          <Animated.View style={StyleSheet.absoluteFill} />
        </GestureDetector>
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          sheetStyle,
          {
            backgroundColor: sheetBg,
            height: sheetMaxHeight,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        {/* Drag handle — only this area attaches the pan gesture so the
            scroll list below can scroll independently. */}
        <GestureDetector gesture={dragGesture}>
          <View style={styles.handleZone}>
            <View style={[styles.handle, { backgroundColor: handleColor }]} />
          </View>
        </GestureDetector>

        {/* Header */}
        {(title || subtitle || showCloseButton) && (
          <View style={styles.header}>
            <View style={styles.headerText}>
              {title ? (
                <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
                  {title}
                </Text>
              ) : null}
              {subtitle ? (
                <Text style={[styles.subtitle, { color: subtitleColor }]} numberOfLines={2}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            {showCloseButton ? (
              <Pressable
                onPress={dismiss}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.closeBtn,
                  { backgroundColor: closeBtnBg },
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
              >
                <X size={15} color={closeBtnColor} strokeWidth={2.5} />
              </Pressable>
            ) : null}
          </View>
        )}

        {/* Content — consumer-owned flex column */}
        <View style={styles.content}>{children}</View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  handleZone: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: radius.full,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
  },
  headerText: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    ...fontFamily.semiBold,
    fontSize: fontSize[20],
    letterSpacing: -0.3,
  },
  subtitle: {
    ...fontFamily.medium,
    fontSize: fontSize[13],
    letterSpacing: -0.1,
    marginTop: 2,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    minHeight: 0,
  },
});
