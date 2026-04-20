// Root redirect — sends the user to the right group based on auth state.
// While the session is still loading (reading AsyncStorage), render
// nothing so we don't flash the dashboard before bouncing to /login.

import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { useAuthStore } from '../src/features/auth/useAuthStore';

export default function Index() {
  const status = useAuthStore((s) => s.status);

  if (status === 'loading') {
    return <View style={{ flex: 1, backgroundColor: '#0A0A0A' }} />;
  }

  return status === 'authenticated' ? (
    <Redirect href="/(tabs)/dashboard" />
  ) : (
    <Redirect href="/login" />
  );
}
