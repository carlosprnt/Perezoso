// useTilt — exposes two Reanimated SharedValues that track the
// device's tilt, normalised to [-1, 1].
//
//   tiltX ← rotation.gamma  (left/right tilt)
//   tiltY ← rotation.beta   (front/back tilt)
//
// Wraps `expo-sensors` DeviceMotion at ~30 Hz with a low-pass filter
// (lerp 0.1) to kill jitter. SharedValues stay at 0 when the sensor is
// unavailable (Expo Go, simulator, devices without a gyro), so the
// consuming card simply renders its static appearance.

import { useEffect } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import { DeviceMotion } from 'expo-sensors';

const QUARTER_PI = Math.PI / 4;
const SMOOTHING = 0.1;
const UPDATE_INTERVAL_MS = 33;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export interface UseTiltResult {
  tiltX: SharedValue<number>;
  tiltY: SharedValue<number>;
}

export function useTilt(opts?: { enabled?: boolean }): UseTiltResult {
  const enabled = opts?.enabled !== false;
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let subscription: { remove: () => void } | null = null;

    (async () => {
      try {
        const available = await DeviceMotion.isAvailableAsync();
        if (!available || cancelled) return;
        DeviceMotion.setUpdateInterval(UPDATE_INTERVAL_MS);
        subscription = DeviceMotion.addListener(({ rotation }) => {
          if (!rotation) return;
          const targetX = clamp(rotation.gamma / QUARTER_PI, -1, 1);
          const targetY = clamp(rotation.beta / QUARTER_PI, -1, 1);
          tiltX.value = lerp(tiltX.value, targetX, SMOOTHING);
          tiltY.value = lerp(tiltY.value, targetY, SMOOTHING);
        });
      } catch {
        // No-op: sensor unavailable, shared values stay at 0.
      }
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [enabled, tiltX, tiltY]);

  return { tiltX, tiltY };
}
