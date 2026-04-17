import * as Haptics from 'expo-haptics';

const safe = (name: string, fn: () => Promise<void>) => () => {
  console.log('[haptic]', name);
  fn().catch((err) => {
    console.warn('[haptic] FAILED', name, err?.message ?? err);
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
