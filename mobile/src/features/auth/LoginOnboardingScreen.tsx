// LoginOnboardingScreen — horizontal paged carousel of 5 slides with
// a fixed bottom sheet overlay that renders the title/body/buttons
// for the current slide. The sheet persists (no remount) so the
// rounded top corners + shadow feel "pinned" while heroes scroll
// behind it.

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedScrollHandler,
  useSharedValue,
  type ScrollHandlerProcessed,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight } from 'lucide-react-native';

import { useTheme } from '../../design/useTheme';
import { fontFamily, fontSize } from '../../design/typography';
import { radius } from '../../design/radius';
import { haptic } from '../../lib/haptics';
import { HalfSheet } from '../../components/HalfSheet';

import {
  ONBOARDING_SLIDES,
  LAST_SLIDE_INDEX,
  SLIDE_SCREENSHOTS,
  type SlideMeta,
} from './constants';
import { OnboardingSlide } from './OnboardingSlide';
import { OnboardingBottomSheet } from './OnboardingBottomSheet';
import { SocialLoginButtons } from './SocialLoginButtons';

import { FloatingLogosHero } from './heroes/FloatingLogosHero';
import { ScreenshotHero } from './heroes/ScreenshotHero';

const { width: SCREEN_W } = Dimensions.get('window');

export interface LoginOnboardingHandlers {
  onPressGoogle?: () => void;
  onPressApple?: () => void;
  onPressTerms?: () => void;
  onPressPrivacy?: () => void;
}

export function LoginOnboardingScreen(handlers: LoginOnboardingHandlers = {}) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<Animated.ScrollView>(null);

  // Continuous page position (scrollX / pageWidth). Drives dots + heroes.
  const page = useSharedValue(0);
  const [pageIndex, setPageIndex] = useState(0);

  const scrollHandler: ScrollHandlerProcessed = useAnimatedScrollHandler({
    onScroll: (e) => {
      page.value = e.contentOffset.x / SCREEN_W;
    },
    onMomentumEnd: (e) => {
      const idx = Math.round(e.contentOffset.x / SCREEN_W);
      runOnJS(setPageIndex)(idx);
    },
  });

  const goTo = useCallback((idx: number) => {
    scrollRef.current?.scrollTo({ x: idx * SCREEN_W, animated: true });
  }, []);

  const onContinueSlide = useCallback(() => {
    haptic.selection();
    const next = Math.min(pageIndex + 1, LAST_SLIDE_INDEX);
    goTo(next);
  }, [pageIndex, goTo]);

  // "Iniciar sesión" opens a half-sheet with Google/Apple buttons
  // instead of jumping to the last onboarding slide.
  const [loginSheetOpen, setLoginSheetOpen] = useState(false);

  const onOpenLoginSheet = useCallback(() => {
    haptic.selection();
    setLoginSheetOpen(true);
  }, []);

  const onCloseLoginSheet = useCallback(() => {
    setLoginSheetOpen(false);
  }, []);

  const onPressGoogle = useCallback(() => {
    handlers.onPressGoogle?.();
  }, [handlers]);

  const onPressApple = useCallback(() => {
    handlers.onPressApple?.();
  }, [handlers]);

  // Reserve a constant vertical slot for the bottom sheet across all
  // slides so the hero area doesn't jump in size on page change. The
  // sheet itself is absolutely positioned so actual rendered height
  // can float freely inside this budget.
  const RESERVED_SHEET_HEIGHT = 330;
  const heroTopInset = 100;

  const renderHero = useMemo(
    () => (slide: SlideMeta, idx: number) => {
      return (
        <OnboardingSlide
          key={slide.id}
          index={idx}
          page={page}
          heroTopInset={heroTopInset}
          sheetHeight={RESERVED_SHEET_HEIGHT}
        >
          {(parallax) => {
            if (slide.id === 'floating-logos') {
              return <FloatingLogosHero parallax={parallax} />;
            }
            const source = SLIDE_SCREENSHOTS[slide.id];
            if (!source) return null;
            return <ScreenshotHero source={source} parallax={parallax} />;
          }}
        </OnboardingSlide>
      );
    },
    [page, heroTopInset],
  );

  const activeSlide = ONBOARDING_SLIDES[pageIndex];
  const isLast = pageIndex === LAST_SLIDE_INDEX;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Slides ─────────────────────────── */}
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        style={styles.scroll}
      >
        {ONBOARDING_SLIDES.map(renderHero)}
      </Animated.ScrollView>

      {/* Bottom sheet (persistent) ──────── */}
      <OnboardingBottomSheet
        title={activeSlide.title}
        body={activeSlide.body}
        index={pageIndex}
        page={page}
        count={ONBOARDING_SLIDES.length}
        showLegal={isLast}
        onPressTerms={handlers.onPressTerms}
        onPressPrivacy={handlers.onPressPrivacy}
      >
        {isLast ? (
          <View style={{ flex: 1 }}>
            <SocialLoginButtons
              onPressGoogle={onPressGoogle}
              onPressApple={onPressApple}
            />
          </View>
        ) : (
          <>
            <Pressable
              onPress={onOpenLoginSheet}
              style={({ pressed }) => [
                styles.secondaryBtn,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderLight,
                },
                pressed && { opacity: 0.8 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Iniciar sesión"
            >
              <Text style={[styles.secondaryBtnText, { color: colors.textPrimary }]}>
                Iniciar sesión
              </Text>
            </Pressable>
            <Pressable
              onPress={onContinueSlide}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: colors.textPrimary },
                pressed && { opacity: 0.85 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Continuar"
            >
              <Text style={[styles.primaryBtnText, { color: colors.background }]}>
                Continuar
              </Text>
              <ArrowRight size={16} color={colors.background} strokeWidth={2.4} />
            </Pressable>
          </>
        )}
      </OnboardingBottomSheet>

      {/* Login sheet — opens from "Iniciar sesión" on any non-final slide */}
      <HalfSheet
        isOpen={loginSheetOpen}
        onClose={onCloseLoginSheet}
        title="Iniciar sesión"
        heightFraction={0.38}
      >
        <View style={styles.loginSheetContent}>
          <SocialLoginButtons
            onPressGoogle={() => {
              onCloseLoginSheet();
              onPressGoogle();
            }}
            onPressApple={() => {
              onCloseLoginSheet();
              onPressApple();
            }}
          />
          <Text style={[styles.legalText, { color: colors.textMuted }]}>
            Al continuar, aceptas los{' '}
            <Text
              style={styles.legalLink}
              onPress={handlers.onPressTerms}
            >
              Términos de uso
            </Text>
            {' y la '}
            <Text
              style={styles.legalLink}
              onPress={handlers.onPressPrivacy}
            >
              Política de privacidad
            </Text>
            .
          </Text>
        </View>
      </HalfSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  secondaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    ...fontFamily.semibold,
    fontSize: fontSize[15],
    letterSpacing: -0.1,
  },
  primaryBtn: {
    flex: 1.3,
    height: 52,
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    ...fontFamily.semibold,
    fontSize: fontSize[15],
    letterSpacing: -0.1,
  },
  loginSheetContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    gap: 20,
  },
  legalText: {
    ...fontFamily.regular,
    fontSize: 11,
    lineHeight: 11 * 1.5,
    textAlign: 'center',
  },
  legalLink: {
    ...fontFamily.semibold,
    textDecorationLine: 'underline',
  },
});
