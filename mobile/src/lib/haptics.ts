import * as Haptics from 'expo-haptics';
import { Alert, Platform } from 'react-native';

// Visible diagnostic: if any haptic call rejects, surface the error via
// Alert so it's visible on device without Metro/terminal. Also shows a
// one-shot Alert on the very first successful call, to confirm that the
// path is wired and the module is available at runtime.

let shownFirstSuccess = false;
const notifyOnce = (msg: string) => {
  if (shownFirstSuccess) return;
  shownFirstSuccess = true;
  Alert.alert('Haptics', msg);
};

const errors = new Set<string>();
const notifyError = (name: string, err: unknown) => {
  const key = `${name}:${String((err as any)?.message ?? err)}`;
  if (errors.has(key)) return;
  errors.add(key);
  Alert.alert(
    `Haptics FAIL (${name})`,
    String((err as any)?.message ?? err) + `\nPlatform: ${Platform.OS}`,
  );
};

const safe = (name: string, fn: () => Promise<void>) => () => {
  console.log('[haptic]', name);
  fn()
    .then(() => notifyOnce(`OK: ${name} on ${Platform.OS}`))
    .catch((err) => {
      console.warn('[haptic] FAILED', name, err?.message ?? err);
      notifyError(name, err);
    });
};

export const haptic = {
  light: safe('light', () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: safe('medium', () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  heavy: safe('heavy', () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  selection: safe('selection', () => Haptics.selectionAsync()),
  success: safe('success', () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: safe('warning', () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: safe('error', () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
