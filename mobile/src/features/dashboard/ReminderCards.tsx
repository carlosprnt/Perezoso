// Dashboard: ReminderCards (Savings Carousel)
// Replicates web's SavingsCarousel with stacked peek cards.
//
// Two cards:
//   1. Notification reminder (Bell icon, gradient bg, "activate 7-day alert")
//   2. Savings opportunity (Sparkles icon, gradient bg, "shared plans save €X")
//
// Interaction: swipe the front card horizontally to dismiss and reveal the
// one behind it. The peek card sits slightly behind (y +4px, scale 0.975,
// opacity 0.9). When the front is swiped away, the peek card springs forward.

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, Sparkles } from 'lucide-react-native';
import { useTheme } from '../../design/useTheme';
import { fontFamily, fontSize } from '../../design/typography';
import { radius } from '../../design/radius';
import { shadows } from '../../design/shadows';
import { Pressable } from '../../components/Pressable';

const PEEK_OFFSET = 4;
const PEEK_SCALE = 0.025;
const PEEK_DIM = 0.10;
const SWIPE_THRESHOLD = 60;
const VELOCITY_THRESHOLD = 400;
const CARD_FLY_X = 420;

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
  sharedSavings?: string; // e.g. "18,86€"
  onActivateReminder?: () => void;
  onViewSavings?: () => void;
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

  const Icon = item.icon === 'bell' ? Bell : Sparkles;

  return (
    <View style={[styles.shell, { backgroundColor: colors.surface }, shadows.cardSm]}>
      <View style={styles.body}>
        <LinearGradient
          colors={item.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconWrap}
        >
          <Icon size={20} strokeWidth={2} color={item.iconColor} />
        </LinearGradient>

        <View style={styles.textWrap}>
          {item.body}
        </View>
      </View>

      <View style={styles.buttons}>
        <Pressable onPress={onDismiss} activeScale={0.97}>
          <View style={styles.dismissBtn}>
            <Text style={[styles.dismissText, {
              color: isDark ? '#636366' : '#8E8E93',
            }]}>No me interesa</Text>
          </View>
        </Pressable>
        <Pressable onPress={onCta} activeScale={0.97} style={{ flex: 1 }}>
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

// ─── Carousel ───────────────────────────────────────────────────────

export function ReminderCards({
  annualCount,
  sharedSavings = '18,86\u20AC',
  onActivateReminder,
  onViewSavings,
}: ReminderCardsProps) {
  const { colors } = useTheme();

  // Build the initial item list
  const initialItems: ReminderItem[] = [];

  if (annualCount > 0) {
    initialItems.push({
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
      ctaLabel: 'Avisarme 7 d\u00EDas antes',
      onCta: onActivateReminder,
    });
  }

  initialItems.push({
    id: 'savings',
    icon: 'sparkles',
    gradient: ['#FEF3C7', '#FDE68A'] as const,
    iconColor: '#92400E',
    body: (
      <Text style={[styles.bodyText, { color: colors.textPrimary }]}>
        Compartir planes te est{'\u00E1'} ahorrando{' '}
        <Text style={styles.bodyBold}>{sharedSavings}</Text>
        {' '}al mes. Mira qu{'\u00E9'} m{'\u00E1'}s puedes compartir.
      </Text>
    ),
    ctaLabel: 'Ver oportunidades',
    onCta: onViewSavings,
  });

  const [items, setItems] = useState<ReminderItem[]>(initialItems);
  const [frontIdx, setFrontIdx] = useState(0);

  const dragX = useSharedValue(0);
  const dragProgress = useSharedValue(0); // 0..1 during drag
  const isAnimating = useSharedValue(false);

  const advanceFront = useCallback(() => {
    setFrontIdx((i) => (i + 1) % items.length);
  }, [items.length]);

  const resetDrag = useCallback(() => {
    dragX.value = 0;
    dragProgress.value = 0;
  }, [dragX, dragProgress]);

  const gesture = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .failOffsetY([-16, 16])
    .onUpdate((e) => {
      if (isAnimating.value || items.length < 2) return;
      dragX.value = e.translationX;
      dragProgress.value = Math.min(1, Math.abs(e.translationX) / SWIPE_THRESHOLD);
    })
    .onEnd((e) => {
      if (isAnimating.value || items.length < 2) return;
      const shouldSwipe =
        Math.abs(e.translationX) > SWIPE_THRESHOLD ||
        Math.abs(e.velocityX) > VELOCITY_THRESHOLD;

      if (shouldSwipe) {
        isAnimating.value = true;
        const dir = e.translationX > 0 ? 1 : -1;
        dragX.value = withTiming(
          dir * CARD_FLY_X,
          { duration: 240 },
          (finished) => {
            if (finished) {
              runOnJS(advanceFront)();
              runOnJS(resetDrag)();
              isAnimating.value = false;
            }
          },
        );
      } else {
        dragX.value = withSpring(0, { damping: 22, stiffness: 320 });
        dragProgress.value = withSpring(0, { damping: 22, stiffness: 320 });
      }
    });

  const frontStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      dragX.value,
      [-CARD_FLY_X, 0, CARD_FLY_X],
      [-7, 0, 7],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      Math.abs(dragX.value),
      [0, CARD_FLY_X],
      [1, 0],
      Extrapolation.CLAMP,
    );
    return {
      transform: [
        { translateX: dragX.value },
        { rotate: `${rotate}deg` },
      ],
      opacity,
    };
  });

  const peekStyle = useAnimatedStyle(() => {
    // As the front card is dragged, the peek rises to depth 0
    const depth = 1 - dragProgress.value;
    return {
      transform: [
        { translateY: depth * PEEK_OFFSET },
        { scale: 1 - depth * PEEK_SCALE },
      ],
      opacity: 1 - depth * PEEK_DIM,
    };
  });

  if (items.length === 0) return null;

  const frontItem = items[frontIdx];
  const peekItem = items[(frontIdx + 1) % items.length];
  const hasPeek = items.length > 1;

  const handleDismissFront = useCallback(() => {
    if (isAnimating.value || items.length < 2) return;
    isAnimating.value = true;
    dragX.value = withTiming(-CARD_FLY_X, { duration: 240 }, (finished) => {
      if (finished) {
        runOnJS(advanceFront)();
        runOnJS(resetDrag)();
        isAnimating.value = false;
      }
    });
  }, [advanceFront, resetDrag, dragX, isAnimating, items.length]);

  return (
    <View style={styles.container}>
      {/* Peek card behind */}
      {hasPeek && (
        <Animated.View style={[styles.peek, peekStyle]}>
          <CardShell item={peekItem} />
        </Animated.View>
      )}

      {/* Front card with gesture */}
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.front, frontStyle]}>
          <CardShell
            item={frontItem}
            onCta={frontItem.onCta}
            onDismiss={handleDismissFront}
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
  peek: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  front: {
    position: 'relative',
  },
  shell: {
    borderRadius: radius.card, // 32px
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textWrap: {
    flex: 1,
    paddingTop: 2,
  },
  bodyText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize[14],
    lineHeight: fontSize[14] * 1.45,
  },
  bodyBold: {
    fontFamily: fontFamily.bold,
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
    fontFamily: fontFamily.semibold,
    fontSize: fontSize[13],
  },
  ctaBtn: {
    height: 36,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  ctaText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize[13],
  },
});
