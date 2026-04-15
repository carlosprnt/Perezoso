// FloatingOptionMenu — iOS-native UIMenu pull-down.
//
// Floats anchored to the trigger's measured position (like a UIMenu /
// pull-down button). Light frosted-glass card, checkmark on the left
// for the selected option, hairline dividers between rows. Scale +
// opacity animation emerging from the anchor point — matches the
// native iOS system menu appearance.
//
// Callers must pass `anchor` (measured via View.measureInWindow on the
// trigger). If anchor is null the menu won't render.

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Check } from 'lucide-react-native';

import { fontFamily, fontSize } from '../design/typography';

export interface MenuAnchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  visible: boolean;
  anchor: MenuAnchor | null;
  options: readonly string[];
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const MENU_MIN_WIDTH = 220;
const MENU_MAX_WIDTH = 280;
const H_EDGE_PAD = 12;
const V_GAP = 6;
const ROW_HEIGHT = 44;

export function FloatingOptionMenu({
  visible,
  anchor,
  options,
  selected,
  onSelect,
  onClose,
}: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      opacity.setValue(0);
      scale.setValue(0.9);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 140,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          damping: 20,
          stiffness: 320,
          mass: 0.7,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, opacity, scale]);

  // Compute menu position relative to the anchor. Prefer below; flip
  // above if not enough room.
  let menuTop = 0;
  let menuLeft = 0;
  let originTop = true;
  if (anchor) {
    const estimatedHeight = options.length * ROW_HEIGHT + 4;
    const spaceBelow = SCREEN_H - (anchor.y + anchor.height) - 40;
    if (spaceBelow >= estimatedHeight || anchor.y < estimatedHeight + 40) {
      menuTop = anchor.y + anchor.height + V_GAP;
      originTop = true;
    } else {
      menuTop = anchor.y - estimatedHeight - V_GAP;
      originTop = false;
    }
    // Align menu's right edge to trigger's right edge when possible,
    // clamped inside screen padding. Looks like an iOS pull-down.
    const desiredRight = anchor.x + anchor.width;
    const desiredLeft = desiredRight - MENU_MIN_WIDTH;
    menuLeft = Math.max(
      H_EDGE_PAD,
      Math.min(desiredLeft, SCREEN_W - MENU_MIN_WIDTH - H_EDGE_PAD),
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      {/* Tap anywhere outside to dismiss — no dim overlay (iOS UIMenu). */}
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />

      {anchor && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.menu,
            {
              top: menuTop,
              left: menuLeft,
              maxWidth: MENU_MAX_WIDTH,
              opacity,
              transform: [
                { scale },
                // Slight Y offset so menu feels like it emerges from anchor.
                {
                  translateY: scale.interpolate({
                    inputRange: [0.9, 1],
                    outputRange: [originTop ? -4 : 4, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <BlurView intensity={60} tint="light" style={styles.menuBlur}>
            <View style={styles.menuFill}>
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
                      pressed && styles.rowPressed,
                    ]}
                  >
                    <View style={styles.rowCheck}>
                      {isSelected && (
                        <Check size={15} color="#000000" strokeWidth={2.5} />
                      )}
                    </View>
                    <Text style={styles.rowText} numberOfLines={1}>
                      {opt}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </BlurView>
        </Animated.View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  menu: {
    position: 'absolute',
    minWidth: MENU_MIN_WIDTH,
    borderRadius: 13,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  menuBlur: {
    borderRadius: 13,
    overflow: 'hidden',
  },
  menuFill: {
    // Subtle white wash over the blur so text stays legible against
    // any underlying colour.
    backgroundColor: 'rgba(245,245,248,0.78)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 44,
    gap: 10,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(60,60,67,0.29)',
  },
  rowPressed: {
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  rowCheck: {
    width: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    ...fontFamily.regular,
    fontSize: fontSize[16],
    color: '#000000',
    letterSpacing: -0.1,
    flex: 1,
  },
});
