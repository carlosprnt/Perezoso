// Phase 3/4 — Shared UI primitive: BottomSheet
// Replicates the web app's BottomSheet component with full fidelity.
//
// Web behavior (BottomSheet.tsx):
//   Entry:     slide-up 300ms decelerate, backdrop fade 200ms
//   Peek:      340ms delay → 22px bounce (380ms peekBounce) → 380ms delay → settle (360ms snapBack)
//   Handle drag:  drag > 120px → dismiss, else snap back
//   Scroll drag:  at scrollTop=0, pull > 8px dead zone → track, > 100px → dismiss
//   Dismiss:   280ms accelerating exit (cubic-bezier 0.4,0,1,1), onClose after 260ms
//   Cancel:    280ms snapBack (cubic-bezier 0.25,0.46,0.45,0.94)
//   Backdrop:  black/50 light, black/70 dark, tap → dismiss
//   Sheet:     bg-white dark:bg-[#1C1C1E], rounded 32px 32px 0 0
//   Handle:    w-10 h-1 rounded-full, #D4D4D4 dark:#3A3A3C
//   Header:    17px semibold, 44px close button
//   Height:    auto(80dvh), tall(82dvh), full(92dvh)
//   Safe area: bottom padding accounts for iOS home indicator
//
// This is a custom implementation. No @gorhom/bottom-sheet or similar.
// The reason: preserving the exact entry timing, peek bounce sequence,
// scroll-to-dismiss dead zone, and dismiss acceleration curve.

import React, { useCallback, useEffect, useRef, type ReactNode } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  Dimensions,
  StyleSheet,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
  FadeIn,
  SlideInDown,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../design/useTheme';
import { useT } from '../lib/i18n/LocaleProvider';
import { radius } from '../design/radius';
import { fontFamily, fontSize, lineHeight, letterSpacing } from '../design/typography';
import { zIndex as zTokens } from '../design/zIndex';
import { borderWidth } from '../design/borders';
import {
  decelerate,
  peekBounce,
  snapBack,
  swipeDismiss,
} from '../motion/easing';
import { duration, delay, velocity as vel } from '../motion/timing';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Types ──────────────────────────────────────────────────────────

type SheetHeight = 'auto' | 'tall' | 'full';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Max height variant. Default: 'tall' */
  height?: SheetHeight;
  /** Custom z-index for layering. Default: zIndex.sheetContent (60) */
  sheetZIndex?: number;
}

const HEIGHT_FRACTION: Record<SheetHeight, number> = {
  auto: 0.80,
  tall: 0.82,
  full: 0.92,
};

// ─── Component ──────────────────────────────────────────────────────

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  footer,
  height = 'tall',
  sheetZIndex = zTokens.sheetContent,
}: BottomSheetProps) {
  const t = useT();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const maxHeight = SCREEN_HEIGHT * HEIGHT_FRACTION[height];
  const safeBottom = Math.max(insets.bottom, 20);

  // ── Animation state ─────────────────────────────────────────────
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const peekY = useSharedValue(0);
  const scrollOffset = useRef(0);
  const isDraggingFromScroll = useSharedValue(false);
  const sheetHeight = useSharedValue(maxHeight);

  // ── Entry animation ─────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      // Reset
      translateY.value = SCREEN_HEIGHT;
      backdropOpacity.value = 0;
      peekY.value = 0;

      // Slide up: 300ms decelerate
      translateY.value = withTiming(0, {
        duration: duration.slideUp,
        easing: decelerate,
      });

      // Backdrop fade: 200ms decelerate
      backdropOpacity.value = withTiming(1, {
        duration: duration.backdrop,
        easing: decelerate,
      });

      // Peek bounce: 340ms delay → bounce out → pause → settle
      peekY.value = withDelay(
        delay.peekStart, // 340ms
        withSequence(
          // Peek OUT: 22px with bounce overshoot (380ms)
          withTiming(22, {
            duration: duration.peekOut,
            easing: peekBounce,
          }),
          // Pause + settle BACK (360ms)
          withDelay(
            delay.peekReturn, // 380ms
            withTiming(0, {
              duration: duration.peekBack,
              easing: snapBack,
            }),
          ),
        ),
      );
    }
  }, [isOpen]);

  // ── Dismiss function ────────────────────────────────────────────
  const dismiss = useCallback(() => {
    // Sheet: accelerating exit (280ms)
    translateY.value = withTiming(
      SCREEN_HEIGHT,
      { duration: duration.dismiss, easing: swipeDismiss },
      () => {
        runOnJS(onClose)();
      },
    );
    // Backdrop: fade out
    backdropOpacity.value = withTiming(0, {
      duration: duration.dismiss,
      easing: swipeDismiss,
    });
  }, [onClose, translateY, backdropOpacity]);

  // ── Handle drag gesture ─────────────────────────────────────────
  // Web: drag > 120px → dismiss, else snap back
  const handleGesture = Gesture.Pan()
    .onUpdate((event) => {
      'worklet';
      const dy = event.translationY;
      if (dy < 0) {
        // Dragging up — overdamp (resist)
        translateY.value = dy * 0.15;
      } else {
        translateY.value = dy;
      }
      // Track backdrop fade
      backdropOpacity.value = interpolate(
        dy,
        [0, sheetHeight.value],
        [1, 0],
        Extrapolation.CLAMP,
      );
    })
    .onEnd((event) => {
      'worklet';
      const shouldDismiss =
        event.translationY > vel.sheetDismissOffset || // 120px
        event.velocityY > vel.swipe; // 200px/s

      if (shouldDismiss) {
        // Dismiss: accelerating exit
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
        // Cancel: snap back
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

  // ── Scroll-to-dismiss gesture ───────────────────────────────────
  // Web: at scrollTop=0, pull > 8px dead zone → track, > 100px → dismiss
  const scrollGesture = Gesture.Pan()
    .activeOffsetY(8) // 8px dead zone
    .onStart(() => {
      'worklet';
      isDraggingFromScroll.value = scrollOffset.current <= 0;
    })
    .onUpdate((event) => {
      'worklet';
      if (!isDraggingFromScroll.value) return;
      const dy = event.translationY;
      if (dy > 0) {
        // Pulling down from top of scroll
        translateY.value = Math.max(0, dy - 8); // subtract dead zone
        backdropOpacity.value = interpolate(
          translateY.value,
          [0, sheetHeight.value],
          [1, 0],
          Extrapolation.CLAMP,
        );
      }
    })
    .onEnd((event) => {
      'worklet';
      if (!isDraggingFromScroll.value) return;
      isDraggingFromScroll.value = false;

      const shouldDismiss = event.translationY > 100; // 100px threshold for scroll-dismiss

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

  // ── Scroll tracking ─────────────────────────────────────────────
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffset.current = e.nativeEvent.contentOffset.y;
  }, []);

  // ── Layout measurement ──────────────────────────────────────────
  const onSheetLayout = useCallback((e: LayoutChangeEvent) => {
    sheetHeight.value = e.nativeEvent.layout.height;
  }, [sheetHeight]);

  // ── Animated styles ─────────────────────────────────────────────
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value + peekY.value },
    ],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  // ── Render ──────────────────────────────────────────────────────

  if (!isOpen) return null;

  const sheetBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const handleColor = isDark ? '#3A3A3C' : '#D4D4D4';
  const backdropColor = isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)';

  return (
    <Modal transparent statusBarTranslucent animationType="none" visible>
      {/* Backdrop */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          backdropStyle,
          { backgroundColor: backdropColor, zIndex: sheetZIndex - 2 },
        ]}
      >
        <GestureDetector gesture={Gesture.Tap().onEnd(() => {
          'worklet';
          runOnJS(dismiss)();
        })}>
          <Animated.View style={StyleSheet.absoluteFill} />
        </GestureDetector>
      </Animated.View>

      {/* Sheet */}
      <GestureDetector gesture={handleGesture}>
        <Animated.View
          onLayout={onSheetLayout}
          style={[
            sheetStyles.sheet,
            sheetStyle,
            {
              backgroundColor: sheetBg,
              maxHeight: maxHeight,
              paddingBottom: safeBottom + 16, // 16px + safe area
              zIndex: sheetZIndex,
            },
          ]}
        >
          {/* Drag handle */}
          <View style={sheetStyles.handleContainer}>
            <View style={[sheetStyles.handle, { backgroundColor: handleColor }]} />
          </View>

          {/* Header */}
          {title ? (
            <View style={sheetStyles.header}>
              <Text
                style={[
                  sheetStyles.title,
                  { color: isDark ? '#F2F2F7' : '#000000' },
                ]}
                numberOfLines={1}
              >
                {title}
              </Text>
              <IconCloseButton isDark={isDark} onPress={dismiss} />
            </View>
          ) : null}

          {/* Scrollable content */}
          <GestureDetector gesture={scrollGesture}>
            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              onScroll={onScroll}
              scrollEventThrottle={16}
              style={sheetStyles.scrollContent}
              contentContainerStyle={sheetStyles.scrollContentContainer}
            >
              {children}
            </ScrollView>
          </GestureDetector>

          {/* Optional footer */}
          {footer ? (
            <View style={sheetStyles.footer}>{footer}</View>
          ) : null}
        </Animated.View>
      </GestureDetector>
    </Modal>
  );
}

// ─── Close button (inline to avoid circular deps) ───────────────────

function IconCloseButton({
  isDark,
  onPress,
}: {
  isDark: boolean;
  onPress: () => void;
}) {
  const t = useT();
  const { Pressable: RNPressable } = require('react-native');
  return (
    <RNPressable
      onPress={onPress}
      accessibilityLabel={t('common.close')}
      accessibilityRole="button"
      style={[
        sheetStyles.closeButton,
        {
          backgroundColor: isDark ? '#2C2C2E' : '#F5F5F5',
        },
      ]}
    >
      <Text
        style={[
          sheetStyles.closeIcon,
          { color: isDark ? '#AEAEB2' : '#616161' },
        ]}
      >
        ✕
      </Text>
    </RNPressable>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────

const sheetStyles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 32, // 32px 32px 0 0 — product identity
    borderTopRightRadius: 32,
    flexDirection: 'column',
    overflow: 'hidden',
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 40,  // w-10
    height: 4,  // h-1
    borderRadius: 9999, // rounded-full
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    ...fontFamily.semiBold,
    fontSize: fontSize[18],
    lineHeight: fontSize[18] * lineHeight.snug,
    flex: 1,
  },
  closeButton: {
    width: 44,  // w-11
    height: 44, // h-11
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  closeIcon: {
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContent: {
    flex: 1,
    minHeight: 0, // allows shrinking
  },
  scrollContentContainer: {
    paddingHorizontal: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
});
