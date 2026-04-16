// NativeDatePickerSheet — centered floating date picker.
//
// Presents the native DateTimePicker (inline calendar on iOS 14+)
// inside a compact card that floats in the middle of the screen,
// backed by a dim/blur backdrop. Soft iOS-style appearance: fade +
// scale-in, easing-out cubic ~260ms (no bottom-sheet slide).

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import { fontFamily, fontSize } from '../../../design/typography';

interface Props {
  visible: boolean;
  value: Date;
  onChange: (d: Date) => void;
  onClose: () => void;
  title?: string;
  minimumDate?: Date;
}

const ENTER_MS = 240;
const EXIT_MS = 180;

export function NativeDatePickerSheet({
  visible,
  value,
  onChange,
  onClose,
  title = 'Seleccionar fecha',
  minimumDate,
}: Props) {
  const [tempValue, setTempValue] = useState<Date>(value);
  // Render-gate separate from `visible` so we can play the exit animation
  // before unmounting the Modal.
  const [mounted, setMounted] = useState(visible);

  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.94)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setTempValue(value);
      opacity.setValue(0);
      scale.setValue(0.94);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: ENTER_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          damping: 18,
          stiffness: 240,
          mass: 0.8,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: EXIT_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.96,
          duration: EXIT_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
    // `value` intentionally read on enter only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handlePickerChange = (_: DateTimePickerEvent, d?: Date) => {
    if (d) setTempValue(d);
  };

  const handleAccept = () => {
    onChange(tempValue);
    onClose();
  };

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose}>
          <BlurView
            intensity={20}
            tint="dark"
            style={StyleSheet.absoluteFillObject}
          />
        </Pressable>
      </Animated.View>

      <View style={styles.centerWrap} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.cardAnim,
            { opacity, transform: [{ scale }] },
          ]}
        >
          {/* Stop propagation so taps inside the card don't dismiss. */}
          <Pressable onPress={() => {}} style={styles.card}>
            <Text style={styles.title}>{title}</Text>

            <View style={styles.pickerWrap}>
              <DateTimePicker
                value={tempValue}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={handlePickerChange}
                minimumDate={minimumDate}
                locale="es-ES"
                themeVariant="light"
                accentColor="#000000"
                textColor="#000000"
              />
            </View>

            <View style={styles.actions}>
              <Pressable
                onPress={onClose}
                hitSlop={8}
                style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={handleAccept}
                hitSlop={8}
                style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.acceptText}>Aceptar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  centerWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  cardAnim: {
    width: '100%',
    maxWidth: 360,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 12,
    paddingBottom: 8,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  title: {
    ...fontFamily.semibold,
    fontSize: fontSize[16],
    color: '#000000',
    letterSpacing: -0.2,
    textAlign: 'center',
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  pickerWrap: {
    paddingBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelText: {
    ...fontFamily.regular,
    fontSize: fontSize[16],
    color: '#8E8E93',
    letterSpacing: -0.1,
  },
  acceptText: {
    ...fontFamily.semibold,
    fontSize: fontSize[16],
    color: '#007AFF',
    letterSpacing: -0.1,
  },
});
