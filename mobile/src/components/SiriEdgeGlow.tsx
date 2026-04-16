// SiriEdgeGlow — a flowing green/violet halo that traces the four
// edges of the screen while something ambient is happening on top
// (e.g. the "subscription created" celebration card).
//
// Design
// ──────
// Inspired by the iOS 26 Siri activation ring: a continuous ribbon of
// light that wraps the device, with shifting green-violet hues and a
// bright highlight travelling around the perimeter.
//
// Implementation
// ──────────────
// We can't render a real conic gradient in React Native / Expo Go, so
// the effect is faked with four edge strips:
//
//   · Each strip is a thin View clamped to one screen edge.
//   · A static `LinearGradient` underneath paints the base hue —
//     bright at the screen edge, fading toward the centre.
//   · A second `LinearGradient` blends the opposite accent colour so
//     each edge mixes green and violet instead of being flat.
//   · A moving "highlight" band slides along the strip. Its horizontal
//     (or vertical) translate is driven by a shared `phase` value that
//     loops 0 → 1 forever. The four strips read `(phase + side_offset)
//     % 1`, so the highlight appears to travel continuously around the
//     perimeter clockwise.
//
// The whole overlay has `pointerEvents: 'none'` and its opacity is
// driven by the `visible` prop so the caller can fade it in/out in
// sync with whatever ambient moment it decorates.
//
// Expo Go compatible — uses only expo-linear-gradient + reanimated.

import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const EDGE_THICKNESS = 72; // how far the glow bleeds inward
const HIGHLIGHT_SPAN = 0.6; // fraction of the edge length covered by the moving highlight
const CYCLE_MS = 3600;
const FADE_IN_MS = 520;
const FADE_OUT_MS = 420;

// Palette — tuned to feel like "emerald + amethyst under glass" rather
// than raw CSS greens/purples. Values carry alpha baked in so the
// overlay composites softly onto whatever sits behind the modal.
const EDGE_GREEN = 'rgba(34, 197, 94, 0.65)'; // emerald
const EDGE_GREEN_FADE = 'rgba(34, 197, 94, 0)';
const EDGE_VIOLET = 'rgba(168, 85, 247, 0.60)'; // amethyst
const EDGE_VIOLET_FADE = 'rgba(168, 85, 247, 0)';
const HIGHLIGHT_GREEN = 'rgba(110, 231, 183, 0.95)'; // mint
const HIGHLIGHT_VIOLET = 'rgba(216, 180, 254, 0.95)'; // lavender
const HIGHLIGHT_FADE = 'rgba(255, 255, 255, 0)';

type Side = 'top' | 'right' | 'bottom' | 'left';

export function SiriEdgeGlow({ visible }: { visible: boolean }) {
  // Single master phase ticks forever once mounted; each edge derives
  // its own position from `phase + offset`. Keeping one shared value
  // keeps the four highlights perfectly in sync.
  const phase = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Start the loop the first time we're asked to show. It's safe to
    // let it keep ticking even when hidden — the overlay's opacity is
    // the gate, and the UI-thread cost is negligible.
    phase.value = withRepeat(
      withTiming(1, { duration: CYCLE_MS, easing: Easing.linear }),
      -1,
    );
  }, [phase]);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, {
        duration: FADE_IN_MS,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      opacity.value = withTiming(0, {
        duration: FADE_OUT_MS,
        easing: Easing.in(Easing.cubic),
      });
    }
  }, [visible, opacity]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, overlayStyle]}
    >
      <Edge side="top" phase={phase} offset={0} />
      <Edge side="right" phase={phase} offset={0.25} />
      <Edge side="bottom" phase={phase} offset={0.5} />
      <Edge side="left" phase={phase} offset={0.75} />
    </Animated.View>
  );
}

function Edge({
  side,
  phase,
  offset,
}: {
  side: Side;
  phase: SharedValue<number>;
  offset: number;
}) {
  const horizontal = side === 'top' || side === 'bottom';
  const edgeLen = horizontal ? SCREEN_W : SCREEN_H;
  // Highlight band slides across a travel of `edgeLen + span`, so the
  // bright centre enters from off-screen on one side and exits on the
  // other — the edge is never suddenly "empty".
  const highlightWidth = horizontal
    ? edgeLen * HIGHLIGHT_SPAN
    : EDGE_THICKNESS;
  const highlightHeight = horizontal
    ? EDGE_THICKNESS
    : edgeLen * HIGHLIGHT_SPAN;
  // Travel distance: from -span to edgeLen (so the band exits fully).
  const travelStart = horizontal ? -highlightWidth : -highlightHeight;
  const travelEnd = horizontal
    ? edgeLen
    : edgeLen;
  // Bottom and left edges flow in the opposite direction so the
  // highlight reads as a single object orbiting the device clockwise.
  const reverse = side === 'bottom' || side === 'left';

  // Container positioning — fixed to one edge, full length, thick
  // enough that the inward fade has room to breathe.
  const container: ViewStyle = horizontal
    ? {
        position: 'absolute',
        left: 0,
        right: 0,
        height: EDGE_THICKNESS,
        overflow: 'hidden',
        ...(side === 'top' ? { top: 0 } : { bottom: 0 }),
      }
    : {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: EDGE_THICKNESS,
        overflow: 'hidden',
        ...(side === 'left' ? { left: 0 } : { right: 0 }),
      };

  // Base gradient: paints a warm green-into-violet wash across the
  // long axis of the edge, then fades to nothing at the inward side.
  //
  // For top/bottom: gradient runs horizontally for the colour mix, and
  // we rely on a second gradient (below) to do the inward fade.
  const baseGreenStart = horizontal
    ? { x: 0, y: 0.5 }
    : { x: 0.5, y: 0 };
  const baseGreenEnd = horizontal
    ? { x: 1, y: 0.5 }
    : { x: 0.5, y: 1 };

  // Inward fade: transparent at the "inside" side, solid at the edge.
  const inwardFadeStart =
    side === 'top'
      ? { x: 0.5, y: 1 }
      : side === 'bottom'
        ? { x: 0.5, y: 0 }
        : side === 'left'
          ? { x: 1, y: 0.5 }
          : { x: 0, y: 0.5 };
  const inwardFadeEnd =
    side === 'top'
      ? { x: 0.5, y: 0 }
      : side === 'bottom'
        ? { x: 0.5, y: 1 }
        : side === 'left'
          ? { x: 0, y: 0.5 }
          : { x: 1, y: 0.5 };

  const highlightStyle = useAnimatedStyle(() => {
    const p = (phase.value + offset) % 1;
    const t = reverse ? 1 - p : p;
    const pos = interpolate(t, [0, 1], [travelStart, travelEnd]);
    return {
      transform: horizontal
        ? [{ translateX: pos }]
        : [{ translateY: pos }],
    };
  });

  return (
    <View style={container}>
      {/* Base colour wash — green ⇢ violet along the long axis. */}
      <LinearGradient
        colors={[
          EDGE_GREEN_FADE,
          EDGE_GREEN,
          EDGE_VIOLET,
          EDGE_VIOLET_FADE,
        ]}
        locations={[0, 0.3, 0.7, 1]}
        start={baseGreenStart}
        end={baseGreenEnd}
        style={StyleSheet.absoluteFill}
      />
      {/* Inward falloff — bright at the physical edge, empty at the
          interior so the strip reads as a glow rather than a bar. */}
      <LinearGradient
        colors={['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.25)']}
        start={inwardFadeStart}
        end={inwardFadeEnd}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {/* Moving highlight ribbon — the "Siri" signature. */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            width: highlightWidth,
            height: highlightHeight,
          },
          horizontal ? { top: 0 } : { left: 0 },
          highlightStyle,
        ]}
      >
        <LinearGradient
          colors={[
            HIGHLIGHT_FADE,
            HIGHLIGHT_GREEN,
            HIGHLIGHT_VIOLET,
            HIGHLIGHT_FADE,
          ]}
          locations={[0, 0.35, 0.65, 1]}
          start={
            horizontal ? { x: 0, y: 0.5 } : { x: 0.5, y: 0 }
          }
          end={
            horizontal ? { x: 1, y: 0.5 } : { x: 0.5, y: 1 }
          }
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}
