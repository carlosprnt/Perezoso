// DemoSheet — secondary sheet above SettingsSheet that lets the user
// swap between three preset app states:
//
//   · Vacío  — 0 subscriptions, free user
//   · Básico — 10 subscriptions, free user
//   · Pro    — 20 subscriptions, Perezoso Plus active
//
// Useful for screenshots, demos, and exercising the UI at different
// data volumes without creating real subscriptions. Tapping a preset
// calls `useSubscriptionsStore.setPreset(...)` which atomically swaps
// the subscription list AND the Plus flag — every screen that reads
// them (dashboard, list, settings "Perezoso Plus" card) updates in
// lockstep.
//
// Same Modal + Reanimated pattern as `TagsBottomSheet`, so the sheet
// layers cleanly on top of the native Ajustes pageSheet.

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Reanimated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, X } from 'lucide-react-native';

import { fontFamily, fontSize } from '../../design/typography';
import { radius } from '../../design/radius';
import { shadows } from '../../design/shadows';
import { SETTINGS_PALETTE as C } from './components';
import { useDemoSheetStore } from './useSettingsStore';
import { useSubscriptionsStore } from '../../stores/subscriptionsStore';
import type { AppPreset } from '../subscriptions/presets';

// Selector: either a demo preset or the string 'real' to mean "use my
// real Supabase account".
type Choice = 'real' | AppPreset;

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const ENTER_MS = 280;
const EXIT_MS = 220;

interface Option {
  choice: Choice;
  title: string;
  description: string;
}

const OPTIONS: Option[] = [
  {
    choice: 'real',
    title: 'Mi cuenta',
    description: 'Tus suscripciones reales. Añadir, editar y eliminar se guarda en tu cuenta.',
  },
  {
    choice: 'empty',
    title: 'Demo · Vacío',
    description: 'Sin suscripciones. Estado inicial tras el registro.',
  },
  {
    choice: 'basic',
    title: 'Demo · Básico',
    description: '10 suscripciones activas, sin Perezoso Plus.',
  },
  {
    choice: 'pro',
    title: 'Demo · Pro',
    description: '20 suscripciones activas con Perezoso Plus.',
  },
];

export function DemoSheet() {
  const isOpen        = useDemoSheetStore((s) => s.isOpen);
  const closeSheet    = useDemoSheetStore((s) => s.closeSheet);
  const mode          = useSubscriptionsStore((s) => s.mode);
  const preset        = useSubscriptionsStore((s) => s.preset);
  const useRealMode   = useSubscriptionsStore((s) => s.useRealMode);
  const useDemoPreset = useSubscriptionsStore((s) => s.useDemoPreset);

  const currentChoice: Choice = mode === 'real' ? 'real' : preset;

  const [mounted, setMounted] = useState(isOpen);

  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // ── Enter / exit animations ───────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      translateY.value = SCREEN_HEIGHT;
      translateY.value = withTiming(0, { duration: ENTER_MS });
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: ENTER_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else if (mounted) {
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: EXIT_MS }, (fin) => {
        if (fin) runOnJS(setMounted)(false);
      });
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: EXIT_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      'worklet';
      if (e.translationY > 0) {
        translateY.value = e.translationY;
      } else {
        translateY.value = e.translationY * 0.15;
      }
    })
    .onEnd((e) => {
      'worklet';
      const shouldDismiss = e.translationY > 100 || e.velocityY > 600;
      if (shouldDismiss) {
        translateY.value = withTiming(SCREEN_HEIGHT, { duration: EXIT_MS });
        runOnJS(closeSheet)();
      } else {
        translateY.value = withTiming(0, { duration: 200 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!mounted) return null;

  const handleSelect = (next: Choice) => {
    if (next === 'real') {
      useRealMode();
    } else {
      useDemoPreset(next);
    }
    closeSheet();
  };

  return (
    <Modal
      visible={mounted}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={closeSheet}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          styles.backdrop,
          { opacity: backdropOpacity },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={closeSheet}
          accessibilityLabel="Cerrar demo"
        />
      </Animated.View>

      <View style={styles.sheetWrap} pointerEvents="box-none">
        <Reanimated.View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16) + 12 },
            sheetStyle,
          ]}
        >
          <GestureDetector gesture={panGesture}>
            <View>
              <View style={styles.handleWrap}>
                <View style={styles.handle} />
              </View>

              <View style={styles.header}>
                <Text style={styles.title}>Demo</Text>
                <Pressable
                  style={styles.closeBtn}
                  onPress={closeSheet}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar"
                >
                  <X size={15} color="#3C3C43" strokeWidth={2.5} />
                </Pressable>
              </View>

              <Text style={styles.subtitle}>
                Cambia entre estados de demostración para probar la app
                con distintos volúmenes de contenido.
              </Text>
            </View>
          </GestureDetector>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {OPTIONS.map((opt) => {
              const isActive = currentChoice === opt.choice;
              return (
                <Pressable
                  key={opt.choice}
                  onPress={() => handleSelect(opt.choice)}
                  style={({ pressed }) => [
                    styles.option,
                    isActive && styles.optionActive,
                    pressed && { opacity: 0.85 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={opt.title}
                  accessibilityState={{ selected: isActive }}
                >
                  <View style={styles.optionText}>
                    <Text style={styles.optionTitle}>{opt.title}</Text>
                    <Text style={styles.optionDesc}>{opt.description}</Text>
                  </View>
                  <View
                    style={[
                      styles.checkCircle,
                      isActive && styles.checkCircleActive,
                    ]}
                  >
                    {isActive && (
                      <Check size={14} color="#FFFFFF" strokeWidth={3} />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </Reanimated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: SCREEN_HEIGHT * 0.72,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 6,
    ...shadows.sheet,
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 10,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: radius.full,
    backgroundColor: '#D4D4D4',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    paddingBottom: 4,
  },
  title: {
    ...fontFamily.bold,
    fontSize: fontSize[20],
    color: '#000000',
    letterSpacing: -0.4,
    flex: 1,
    paddingRight: 12,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EBEBF0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    ...fontFamily.regular,
    fontSize: fontSize[14],
    color: C.textMuted,
    letterSpacing: -0.1,
    paddingHorizontal: 2,
    paddingTop: 4,
    paddingBottom: 14,
  },

  scroll: { flexGrow: 0 },
  scrollContent: {
    paddingTop: 2,
    paddingBottom: 8,
    gap: 10,
  },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.cardBg,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionActive: {
    borderColor: '#000000',
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    ...fontFamily.bold,
    fontSize: fontSize[16],
    color: '#000000',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  optionDesc: {
    ...fontFamily.regular,
    fontSize: fontSize[13],
    color: C.textMuted,
    letterSpacing: -0.05,
    lineHeight: fontSize[13] * 1.4,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: '#D4D4D4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleActive: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
});
