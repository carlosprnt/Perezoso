// TagsBottomSheet — secondary sheet that slides up above the
// SettingsSheet to manage user-defined tags.
//
// Why a separate <Modal> on top of the Settings pageSheet?
// On iOS, React Native <Modal>s stack correctly: presenting a second
// transparent Modal while the Settings pageSheet is open layers the
// tags sheet above it with its own backdrop. That matches the
// "child sheet" feel requested by the spec ("por encima de la pantalla
// /modal de Ajustes"). The backdrop is intentionally kept soft — a
// 40% black tint on light mode — to remind the user they're temporarily
// in a sub-flow, not in a brand-new screen.
//
// Dismiss paths (all converge on the same exit animation):
//   · tap the backdrop
//   · tap the X close button
//   · pan down on the sheet (handle or body)
//
// Mock persistence — the tag list is stored in `useTagsStore` so it
// survives re-opens of the sheet but resets on app reload. Backed by
// an in-memory Zustand store; swap for Supabase mutations later.

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
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
import { Plus, Tag as TagIcon, X } from 'lucide-react-native';

import { fontFamily, fontSize } from '../../design/typography';
import { radius } from '../../design/radius';
import { shadows } from '../../design/shadows';
import {
  IconTile,
  SETTINGS_PALETTE as C,
  SettingsSectionCard,
} from './components';
import { useTagsStore, useSettingsStore } from './useSettingsStore';
import { useSubscriptionsStore } from '../../stores/subscriptionsStore';
import { usePaywallStore } from '../paywall/usePaywallStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const ENTER_MS = 280;
const EXIT_MS = 220;

export function TagsBottomSheet() {
  const isOpen = useTagsStore((s) => s.isOpen);
  const closeSheet = useTagsStore((s) => s.closeSheet);
  const tags = useTagsStore((s) => s.tags);
  const addTag = useTagsStore((s) => s.addTag);
  const removeTag = useTagsStore((s) => s.removeTag);

  // Render gate — we play the exit animation before unmounting so the
  // slide-down is actually seen.
  const [mounted, setMounted] = useState(isOpen);
  const [newTag, setNewTag] = useState('');

  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // ── Enter / exit animation ────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      setNewTag('');
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

  // ── Drag-down-to-dismiss ──────────────────────────────────────────
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      'worklet';
      if (e.translationY > 0) {
        translateY.value = e.translationY;
      } else {
        // Resist upward drags so the sheet doesn't run above its resting Y.
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

  // ── Handlers ──────────────────────────────────────────────────────
  const handleAdd = useCallback(() => {
    const trimmed = newTag.trim();
    if (!trimmed) return;
    const isPro = useSubscriptionsStore.getState().isPlusActive;
    if (!isPro && tags.length >= 2) {
      closeSheet();
      useSettingsStore.getState().close();
      setTimeout(() => usePaywallStore.getState().open('custom_categories'), 400);
      return;
    }
    addTag(trimmed);
    setNewTag('');
  }, [newTag, addTag, tags.length]);

  const handleRemove = useCallback(
    (id: string, name: string) => {
      Alert.alert(
        'Eliminar etiqueta',
        `¿Seguro que quieres eliminar "${name}"? Esta acción no se puede deshacer.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: () => removeTag(id),
          },
        ],
      );
    },
    [removeTag],
  );

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={closeSheet}
    >
      {/* Backdrop ——— tap anywhere to dismiss */}
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
          accessibilityLabel="Cerrar gestión de etiquetas"
        />
      </Animated.View>

      <KeyboardAvoidingView
        pointerEvents="box-none"
        style={StyleSheet.absoluteFillObject}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheetWrap} pointerEvents="box-none">
          <GestureDetector gesture={panGesture}>
            <Reanimated.View
              style={[
                styles.sheet,
                { paddingBottom: Math.max(insets.bottom, 16) + 12 },
                sheetStyle,
              ]}
            >
              {/* Drag handle */}
              <View style={styles.handleWrap}>
                <View style={styles.handle} />
              </View>

              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>Etiquetas</Text>
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
                Crea etiquetas para organizar tus suscripciones.
              </Text>

              {/* List of existing tags */}
              {tags.length > 0 && (
                <SettingsSectionCard
                  style={styles.listCard}
                  dividerInset={64}
                >
                  {tags.map((t) => (
                    <View key={t.id} style={styles.tagRow}>
                      <IconTile>
                        <TagIcon
                          size={16}
                          color={C.iconStroke}
                          strokeWidth={2.2}
                        />
                      </IconTile>
                      <Text
                        style={styles.tagName}
                        numberOfLines={1}
                      >
                        {t.name}
                      </Text>
                      <Pressable
                        onPress={() => handleRemove(t.id, t.name)}
                        hitSlop={10}
                        style={({ pressed }) => [
                          styles.tagRemove,
                          pressed && { opacity: 0.5 },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Eliminar etiqueta ${t.name}`}
                      >
                        <X
                          size={16}
                          color={C.textMuted}
                          strokeWidth={2.4}
                        />
                      </Pressable>
                    </View>
                  ))}
                </SettingsSectionCard>
              )}

              {/* Add new tag — inline input with trailing "Añadir" */}
              <View style={styles.addCard}>
                <IconTile>
                  <Plus size={18} color={C.iconStroke} strokeWidth={2.4} />
                </IconTile>
                <TextInput
                  style={styles.addInput}
                  value={newTag}
                  onChangeText={setNewTag}
                  placeholder="Nueva etiqueta"
                  placeholderTextColor={C.textMuted}
                  returnKeyType="done"
                  onSubmitEditing={handleAdd}
                  autoCorrect={false}
                  maxLength={32}
                />
                <Pressable
                  onPress={handleAdd}
                  disabled={!newTag.trim()}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.addCta,
                    !newTag.trim() && { opacity: 0.4 },
                    pressed && { opacity: 0.6 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Añadir etiqueta"
                >
                  <Text style={styles.addCtaText}>Añadir</Text>
                </Pressable>
              </View>

              {tags.length === 0 && (
                <Text style={styles.emptyHint}>
                  Aún no hay etiquetas. Crea la primera arriba.
                </Text>
              )}
            </Reanimated.View>
          </GestureDetector>
        </View>
      </KeyboardAvoidingView>
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
    paddingTop: 2,
    paddingBottom: 14,
  },

  listCard: {
    marginBottom: 12,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 60,
  },
  tagName: {
    ...fontFamily.semibold,
    fontSize: fontSize[16],
    color: '#000000',
    letterSpacing: -0.2,
    flex: 1,
    paddingLeft: 12,
    paddingRight: 8,
  },
  tagRemove: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.cardBg,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 60,
  },
  addInput: {
    ...fontFamily.regular,
    fontSize: fontSize[16],
    color: '#000000',
    letterSpacing: -0.1,
    flex: 1,
    paddingLeft: 12,
    paddingRight: 8,
    padding: 0,
  },
  addCta: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addCtaText: {
    ...fontFamily.semibold,
    fontSize: fontSize[15],
    color: '#000000',
    letterSpacing: -0.1,
  },

  emptyHint: {
    ...fontFamily.regular,
    fontSize: fontSize[13],
    color: C.textMuted,
    letterSpacing: -0.1,
    textAlign: 'center',
    paddingTop: 14,
    paddingHorizontal: 20,
  },
});
