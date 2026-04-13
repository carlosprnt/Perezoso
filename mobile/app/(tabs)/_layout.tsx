import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { FloatingNav } from '../../src/components/FloatingNav';

// Tab layout: native tab bar hidden, FloatingNav overlays at bottom.
// FloatingNav only exposes dashboard + subscriptions (matches web).
// Calendar and settings tabs exist for routing but are accessed
// from other entry points (dashboard calendar button, account menu).

export default function TabLayout() {
  return (
    <View style={styles.root}>
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
      <FloatingNav />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
