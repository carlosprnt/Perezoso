// Onboarding + login entry point. Hosts the LoginOnboardingScreen
// and wires the Google / Apple buttons to the auth store. AuthGate
// in the root layout handles the actual redirect once the session
// becomes authenticated.

import React, { useCallback } from 'react';
import { Alert, Linking } from 'react-native';

import { LoginOnboardingScreen } from '../../src/features/auth/LoginOnboardingScreen';
import { useAuthStore } from '../../src/features/auth/useAuthStore';
import { haptic } from '../../src/lib/haptics';

export default function LoginRoute() {
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const signInWithApple = useAuthStore((s) => s.signInWithApple);

  const onPressGoogle = useCallback(async () => {
    haptic.medium();
    const res = await signInWithGoogle();
    if (!res.ok && res.error && res.error !== 'cancelled') {
      Alert.alert('No se pudo iniciar sesión', res.error);
    }
    // AuthGate handles navigation to /(tabs)/dashboard on success.
  }, [signInWithGoogle]);

  const onPressApple = useCallback(async () => {
    haptic.medium();
    const res = await signInWithApple();
    if (!res.ok && res.error && res.error !== 'cancelled') {
      Alert.alert('No se pudo iniciar sesión con Apple', res.error);
    }
    // AuthGate handles navigation to /(tabs)/dashboard on success.
  }, [signInWithApple]);

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
