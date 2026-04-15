// NativeDatePickerSheet — thin wrapper around @react-native-community/
// datetimepicker, presented as a bottom sheet with Cancelar / Aceptar.
//
// On iOS we use the inline calendar (display="inline"), which is the
// native month-grid picker that ships in iOS 14+. The user taps a day,
// then confirms with "Aceptar" — no double-modal, no extra bounce.
//
// We commit the selection on "Aceptar" (not on each onChange) so the
// parent form only sees the final value.

import React, { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
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
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 10) },
          ]}
        >
          <View style={styles.handleZone}>
            <View style={styles.handle} />
          </View>

          <View style={styles.header}>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={handleAccept} hitSlop={8}>
              <Text style={styles.acceptText}>Aceptar</Text>
            </Pressable>
          </View>

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
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 12,
  },
  handleZone: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D1D6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  title: {
    ...fontFamily.semibold,
    fontSize: fontSize[16],
    color: '#000000',
    letterSpacing: -0.2,
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
  pickerWrap: {
    paddingBottom: 4,
  },
});
