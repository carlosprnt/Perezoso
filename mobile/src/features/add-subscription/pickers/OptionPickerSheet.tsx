// OptionPickerSheet — iOS-style bottom sheet that presents a scrollable
// list of options with the current one marked. Used for currency,
// billing period, category, and number-of-people dropdowns inside the
// CreateSubscriptionSheet.
//
// Rendered as its own <Modal> so it stacks above the parent sheet.
// iOS-native Modal spawns a separate window, which is exactly what we
// want: the user taps a field, a compact picker slides up, they pick,
// it dismisses, and the parent sheet is still there.

import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';

import { fontFamily, fontSize } from '../../../design/typography';

interface Props {
  visible: boolean;
  title: string;
  options: readonly string[];
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

export function OptionPickerSheet({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();

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
          <Text style={styles.title}>{title}</Text>
          <ScrollView style={styles.list} bounces={false}>
            {options.map((opt) => {
              const isSelected = opt === selected;
              return (
                <Pressable
                  key={opt}
                  style={({ pressed }) => [
                    styles.row,
                    pressed && { backgroundColor: '#F2F2F7' },
                  ]}
                  onPress={() => {
                    onSelect(opt);
                    onClose();
                  }}
                >
                  <Text
                    style={[
                      styles.rowText,
                      isSelected && styles.rowTextSelected,
                    ]}
                  >
                    {opt}
                  </Text>
                  {isSelected && (
                    <Check size={18} color="#007AFF" strokeWidth={2.5} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
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
    maxHeight: '70%',
    paddingTop: 0,
  },
  handleZone: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D1D6',
  },
  title: {
    ...fontFamily.semibold,
    fontSize: fontSize[16],
    color: '#000000',
    letterSpacing: -0.2,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  list: {
    maxHeight: 420,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    minHeight: 50,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  rowText: {
    ...fontFamily.regular,
    fontSize: fontSize[16],
    color: '#000000',
    letterSpacing: -0.1,
  },
  rowTextSelected: {
    ...fontFamily.semibold,
    color: '#007AFF',
  },
});
