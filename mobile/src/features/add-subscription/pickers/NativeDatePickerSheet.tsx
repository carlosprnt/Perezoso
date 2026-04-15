// NativeDatePickerSheet — centered floating date picker.
//
// Presents the native DateTimePicker (inline calendar on iOS 14+)
// inside a compact card that floats in the middle of the screen,
// backed by a dim/blur backdrop. No slide-up, no sheet — just a
// floating card with Cancelar / Aceptar at the bottom.

import React, { useEffect, useState } from 'react';
import {
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

export function NativeDatePickerSheet({
  visible,
  value,
  onChange,
  onClose,
  title = 'Seleccionar fecha',
  minimumDate,
}: Props) {
  const [tempValue, setTempValue] = useState<Date>(value);

  useEffect(() => {
    if (visible) setTempValue(value);
  }, [visible, value]);

  const handlePickerChange = (_: DateTimePickerEvent, d?: Date) => {
    if (d) setTempValue(d);
  };

  const handleAccept = () => {
    onChange(tempValue);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <BlurView
          intensity={20}
          tint="dark"
          style={StyleSheet.absoluteFillObject}
        />
      </Pressable>

      <View style={styles.centerWrap} pointerEvents="box-none">
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 12,
    paddingBottom: 8,
    width: '100%',
    maxWidth: 360,
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
