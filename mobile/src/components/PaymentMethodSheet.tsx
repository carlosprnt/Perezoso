import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
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
import { Check, CreditCard, Plus, Trash2, X } from 'lucide-react-native';

import { fontFamily, fontSize } from '../design/typography';
import { radius } from '../design/radius';
import { shadows } from '../design/shadows';
import { usePaymentMethodsStore } from '../features/settings/usePaymentMethodsStore';
import { useTheme } from '../design/useTheme';
import { useT } from '../lib/i18n/LocaleProvider';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const ENTER_MS = 280;
const EXIT_MS = 220;

interface Props {
  visible: boolean;
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

export function PaymentMethodSheet({ visible, selected, onSelect, onClose }: Props) {
  const t = useT();
  const { colors, isDark } = useTheme();
  const methods = usePaymentMethodsStore((s) => s.methods);
  const addMethod = usePaymentMethodsStore((s) => s.addMethod);
  const removeMethod = usePaymentMethodsStore((s) => s.removeMethod);

  const [mounted, setMounted] = useState(visible);
  const [newMethod, setNewMethod] = useState('');
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setNewMethod('');
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
  }, [visible]);

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
        runOnJS(onClose)();
      } else {
        translateY.value = withTiming(0, { duration: 200 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleAdd = useCallback(() => {
    const trimmed = newMethod.trim();
    if (!trimmed) return;
    addMethod(trimmed);
    setNewMethod('');
    onSelect(trimmed);
  }, [newMethod, addMethod, onSelect]);

  const handleSelect = useCallback((label: string) => {
    onSelect(label);
    onClose();
  }, [onSelect, onClose]);

  const handleClear = useCallback(() => {
    onSelect('');
    onClose();
  }, [onSelect, onClose]);

  const handleRemove = useCallback((id: string, name: string) => {
    Alert.alert(
      t('paymentMethods.deleteTitle'),
      t('paymentMethods.deleteBody', { name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            removeMethod(id);
            if (selected === name) onSelect('');
          },
        },
      ],
    );
  }, [removeMethod, selected, onSelect, t]);

  if (!mounted) return null;

  const cardBg = isDark ? '#1C1C1E' : '#F2F2F7';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const mutedColor = isDark ? '#8E8E93' : '#8E8E93';
  const sheetBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const closeBg = isDark ? '#3A3A3C' : '#EBEBF0';
  const rowBg = isDark ? '#2C2C2E' : '#FFFFFF';
  const iconColor = isDark ? '#AEAEB2' : '#8E8E93';
  const checkColor = isDark ? '#0A84FF' : '#007AFF';
  const addRowBg = isDark ? '#2C2C2E' : '#F2F2F7';

  return (
    <Modal
      visible={mounted}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        style={[StyleSheet.absoluteFillObject, styles.backdrop, { opacity: backdropOpacity }]}
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
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
                { backgroundColor: sheetBg, paddingBottom: Math.max(insets.bottom, 16) + 12 },
                sheetStyle,
              ]}
            >
              <View style={styles.handleWrap}>
                <View style={[styles.handle, { backgroundColor: isDark ? '#4A4A4C' : '#D4D4D4' }]} />
              </View>

              <View style={styles.header}>
                <Text style={[styles.title, { color: textColor }]}>
                  {t('paymentMethods.title')}
                </Text>
                <Pressable
                  style={[styles.closeBtn, { backgroundColor: closeBg }]}
                  onPress={onClose}
                  hitSlop={10}
                >
                  <X size={15} color={isDark ? '#AEAEB2' : '#3C3C43'} strokeWidth={2.5} />
                </Pressable>
              </View>

              <Text style={[styles.subtitle, { color: mutedColor }]}>
                {t('paymentMethods.subtitle')}
              </Text>

              <ScrollView
                style={styles.listScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* "None" option */}
                <Pressable
                  style={({ pressed }) => [
                    styles.methodRow,
                    { backgroundColor: rowBg },
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={handleClear}
                >
                  <View style={styles.methodIcon}>
                    <X size={18} color={mutedColor} strokeWidth={2} />
                  </View>
                  <Text style={[styles.methodLabel, { color: mutedColor }]}>
                    {t('paymentMethods.none')}
                  </Text>
                  {!selected && (
                    <Check size={18} color={checkColor} strokeWidth={2.5} />
                  )}
                </Pressable>

                {/* Saved methods */}
                {methods.map((m) => {
                  const isSelected = m.label === selected;
                  return (
                    <Pressable
                      key={m.id}
                      style={({ pressed }) => [
                        styles.methodRow,
                        { backgroundColor: rowBg },
                        pressed && { opacity: 0.7 },
                      ]}
                      onPress={() => handleSelect(m.label)}
                    >
                      <View style={styles.methodIcon}>
                        <CreditCard size={18} color={iconColor} strokeWidth={2} />
                      </View>
                      <Text style={[styles.methodLabel, { color: textColor }]} numberOfLines={1}>
                        {m.label}
                      </Text>
                      {isSelected && (
                        <Check size={18} color={checkColor} strokeWidth={2.5} />
                      )}
                      <Pressable
                        onPress={() => handleRemove(m.id, m.label)}
                        hitSlop={8}
                        style={({ pressed }) => [
                          styles.deleteBtn,
                          pressed && { opacity: 0.5 },
                        ]}
                      >
                        <Trash2 size={15} color={mutedColor} strokeWidth={2} />
                      </Pressable>
                    </Pressable>
                  );
                })}

                {methods.length === 0 && (
                  <Text style={[styles.emptyHint, { color: mutedColor }]}>
                    {t('paymentMethods.empty')}
                  </Text>
                )}

                {/* Add new method */}
                <View style={[styles.addRow, { backgroundColor: addRowBg }]}>
                  <View style={styles.methodIcon}>
                    <Plus size={18} color={iconColor} strokeWidth={2.4} />
                  </View>
                  <TextInput
                    ref={inputRef}
                    style={[styles.addInput, { color: textColor }]}
                    value={newMethod}
                    onChangeText={setNewMethod}
                    placeholder={t('paymentMethods.newPlaceholder')}
                    placeholderTextColor={mutedColor}
                    returnKeyType="done"
                    onSubmitEditing={handleAdd}
                    autoCorrect={false}
                    maxLength={40}
                  />
                  <Pressable
                    onPress={handleAdd}
                    disabled={!newMethod.trim()}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.addCta,
                      !newMethod.trim() && { opacity: 0.4 },
                      pressed && { opacity: 0.6 },
                    ]}
                  >
                    <Text style={[styles.addCtaText, { color: textColor }]}>
                      {t('paymentMethods.add')}
                    </Text>
                  </Pressable>
                </View>
              </ScrollView>
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 6,
    maxHeight: SCREEN_HEIGHT * 0.55,
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    paddingBottom: 4,
  },
  title: {
    ...fontFamily.semiBold,
    fontSize: fontSize[20],
    letterSpacing: -0.4,
    flex: 1,
    paddingRight: 12,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    ...fontFamily.medium,
    fontSize: fontSize[14],
    letterSpacing: -0.1,
    paddingHorizontal: 2,
    paddingTop: 2,
    paddingBottom: 14,
  },
  listScroll: {
    flexShrink: 1,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 50,
    marginBottom: 6,
    gap: 12,
  },
  methodIcon: {
    width: 24,
    alignItems: 'center',
  },
  methodLabel: {
    ...fontFamily.medium,
    fontSize: fontSize[16],
    letterSpacing: -0.1,
    flex: 1,
  },
  deleteBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 50,
    marginTop: 4,
    gap: 12,
  },
  addInput: {
    ...fontFamily.medium,
    fontSize: fontSize[16],
    letterSpacing: -0.1,
    flex: 1,
    padding: 0,
  },
  addCta: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addCtaText: {
    ...fontFamily.semiBold,
    fontSize: fontSize[15],
    letterSpacing: -0.1,
  },
  emptyHint: {
    ...fontFamily.medium,
    fontSize: fontSize[13],
    letterSpacing: -0.1,
    textAlign: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
});
