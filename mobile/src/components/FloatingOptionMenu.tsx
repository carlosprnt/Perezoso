// FloatingOptionMenu — centered floating menu matching the iOS dark
// context-menu aesthetic. Dim blurred backdrop + a compact card with
// the list of options. The currently-selected option shows a leading
// checkmark; all others have a 22px indent to keep text aligned.
//
// Presented as its own <Modal> (so it stacks above any parent sheet)
// with animationType="fade" — no slide, no bounce.

import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Check } from 'lucide-react-native';

import { fontFamily, fontSize } from '../design/typography';

interface Props {
  visible: boolean;
  options: readonly string[];
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

export function FloatingOptionMenu({
  visible,
  options,
  selected,
  onSelect,
  onClose,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      {/* Full-screen dim/blur backdrop; tapping dismisses. */}
      <Pressable style={styles.backdropPress} onPress={onClose}>
        <BlurView
          intensity={18}
          tint="dark"
          style={StyleSheet.absoluteFillObject}
        />
      </Pressable>

      {/* Centered menu card — pointerEvents handled per-child so backdrop
          still dismisses when tapping the padding between menu and edge. */}
      <View style={styles.centerWrap} pointerEvents="box-none">
        <BlurView intensity={40} tint="dark" style={styles.menu}>
          {options.map((opt, idx) => {
            const isSelected = opt === selected;
            const isLast = idx === options.length - 1;
            return (
              <Pressable
                key={opt}
                onPress={() => {
                  onSelect(opt);
                  onClose();
                }}
                style={({ pressed }) => [
                  styles.row,
                  !isLast && styles.rowDivider,
                  pressed && { backgroundColor: 'rgba(255,255,255,0.08)' },
                ]}
              >
                <View style={styles.rowCheck}>
                  {isSelected && (
                    <Check size={16} color="#FFFFFF" strokeWidth={3} />
                  )}
                </View>
                <Text style={styles.rowText}>{opt}</Text>
              </Pressable>
            );
          })}
        </BlurView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdropPress: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  centerWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menu: {
    minWidth: 220,
    borderRadius: 14,
    overflow: 'hidden',
    // BlurView alone can look washed out on some backgrounds; layering
    // a semi-transparent dark fill keeps contrast high.
    backgroundColor: 'rgba(40, 40, 40, 0.75)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  rowCheck: {
    width: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    ...fontFamily.regular,
    fontSize: fontSize[16],
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
});
