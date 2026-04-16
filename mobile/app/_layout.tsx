import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Slot } from 'expo-router';
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

SplashScreen.preventAutoHideAsync();

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
        <Slot />
        <CreateSubscriptionSheet />
        <SubscriptionDetailSheet />
        <Toast />
        <SubscriptionCreatedCelebration />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
