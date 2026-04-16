// SubscriptionDetailSheet — globally mounted native iOS pageSheet.
//
// Mounted once in app/_layout.tsx. Driven by useSubscriptionDetailStore:
//   openDetail(sub) → shows view mode
//   enterEdit()     → transitions to edit mode (store-driven)
//   close()         → dismisses
//
// The sheet itself is a native iOS pageSheet (UISheetPresentationController)
// which gives us: correct safe-area insets, dimmed backdrop, handle bar,
// and the pan-down-to-dismiss gesture — no custom animation code needed.
//
// Mode transition (view ↔ edit) renders into the same Modal without
// closing it, so the sheet chrome stays in place and only the inner
// content cross-fades. The handle indicator auto-hides in edit mode
// because a keyboard-avoiding layout fills the sheet.

import React, { useCallback } from 'react';
import { Modal } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  useSubscriptionDetailStore,
} from './useSubscriptionDetailStore';
import { SubscriptionDetailView } from './SubscriptionDetailView';
import { SubscriptionEditView } from './SubscriptionEditView';
import { Toast } from '../../components/Toast';
import { useToastStore } from '../../components/useToastStore';
import type { Subscription } from '../subscriptions/types';

const FADE_MS = 160;

export function SubscriptionDetailSheet() {
  const isOpen       = useSubscriptionDetailStore((s) => s.isOpen);
  const mode         = useSubscriptionDetailStore((s) => s.mode);
  const sub          = useSubscriptionDetailStore((s) => s.subscription);
  const close        = useSubscriptionDetailStore((s) => s.close);
  const enterEdit    = useSubscriptionDetailStore((s) => s.enterEdit);
  const exitEdit     = useSubscriptionDetailStore((s) => s.exitEdit);
  const updateSub    = useSubscriptionDetailStore((s) => s.updateSubscription);
  const deleteSub    = useSubscriptionDetailStore((s) => s.deleteSubscription);

  // Synced via onDismiss: if the user swipes the sheet down while we're
  // in view mode the store has to be told the sheet closed.
  const handleNativeDismiss = useCallback(() => {
    if (isOpen) close();
  }, [isOpen, close]);

  // Animated cross-fade between view and edit modes.
  // The opacity drives a lightweight fade without re-mounting the Modal.
  const viewOpacity = useSharedValue(1);
  const editOpacity = useSharedValue(0);

  const prevMode = React.useRef(mode);
  if (prevMode.current !== mode) {
    if (mode === 'edit') {
      viewOpacity.value = withTiming(0, { duration: FADE_MS });
      editOpacity.value = withTiming(1, { duration: FADE_MS });
    } else {
      editOpacity.value = withTiming(0, { duration: FADE_MS });
      viewOpacity.value = withTiming(1, { duration: FADE_MS });
    }
    prevMode.current = mode;
  }

  const viewStyle  = useAnimatedStyle(() => ({ opacity: viewOpacity.value }));
  const editStyle  = useAnimatedStyle(() => ({ opacity: editOpacity.value }));

  const handleSave = useCallback((updated: Subscription) => {
    updateSub(updated);
    exitEdit();
    // Green iOS-style banner confirming the save. Fired here instead
    // of inside the edit view so the toast survives any re-render the
    // mode transition triggers. Rendered both at the app root and
    // inside the pageSheet Modal below — the native iOS sheet covers
    // the root instance, so we need an in-sheet Toast to be visible.
    useToastStore.getState().show('success', 'Suscripción actualizada');
  }, [updateSub, exitEdit]);

  const handleDelete = useCallback(() => {
    deleteSub();
  }, [deleteSub]);

  if (!sub) return null;

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={mode === 'edit' ? exitEdit : close}
      onDismiss={handleNativeDismiss}
    >
      {/* View mode — always mounted, fades out in edit mode */}
      <Animated.View style={[{ position: 'absolute', inset: 0 }, viewStyle]}
        pointerEvents={mode === 'view' ? 'auto' : 'none'}
      >
        <SubscriptionDetailView
          sub={sub}
          onClose={close}
          onEdit={enterEdit}
        />
      </Animated.View>

      {/* Edit mode — fades in when entering edit */}
      <Animated.View style={[{ position: 'absolute', inset: 0 }, editStyle]}
        pointerEvents={mode === 'edit' ? 'auto' : 'none'}
      >
        <SubscriptionEditView
          sub={sub}
          onSave={handleSave}
          onCancel={exitEdit}
          onDelete={handleDelete}
        />
      </Animated.View>

      {/* In-sheet Toast instance — the native iOS pageSheet sits above
          the root layout, so the root-level <Toast /> would be hidden
          while the sheet is open. Both instances share the same Zustand
          store, so firing once animates both; only the top-most visible
          one is actually seen by the user. */}
      <Toast />
    </Modal>
  );
}
