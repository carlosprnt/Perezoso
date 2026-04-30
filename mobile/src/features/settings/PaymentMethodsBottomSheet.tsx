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
import { CreditCard, Plus, X } from 'lucide-react-native';

import { fontFamily, fontSize } from '../../design/typography';
import { radius } from '../../design/radius';
import { shadows } from '../../design/shadows';
import {
  IconTile,
  SETTINGS_PALETTE as C,
  SettingsSectionCard,
} from './components';
import { usePaymentMethodsStore } from './usePaymentMethodsStore';
import { useT } from '../../lib/i18n/LocaleProvider';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const ENTER_MS = 280;
const EXIT_MS = 220;

export function PaymentMethodsBottomSheet() {
  const t = useT();
  const isOpen = usePaymentMethodsStore((s) => s.isOpen);
  const closeSheet = usePaymentMethodsStore((s) => s.closeSheet);
  const methods = usePaymentMethodsStore((s) => s.methods);
  const addMethod = usePaymentMethodsStore((s) => s.addMethod);
  const removeMethod = usePaymentMethodsStore((s) => s.removeMethod);

  const [mounted, setMounted] = useState(isOpen);
  const [newMethod, setNewMethod] = useState('');

  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
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

  const handleAdd = useCallback(() => {
    const trimmed = newMethod.trim();
    if (!trimmed) return;
    addMethod(trimmed);
    setNewMethod('');
  }, [newMethod, addMethod]);

  const handleRemove = useCallback(
    (id: string, label: string) => {
      Alert.alert(
        t('paymentMethods.deleteTitle'),
        t('paymentMethods.deleteBody', { name: label }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: () => removeMethod(id),
          },
        ],
      );
    },
    [removeMethod, t],
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
          accessibilityLabel={t('paymentMethods.title')}
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
              <View style={styles.handleWrap}>
                <View style={styles.handle} />
              </View>

              <View style={styles.header}>
                <Text style={styles.title}>{t('settingsPaymentMethods.title')}</Text>
                <Pressable
                  style={styles.closeBtn}
                  onPress={closeSheet}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close')}
                >
                  <X size={15} color="#3C3C43" strokeWidth={2.5} />
                </Pressable>
              </View>

              <Text style={styles.subtitle}>
                {t('settingsPaymentMethods.subtitle')}
              </Text>

              {methods.length > 0 && (
                <SettingsSectionCard
                  style={styles.listCard}
                  dividerInset={64}
                >
                  {methods.map((method) => (
                    <View key={method.id} style={styles.tagRow}>
                      <IconTile>
                        <CreditCard
                          size={16}
                          color={C.iconStroke}
                          strokeWidth={2.2}
                        />
                      </IconTile>
                      <Text
                        style={styles.tagName}
                        numberOfLines={1}
                      >
                        {method.label}
                      </Text>
                      <Pressable
                        onPress={() => handleRemove(method.id, method.label)}
                        hitSlop={10}
                        style={({ pressed }) => [
                          styles.tagRemove,
                          pressed && { opacity: 0.5 },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={t('paymentMethods.deleteTitle')}
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

              <View style={styles.addCard}>
                <IconTile>
                  <Plus size={18} color={C.iconStroke} strokeWidth={2.4} />
                </IconTile>
                <TextInput
                  style={styles.addInput}
                  value={newMethod}
                  onChangeText={setNewMethod}
                  placeholder={t('paymentMethods.newPlaceholder')}
                  placeholderTextColor={C.textMuted}
                  returnKeyType="done"
                  onSubmitEditing={handleAdd}
                  autoCorrect={false}
                  maxLength={32}
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
                  accessibilityRole="button"
                  accessibilityLabel={t('paymentMethods.add')}
                >
                  <Text style={styles.addCtaText}>{t('paymentMethods.add')}</Text>
                </Pressable>
              </View>

              {methods.length === 0 && (
                <Text style={styles.emptyHint}>
                  {t('paymentMethods.empty')}
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
    ...fontFamily.semiBold,
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
    ...fontFamily.medium,
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
    ...fontFamily.semiBold,
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
    ...fontFamily.medium,
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
    ...fontFamily.semiBold,
    fontSize: fontSize[15],
    color: '#000000',
    letterSpacing: -0.1,
  },

  emptyHint: {
    ...fontFamily.medium,
    fontSize: fontSize[13],
    color: C.textMuted,
    letterSpacing: -0.1,
    textAlign: 'center',
    paddingTop: 14,
    paddingHorizontal: 20,
  },
});
