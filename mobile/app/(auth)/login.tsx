// Onboarding + login entry point. Hosts the LoginOnboardingScreen
// and wires the Google / Apple buttons to the auth store. AuthGate
// in the root layout handles the actual redirect once the session
// becomes authenticated.

import React, { useCallback } from 'react';
import { Alert, Linking } from 'react-native';

import { LoginOnboardingScreen } from '../../src/features/auth/LoginOnboardingScreen';
import { useAuthStore } from '../../src/features/auth/useAuthStore';
import { haptic } from '../../src/lib/haptics';
import { useT } from '../../src/lib/i18n/LocaleProvider';

export default function LoginRoute() {
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const signInWithApple = useAuthStore((s) => s.signInWithApple);
  const t = useT();

  const onPressGoogle = useCallback(async () => {
    haptic.medium();
    const res = await signInWithGoogle();
    if (!res.ok && res.error && res.error !== 'cancelled') {
      Alert.alert(t('auth.loginFailed'), res.error);
    }
  }, [signInWithGoogle, t]);

  const onPressApple = useCallback(async () => {
    haptic.medium();
    const res = await signInWithApple();
    if (!res.ok && res.error && res.error !== 'cancelled') {
      Alert.alert(t('auth.loginFailed'), res.error);
    }
  }, [signInWithApple, t]);

  const onPressTerms = useCallback(() => {
    Linking.openURL('https://perezoso.app/terminos').catch(() => {});
  }, []);

  const onPressPrivacy = useCallback(() => {
    Linking.openURL('https://perezoso.app/privacidad').catch(() => {});
  }, []);

  return (
    <LoginOnboardingScreen
      onPressGoogle={onPressGoogle}
      onPressApple={onPressApple}
      onPressTerms={onPressTerms}
      onPressPrivacy={onPressPrivacy}
    />
  );
}
