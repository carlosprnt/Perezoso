import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    // Nunito — Android fallback (rounded-looking Google font)
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
    // SF Pro Rounded — iOS primary.
    // OTF files live under assets/fonts/ (sourced from Apple's SF-Pro.dmg).
    // Each weight gets its own PostScript name registration so the
    // typography tokens can reference them by name.
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Slot />
      {/* Mounted at the root so the form sheet is always in the tree,
          independent of the active tab / route. The native Modal
          renders above every other view regardless. */}
      <CreateSubscriptionSheet />
    </GestureHandlerRootView>
  );
}
