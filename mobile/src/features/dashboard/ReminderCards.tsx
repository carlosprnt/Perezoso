// Dashboard: ReminderCards (Savings Carousel)
// Stable-slot stacked carousel with seamless swipe-to-advance.
//
// Two cards:
//   1. Notification reminder (Bell icon, gradient bg, "activate 7-day alert")
//   2. Savings opportunity (Sparkles icon, gradient bg, "shared plans save €X")
//
// Interaction: swipe the front card horizontally to dismiss and reveal the
// one behind it. The peek card sits slightly behind (y +4 px, scale 0.975,
// opacity 0.9). When the front is swiped away, the peek springs forward and
// the dismissed card fades back in as the new peek behind it.
//
// Why "stable slots"
// ──────────────────
// Previous version kept a React `frontIdx` state and swapped which item was
// rendered in the "front" vs "peek" slot. On a swipe we had to set
// `frontIdx` (React re-render) AND reset the shared values (`dragX = 0`,
// `dragProgress = 0`). Because React commits asynchronously, the reset and
// the re-render landed in different frames — for one frame the old content
// was laid out with reset transforms (snapping the just-swiped card back
// to center), or the peek slot's NEW content briefly rendered at depth=0
// (center) before depth animated back to 1. Either way: a visible flicker.
//
// Here, items[0] is permanently bound to slot0 and items[1] to slot1.
// Swiping never changes which item lives in which slot — only each slot's
// translateX / depth / opacity animate, driven entirely on the UI thread.
// The "front" role is a shared value (`frontSlot`) so role swaps don't
// require any React re-render, and transitions run in a single frame train.
//
// Bell ring animation
// ───────────────────
// Every 7 s the reminder card's bell icon performs a subtle 5-step ring
// (± small rotation around the bell's top anchor). Uses withSequence on
// a shared value + transformOrigin to pivot around the bell's yoke.

import React, { useCallback, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  interpolate,
  Extrapolation,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, Sparkles } from 'lucide-react-native';
import { useTheme } from '../../design/useTheme';
import { fontFamily, fontSize } from '../../design/typography';
import { radius } from '../../design/radius';
import { haptic } from '../../lib/haptics';
import { shadows } from '../../design/shadows';
import { Pressable } from '../../components/Pressable';
import { useReminderDismissalsStore } from './useReminderDismissalsStore';

const PEEK_OFFSET = 4;
const PEEK_SCALE = 0.025;
const PEEK_DIM = 0.10;
const SWIPE_THRESHOLD = 60;
const VELOCITY_THRESHOLD = 400;
const CARD_FLY_X = 420;
const FLY_DURATION = 240;
const FADE_IN_DURATION = 200;

interface ReminderItem {
  id: string;
  icon: 'bell' | 'sparkles';
  gradient: readonly [string, string];
  iconColor: string;
  body: React.ReactNode;
  ctaLabel: string;
  onCta?: () => void;
}

interface ReminderCardsProps {
  annualCount: number;
  savingsCount: number;
  onActivateReminder?: () => boolean;
  onViewSavings?: () => void;
}

// ─── Bell icon with periodic ring animation ─────────────────────────

function RingingBell({
  size,
  color,
  strokeWidth = 2,
}: {
  size: number;
  color: string;
  strokeWidth?: number;
}) {
  // Rotate around the yoke (top center) so the "ring" reads as a pendulum
  // swing rather than a full-body spin — matches how real bells move.
  const rotation = useSharedValue(0);

  useEffect(() => {
    // Prime the loop: first ring after 7 s, then every 7 s thereafter.
    // withSequence + withDelay chained below fires a tight 5-step shake
    // that comes to rest at 0°.
    let mounted = true;
    const ring = () => {
      if (!mounted) return;
      rotation.value = withSequence(
        withTiming(-14, { duration: 80, easing: Easing.out(Easing.quad) }),
        withTiming(12, { duration: 100, easing: Easing.inOut(Easing.quad) }),
        withTiming(-9, { duration: 100, easing: Easing.inOut(Easing.quad) }),
        withTiming(7, { duration: 90, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 120, easing: Easing.out(Easing.cubic) }),
      );
    };
    // Start the first ring after a small warm-up delay so it doesn't fire
    // immediately on mount (users haven't looked at it yet).
    const warmup = setTimeout(() => {
      ring();
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      interval = setInterval(ring, 7000);
    }, 2800);
    let interval: ReturnType<typeof setInterval> | undefined;
    return () => {
      mounted = false;
      clearTimeout(warmup);
      if (interval) clearInterval(interval);
    };
  }, [rotation]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={[{ transformOrigin: '50% 10%' }, animStyle]}>
      <Bell size={size} strokeWidth={strokeWidth} color={color} />
    </Animated.View>
  );
}

// ─── Sparkles icon with periodic twinkle animation ──────────────────
//
// Every 5 s the main sparkles icon twinkles: a quick scale pulse
// (1 → 1.18 → 1) paired with an opacity blink (1 → 0.55 → 1). A pair of
// tiny accent stars orbit-fade in/out on alternating cycles to suggest
// the "sparkle" catching the light — like real twinkling stars.

function TwinklingSparkles({
  size,
  color,
  strokeWidth = 2,
}: {
  size: number;
  color: string;
  strokeWidth?: number;
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const accentA = useSharedValue(0); // top-right mini star
  const accentB = useSharedValue(0); // bottom-left mini star

  useEffect(() => {
    let mounted = true;
    let interval: ReturnType<typeof setInterval> | undefined;

    const twinkle = () => {
      if (!mounted) return;
      // Main icon pulse.
      scale.value = withSequence(
        withTiming(1.18, { duration: 220, easing: Easing.out(Easing.quad) }),
        withTiming(0.96, { duration: 180, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) }),
      );
      opacity.value = withSequence(
        withTiming(0.55, { duration: 180, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) }),
      );
      // Accent stars: staggered fade in & out so the sparkle feels alive.
      accentA.value = withSequence(
        withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 240, easing: Easing.in(Easing.quad) }),
      );
      accentB.value = withSequence(
        withTiming(0, { duration: 120 }), // delay relative to accentA
        withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 220, easing: Easing.in(Easing.quad) }),
      );
    };

    const warmup = setTimeout(() => {
      twinkle();
      interval = setInterval(twinkle, 5000);
    }, 1200);

    return () => {
      mounted = false;
      clearTimeout(warmup);
      if (interval) clearInterval(interval);
    };
  }, [scale, opacity, accentA, accentB]);

  const mainStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const accentAStyle = useAnimatedStyle(() => ({
    opacity: accentA.value,
    transform: [{ scale: 0.5 + accentA.value * 0.6 }],
  }));

  const accentBStyle = useAnimatedStyle(() => ({
    opacity: accentB.value,
    transform: [{ scale: 0.5 + accentB.value * 0.6 }],
  }));

  const accentSize = Math.round(size * 0.45);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={mainStyle}>
        <Sparkles size={size} strokeWidth={strokeWidth} color={color} />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          { position: 'absolute', top: -2, right: -2 },
          accentAStyle,
        ]}
      >
        <Sparkles size={accentSize} strokeWidth={strokeWidth} color={color} />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          { position: 'absolute', bottom: -1, left: -1 },
          accentBStyle,
        ]}
      >
        <Sparkles size={accentSize} strokeWidth={strokeWidth} color={color} />
      </Animated.View>
    </View>
  );
}

// ─── Shell card ─────────────────────────────────────────────────────

function CardShell({
  item,
  onCta,
  onDismiss,
}: {
  item: ReminderItem;
  onCta?: () => void;
  onDismiss?: () => void;
}) {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.shell, { backgroundColor: colors.surface }, shadows.cardSm]}>
      <View style={styles.body}>
        <LinearGradient
          colors={item.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconWrap}
        >
          {item.icon === 'bell' ? (
            <RingingBell size={20} color={item.iconColor} />
          ) : (
            <TwinklingSparkles size={20} color={item.iconColor} />
          )}
        </LinearGradient>

        <View style={styles.textWrap}>
          {item.body}
        </View>
      </View>

      <View style={styles.buttons}>
        <Pressable onPress={() => { haptic.light(); onDismiss?.(); }} activeScale={0.97}>
          <View style={styles.dismissBtn}>
            <Text style={[styles.dismissText, {
              color: isDark ? '#636366' : '#8E8E93',
            }]}>No me interesa</Text>
          </View>
        </Pressable>
        <Pressable onPress={() => { haptic.medium(); onCta?.(); }} activeScale={0.97} style={{ flex: 1 }}>
          <View style={[styles.ctaBtn, {
            backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
          }]}>
            <Text style={[styles.ctaText, { color: colors.textPrimary }]}>
              {item.ctaLabel}
            </Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Top-level carousel ─────────────────────────────────────────────

export function ReminderCards({
  annualCount,
  savingsCount,
  onActivateReminder,
  onViewSavings,
}: ReminderCardsProps) {
  const { colors } = useTheme();
  // Subscribe to the whole dismissals map so the component re-renders
  // the moment a card is dismissed; `isDismissed` is re-derived at
  // render-time from that fresh state.
  const dismissals = useReminderDismissalsStore((s) => s.dismissals);
  const isDismissed = useReminderDismissalsStore((s) => s.isDismissed);
  const dismiss = useReminderDismissalsStore((s) => s.dismiss);
  // `dismissals` is referenced so the subscription actually fires; the
  // check still goes through the store's time-aware selector.
  void dismissals;

  const allItems: ReminderItem[] = [];

  if (annualCount > 0) {
    // Tapping "Av\u00EDsame" both wires the reminders AND dismisses the
    // card — the same dismissal path as "No me interesa", so the card
    // stays hidden until a new annual sub is added (see
    // subscriptionsStore.addSubscription clearing this id).
    const handleReminderCta = () => {
      const activated = onActivateReminder?.() ?? true;
      if (activated) dismiss('reminder');
    };
    allItems.push({
      id: 'reminder',
      icon: 'bell',
      gradient: ['#DBEAFE', '#BFDBFE'] as const,
      iconColor: '#1E3A5F',
      body: (
        <Text style={[styles.bodyText, { color: colors.textPrimary }]}>
          Podr{'\u00ED'}as evitar una{' '}
          <Text style={styles.bodyBold}>renovaci{'\u00F3'}n anual</Text>
          {' '}por sorpresa si activas un aviso 7 d{'\u00ED'}as antes.
        </Text>
      ),
      ctaLabel: 'Av\u00EDsame',
      onCta: handleReminderCta,
    });
  }

  if (savingsCount > 0) {
    allItems.push({
      id: 'savings',
      icon: 'sparkles',
      gradient: ['#FEF3C7', '#FDE68A'] as const,
      iconColor: '#92400E',
      body: (
        <Text style={[styles.bodyText, { color: colors.textPrimary }]}>
          Tienes{' '}
          <Text style={styles.bodyBold}>
            {savingsCount === 1
              ? '1 oportunidad'
              : `${savingsCount} oportunidades`}
          </Text>
          {' '}de ahorro en tus suscripciones. Desc{'\u00FA'}brelas.
        </Text>
      ),
      ctaLabel: 'Ver oportunidades',
      onCta: onViewSavings,
    });
  }

  const items = allItems.filter((item) => !isDismissed(item.id));

  if (items.length === 0) return null;
  if (items.length === 1) {
    return (
      <CardShell
        item={items[0]}
        onCta={items[0].onCta}
        onDismiss={() => dismiss(items[0].id)}
      />
    );
  }

  return <TwoSlotCarousel a={items[0]} b={items[1]} onDismissItem={dismiss} />;
}

// ─── Stable 2-slot carousel ─────────────────────────────────────────
//
// items[0] → slot0 (in flow, anchors container height)
// items[1] → slot1 (absolute overlay)
//
// Each slot has its own animated position (translateX), depth (0 front /
// 1 peek), and opacity. The gesture attached to each slot only activates
// for the slot that's currently front (via zIndex the non-front slot
// isn't reachable by touch anyway, but frontSlot is checked defensively).
// Swipe-out flies the front off-screen then, in the SAME UI-thread frame,
// swaps roles: the other slot becomes front (depth → 0), the flown slot
// snaps back to (translateX=0, depth=1) and fades in as the new peek.

function TwoSlotCarousel({
  a,
  b,
  onDismissItem,
}: {
  a: ReminderItem;
  b: ReminderItem;
  onDismissItem: (id: string) => void;
}) {
  // Per-slot shared values.
  const t0 = useSharedValue(0);
  const t1 = useSharedValue(0);
  const d0 = useSharedValue(0); // 0 = front, 1 = peek
  const d1 = useSharedValue(1);
  const e0 = useSharedValue(1); // opacity multiplier
  const e1 = useSharedValue(1);
  // Which slot currently owns the "front" role.
  const frontSlot = useSharedValue(0);
  const isAnimating = useSharedValue(false);

  const makeGesture = (mySlot: 0 | 1) => {
    const myT = mySlot === 0 ? t0 : t1;
    const myD = mySlot === 0 ? d0 : d1;
    const myE = mySlot === 0 ? e0 : e1;
    const otherD = mySlot === 0 ? d1 : d0;
    const otherE = mySlot === 0 ? e1 : e0;

    return Gesture.Pan()
      .activeOffsetX([-8, 8])
      .failOffsetY([-16, 16])
      .onUpdate((evt) => {
        'worklet';
        if (isAnimating.value) return;
        if (frontSlot.value !== mySlot) return;
        myT.value = evt.translationX;
        const progress = Math.min(1, Math.abs(evt.translationX) / SWIPE_THRESHOLD);
        otherD.value = 1 - progress;
      })
      .onEnd((evt) => {
        'worklet';
        if (isAnimating.value) return;
        if (frontSlot.value !== mySlot) return;
        const shouldSwipe =
          Math.abs(evt.translationX) > SWIPE_THRESHOLD ||
          Math.abs(evt.velocityX) > VELOCITY_THRESHOLD;

        if (shouldSwipe) {
          isAnimating.value = true;
          runOnJS(haptic.light)();
          const dir = evt.translationX > 0 ? 1 : -1;
          // Fly out, fade out.
          myT.value = withTiming(
            dir * CARD_FLY_X,
            { duration: FLY_DURATION, easing: Easing.out(Easing.cubic) },
            (finished) => {
              if (finished) {
                // Atomic role swap on the UI thread — no React re-render.
                myT.value = 0;
                myD.value = 1; // now peek
                frontSlot.value = 1 - mySlot;
                // Fade this card back in at peek position.
                myE.value = withTiming(1, { duration: FADE_IN_DURATION });
                isAnimating.value = false;
              }
            },
          );
          myE.value = withTiming(0, { duration: FLY_DURATION });
          // Raise the other slot to front.
          otherD.value = withTiming(0, { duration: FLY_DURATION });
          // Cancel any pending fade and settle the new front at opacity 1.
          otherE.value = withTiming(1, { duration: FLY_DURATION });
        } else {
          // Cancel — spring back.
          myT.value = withSpring(0, { damping: 22, stiffness: 320 });
          otherD.value = withSpring(1, { damping: 22, stiffness: 320 });
        }
      });
  };

  const gesture0 = makeGesture(0);
  const gesture1 = makeGesture(1);

  // "No me interesa" button → fly the card off-screen and, when the
  // animation settles, hand the id back to the parent so it can mark
  // it dismissed in the store. The parent re-renders with the item
  // filtered out; either the peek card takes over as the single
  // remaining card, or the whole carousel unmounts.
  const dismissSlot = useCallback((mySlot: 0 | 1) => {
    if (isAnimating.value) return;
    if (frontSlot.value !== mySlot) return;
    haptic.light();
    const myT = mySlot === 0 ? t0 : t1;
    const myE = mySlot === 0 ? e0 : e1;
    const otherD = mySlot === 0 ? d1 : d0;
    const otherE = mySlot === 0 ? e1 : e0;
    const itemId = mySlot === 0 ? a.id : b.id;

    isAnimating.value = true;
    myT.value = withTiming(
      -CARD_FLY_X,
      { duration: FLY_DURATION, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) {
          runOnJS(onDismissItem)(itemId);
        }
      },
    );
    myE.value = withTiming(0, { duration: FLY_DURATION });
    otherD.value = withTiming(0, { duration: FLY_DURATION });
    otherE.value = withTiming(1, { duration: FLY_DURATION });
  }, [t0, t1, e0, e1, d0, d1, a.id, b.id, frontSlot, isAnimating, onDismissItem]);

  const slot0Style = useAnimatedStyle(() => {
    const depth = d0.value;
    const rotate = interpolate(
      t0.value,
      [-CARD_FLY_X, 0, CARD_FLY_X],
      [-7, 0, 7],
      Extrapolation.CLAMP,
    );
    return {
      transform: [
        { translateY: depth * PEEK_OFFSET },
        { translateX: t0.value },
        { scale: 1 - depth * PEEK_SCALE },
        { rotate: `${rotate}deg` },
      ],
      opacity: (1 - depth * PEEK_DIM) * e0.value,
      zIndex: depth < 0.5 ? 2 : 1,
    };
  });

  const slot1Style = useAnimatedStyle(() => {
    const depth = d1.value;
    const rotate = interpolate(
      t1.value,
      [-CARD_FLY_X, 0, CARD_FLY_X],
      [-7, 0, 7],
      Extrapolation.CLAMP,
    );
    return {
      transform: [
        { translateY: depth * PEEK_OFFSET },
        { translateX: t1.value },
        { scale: 1 - depth * PEEK_SCALE },
        { rotate: `${rotate}deg` },
      ],
      opacity: (1 - depth * PEEK_DIM) * e1.value,
      zIndex: depth < 0.5 ? 2 : 1,
    };
  });

  return (
    <View style={styles.container}>
      {/* Slot 0 — in flow, anchors container height */}
      <GestureDetector gesture={gesture0}>
        <Animated.View style={[styles.slotInFlow, slot0Style]}>
          <CardShell
            item={a}
            onCta={a.onCta}
            onDismiss={() => dismissSlot(0)}
          />
        </Animated.View>
      </GestureDetector>

      {/* Slot 1 — absolute overlay */}
      <GestureDetector gesture={gesture1}>
        <Animated.View style={[styles.slotAbsolute, slot1Style]}>
          <CardShell
            item={b}
            onCta={b.onCta}
            onDismiss={() => dismissSlot(1)}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  slotInFlow: {
    position: 'relative',
  },
  slotAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  shell: {
    borderRadius: radius.card, // 32 px
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    // Equal heights across items so the peek never visually sticks
    // below the front card when contents differ by a line. Kept modest
    // so the card feels compact — content drives the actual size.
    minHeight: 118,
    justifyContent: 'space-between',
  },
  body: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 6,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    // Clip the bell's ring swing so it stays inside the rounded icon chip.
    overflow: 'hidden',
  },
  textWrap: {
    flex: 1,
    paddingTop: 2,
  },
  bodyText: {
    ...fontFamily.regular,
    fontSize: fontSize[15],
    lineHeight: fontSize[15] * 1.4,
  },
  bodyBold: {
    ...fontFamily.bold,
  },
  buttons: {
    flexDirection: 'row',
    gap: 8,
  },
  dismissBtn: {
    height: 36,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissText: {
    ...fontFamily.semibold,
    fontSize: fontSize[13],
  },
  ctaBtn: {
    height: 36,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  ctaText: {
    ...fontFamily.semibold,
    fontSize: fontSize[13],
  },
});
