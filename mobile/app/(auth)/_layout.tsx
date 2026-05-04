import { Stack } from 'expo-router';

// Auth layout: no navigation chrome, isolated from tabs
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
