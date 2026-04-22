// Stylized phone frame used as a backdrop for the hero mockups on
// slides 2–5. Intentionally minimal: rounded bezel + status bar row.
// The web reference shows an actual iPhone silhouette; we replicate
// the rounded top corners + notch pill so the content reads as a
// phone mockup without dragging in heavy bezel artwork.

import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

import { fontFamily } from '../../../design/typography';
import { shadows } from '../../../design/shadows';

const { width: SCREEN_W } = Dimensions.get('window');

const FRAME_MARGIN_X = 32;
const FRAME_WIDTH = SCREEN_W - FRAME_MARGIN_X * 2;

interface Props {
  time?: string;
  children: React.ReactNode;
}

export function PhoneFrame({ time = '16:36', children }: Props) {
  return (
    <View style={styles.outer}>
      <View style={styles.frame}>
        {/* Status bar — clock left, notch pill centered */}
        <View style={styles.statusBar}>
          <Text style={styles.clock}>{time}</Text>
          <View style={styles.notch} />
          <View style={styles.statusRight} />
        </View>

        <View style={styles.content}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: FRAME_WIDTH,
    alignSelf: 'center',
    flex: 1,
  },
  frame: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    paddingHorizontal: 10,
    paddingBottom: 16,
    overflow: 'hidden',
    ...shadows.cardMd,
  },
  statusBar: {
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    flexShrink: 0,
  },
  clock: {
    ...fontFamily.semibold,
    fontSize: 11,
    color: '#0F172A',
  },
  notch: {
    width: 74,
    height: 22,
    borderRadius: 999,
    backgroundColor: '#0A0A0A',
  },
  statusRight: {
    width: 40,
    height: 12,
    opacity: 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 6,
    overflow: 'hidden',
  },
});
