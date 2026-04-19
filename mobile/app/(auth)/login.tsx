// Onboarding + login entry point. Hosts the LoginOnboardingScreen
// and wires its handlers to the router / auth stubs.

import React, { useCallback } from 'react';
import { Linking } from 'react-native';
import { useRouter } from 'expo-router';

import { LoginOnboardingScreen } from '../../src/features/auth/LoginOnboardingScreen';
import { haptic } from '../../src/lib/haptics';

export default function LoginRoute() {
  const router = useRouter();

  const onPressGoogle = useCallback(() => {
    haptic.medium();
    // TODO: wire Supabase OAuth (Google)
    router.replace('/(tabs)/dashboard');
  }, [router]);

  const onPressApple = useCallback(() => {
    haptic.medium();
    // TODO: wire Supabase OAuth (Apple)
    router.replace('/(tabs)/dashboard');
  }, [router]);

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
