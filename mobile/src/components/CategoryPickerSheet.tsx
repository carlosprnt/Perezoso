import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
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
import { Check, Plus, X } from 'lucide-react-native';

import { fontFamily, fontSize } from '../design/typography';
import { radius } from '../design/radius';
import { shadows } from '../design/shadows';
import { useTagsStore } from '../features/settings/useSettingsStore';
import { useTheme } from '../design/useTheme';
import { useT } from '../lib/i18n/LocaleProvider';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const ENTER_MS = 280;
const EXIT_MS = 220;

const CATEGORY_DISPLAY_KEYS: Record<string, string> = {
  streaming: 'category.streaming',
  music: 'category.music',
  productivity: 'category.productivity',
  cloud: 'category.cloud',
  ai: 'category.ai',
  health: 'category.health',
  gaming: 'category.gaming',
  education: 'category.education',
  mobility: 'category.mobility',
  home: 'category.home',
  other: 'category.other',
};

const BASE_CATEGORIES = [
  'streaming', 'music', 'productivity', 'cloud', 'ai',
  'health', 'gaming', 'education', 'mobility', 'home', 'other',
];

interface Props {
  visible: boolean;
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

export function CategoryPickerSheet({ visible, selected, onSelect, onClose }: Props) {
  const t = useT();
  const { isDark } = useTheme();
  const tags = useTagsStore((s) => s.tags);
  const addTag = useTagsStore((s) => s.addTag);

  const [mounted, setMounted] = useState(visible);
  const [newCategory, setNewCategory] = useState('');
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setNewCategory('');
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

  const handleSelect = useCallback((key: string) => {
    onSelect(key);
    onClose();
  }, [onSelect, onClose]);

  const handleAdd = useCallback(() => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    addTag(trimmed);
    setNewCategory('');
    onSelect(trimmed);
    onClose();
  }, [newCategory, addTag, onSelect, onClose]);

  if (!mounted) return null;

  const textColor = isDark ? '#FFFFFF' : '#000000';
  const mutedColor = '#8E8E93';
  const sheetBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const closeBg = isDark ? '#3A3A3C' : '#EBEBF0';
  const rowBg = isDark ? '#2C2C2E' : '#FFFFFF';
  const checkColor = isDark ? '#0A84FF' : '#007AFF';
  const addRowBg = isDark ? '#2C2C2E' : '#F2F2F7';
  const iconColor = isDark ? '#AEAEB2' : '#8E8E93';
  const sectionColor = isDark ? '#AEAEB2' : '#6E6E73';

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
                  {t('categoryPicker.title')}
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
                {t('categoryPicker.subtitle')}
              </Text>

              <ScrollView
                style={styles.listScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {BASE_CATEGORIES.map((key) => {
                  const isSelected = key === selected;
                  return (
                    <Pressable
                      key={key}
                      style={({ pressed }) => [
                        styles.row,
                        { backgroundColor: rowBg },
                        pressed && { opacity: 0.7 },
                      ]}
                      onPress={() => handleSelect(key)}
                    >
                      <Text style={[styles.rowLabel, { color: textColor }]} numberOfLines={1}>
                        {t(CATEGORY_DISPLAY_KEYS[key])}
                      </Text>
                      {isSelected && (
                        <Check size={18} color={checkColor} strokeWidth={2.5} />
                      )}
                    </Pressable>
                  );
                })}

                {tags.length > 0 && (
                  <Text style={[styles.sectionHeader, { color: sectionColor }]}>
                    {t('categoryPicker.custom')}
                  </Text>
                )}

                {tags.map((tag) => {
                  const isSelected = tag.name === selected;
                  return (
                    <Pressable
                      key={tag.id}
                      style={({ pressed }) => [
                        styles.row,
                        { backgroundColor: rowBg },
                        pressed && { opacity: 0.7 },
                      ]}
                      onPress={() => handleSelect(tag.name)}
                    >
                      <Text style={[styles.rowLabel, { color: textColor }]} numberOfLines={1}>
                        {tag.name}
                      </Text>
                      {isSelected && (
                        <Check size={18} color={checkColor} strokeWidth={2.5} />
                      )}
                    </Pressable>
                  );
                })}

                {/* Add new category */}
                <View style={[styles.addRow, { backgroundColor: addRowBg }]}>
                  <View style={styles.addIcon}>
                    <Plus size={18} color={iconColor} strokeWidth={2.4} />
                  </View>
                  <TextInput
                    style={[styles.addInput, { color: textColor }]}
                    value={newCategory}
                    onChangeText={setNewCategory}
                    placeholder={t('categoryPicker.newPlaceholder')}
                    placeholderTextColor={mutedColor}
                    returnKeyType="done"
                    onSubmitEditing={handleAdd}
                    autoCorrect={false}
                    maxLength={30}
                  />
                  <Pressable
                    onPress={handleAdd}
                    disabled={!newCategory.trim()}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.addCta,
                      !newCategory.trim() && { opacity: 0.4 },
                      pressed && { opacity: 0.6 },
                    ]}
                  >
                    <Text style={[styles.addCtaText, { color: textColor }]}>
                      {t('categoryPicker.add')}
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
    maxHeight: SCREEN_HEIGHT * 0.6,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
    marginBottom: 4,
    gap: 12,
  },
  rowLabel: {
    ...fontFamily.medium,
    fontSize: fontSize[16],
    letterSpacing: -0.1,
    flex: 1,
  },
  sectionHeader: {
    ...fontFamily.semiBold,
    fontSize: fontSize[13],
    letterSpacing: 0.2,
    textTransform: 'uppercase',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 50,
    marginTop: 8,
    gap: 12,
  },
  addIcon: {
    width: 24,
    alignItems: 'center',
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
});
