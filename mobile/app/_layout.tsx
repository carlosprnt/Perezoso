import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
} from '@expo-google-fonts/nunito';
import { CreateSubscriptionSheet } from '../src/features/add-subscription/CreateSubscriptionSheet';
import { Toast } from '../src/components/Toast';
import { SubscriptionCreatedCelebration } from '../src/features/add-subscription/SubscriptionCreatedCelebration';
import { SubscriptionDetailSheet } from '../src/features/subscription-detail/SubscriptionDetailSheet';
import { SettingsSheet } from '../src/features/settings/SettingsSheet';
import { SavingsSuggestionsListSheet } from '../src/features/savings-suggestions/SavingsSuggestionsListSheet';
import { useAuthStore } from '../src/features/auth/useAuthStore';

SplashScreen.preventAutoHideAsync();

// Route guard — redirects between the (auth) and (tabs) groups based on
// supabase session. Kept as a child component so it has access to the
// expo-router context (useSegments/useRouter only work inside the Stack).
function AuthGate() {
  const status = useAuthStore((s) => s.status);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    const inAuthGroup = segments[0] === '(auth)';

    if (status === 'unauthenticated' && !inAuthGroup) {
      router.replace('/login');
    } else if (status === 'authenticated' && inAuthGroup) {
      router.replace('/(tabs)/dashboard');
    }
  }, [status, segments, router]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
    'SFProRounded-Regular':  require('../assets/fonts/SF-Pro-Rounded-Regular.otf'),
    'SFProRounded-Medium':   require('../assets/fonts/SF-Pro-Rounded-Medium.otf'),
    'SFProRounded-Semibold': require('../assets/fonts/SF-Pro-Rounded-Semibold.otf'),
    'SFProRounded-Bold':     require('../assets/fonts/SF-Pro-Rounded-Bold.otf'),
    'SFProRounded-Heavy':    require('../assets/fonts/SF-Pro-Rounded-Heavy.otf'),
    'SFProRounded-Black':    require('../assets/fonts/SF-Pro-Rounded-Black.otf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  // Version marker so we can tell from Metro logs which build is running.
  console.log('[RootLayout] render v5-native-modal');

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        {/* Root Stack: exposes the (tabs) and (auth) groups as sibling
            screens so `router.replace('/login')` can switch between
            them. `<Slot />` works for passive rendering but doesn't
            support imperative cross-group navigation from handlers. */}
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="index" />
        </Stack>
        <AuthGate />
        <CreateSubscriptionSheet />
        <SubscriptionDetailSheet />
        <SettingsSheet />
        <SavingsSuggestionsListSheet />
        {/* SavingsSuggestionDetailSheet is nested inside the list sheet
            so iOS can cleanly layer it on top — see that file. */}
        <Toast />
        <SubscriptionCreatedCelebration />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
