// FloatingOptionMenu — iOS-native UIMenu pull-down.
//
// Floats anchored to the trigger's measured position (like a UIMenu /
// pull-down button). Frosted-glass card, checkmark on the left for the
// selected option, hairline dividers between rows. Scale + opacity
// animation emerging from the anchor point. Supports light and dark mode.

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
import { useTheme } from '../design/useTheme';

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
  const { isDark } = useTheme();
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
    const desiredRight = anchor.x + anchor.width;
    const desiredLeft = desiredRight - MENU_MIN_WIDTH;
    menuLeft = Math.max(
      H_EDGE_PAD,
      Math.min(desiredLeft, SCREEN_W - MENU_MIN_WIDTH - H_EDGE_PAD),
    );
  }

  const fillBg = isDark ? 'rgba(44,44,46,0.82)' : 'rgba(255,255,255,0.56)';
  const borderClr = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.55)';
  const rimTop = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.9)';
  const rimSide = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.55)';
  const dividerClr = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(60,60,67,0.22)';
  const pressedBg = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';
  const textClr = isDark ? '#FFFFFF' : '#000000';
  const checkClr = isDark ? '#FFFFFF' : '#000000';
  const blurTint = isDark ? 'dark' : 'light';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
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
          <BlurView intensity={isDark ? 60 : 90} tint={blurTint} style={styles.menuBlur}>
            <View style={[styles.menuFill, { backgroundColor: fillBg, borderColor: borderClr }]}>
              <View
                pointerEvents="none"
                style={[
                  styles.menuGlassEdge,
                  { borderTopColor: rimTop, borderLeftColor: rimSide, borderRightColor: rimSide },
                ]}
              />
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
                      !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: dividerClr },
                      pressed && { backgroundColor: pressedBg },
                    ]}
                  >
                    <View style={styles.rowCheck}>
                      {isSelected && (
                        <Check size={15} color={checkClr} strokeWidth={2.5} />
                      )}
                    </View>
                    <Text style={[styles.rowText, { color: textClr }]} numberOfLines={1}>
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
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    elevation: 18,
  },
  menuBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuFill: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
  },
  menuGlassEdge: {
    ...StyleSheet.absoluteFillObject,
    borderTopWidth: 0.75,
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    borderRadius: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 44,
    gap: 10,
  },
  rowCheck: {
    width: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    ...fontFamily.regular,
    fontSize: fontSize[16],
    letterSpacing: -0.1,
    flex: 1,
  },
});
