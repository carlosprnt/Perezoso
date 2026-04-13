import { Tabs } from 'expo-router';

// Tab layout: renders FloatingNav instead of default tab bar.
// FloatingNav will be implemented in Phase 6.
// For now, use hidden native tabs so routing works.
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="subscriptions" />
      <Tabs.Screen name="calendar" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
