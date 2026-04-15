import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { Pressable, Text, View } from 'react-native';
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
import { useCreateSubscriptionStore } from '../src/features/add-subscription/useCreateSubscriptionStore';

SplashScreen.preventAutoHideAsync();

// ─── Live debug indicator ─────────────────────────────────────────
// Shows current isOpen state of the white form sheet in a pill on top
// of every screen. Proves whether Metro is serving fresh code AND
// whether the store is updating when buttons are tapped.
function DebugIndicator() {
  const isOpen = useCreateSubscriptionStore((s) => s.isOpen);
  return (
    <View
      style={{
        position: 'absolute',
        top: 55,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 999999,
        elevation: 999999,
      }}
      pointerEvents="box-none"
    >
      <View
        style={{
          flexDirection: 'row',
          gap: 8,
          alignItems: 'center',
          backgroundColor: isOpen ? '#22C55E' : '#EF4444',
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 9999,
          borderWidth: 3,
          borderColor: '#FFFF00',
        }}
      >
        <Text style={{ color: 'white', fontWeight: '800', fontSize: 13 }}>
          isOpen={String(isOpen)}
        </Text>
        <Pressable
          onPress={() => {
            console.log('[DEBUG] test button tapped');
            useCreateSubscriptionStore
              .getState()
              .open({ name: 'DEBUG TEST' });
          }}
          style={{
            backgroundColor: 'white',
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 9999,
          }}
        >
          <Text style={{ color: 'black', fontWeight: '800', fontSize: 12 }}>
            TAP TO OPEN
          </Text>
        </Pressable>
      </View>
    </View>
  );
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

  console.log('[RootLayout] render v3-absolute-pos-no-modal');

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Slot />
        <CreateSubscriptionSheet />
        <DebugIndicator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
