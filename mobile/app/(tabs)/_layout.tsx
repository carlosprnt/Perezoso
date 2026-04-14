import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { FloatingNav } from '../../src/components/FloatingNav';
import { useTheme } from '../../src/design/useTheme';

// Tab layout: native tab bar hidden, FloatingNav overlays at bottom.
// FloatingNav only exposes dashboard + subscriptions (matches web).
// Calendar and settings tabs exist for routing but are accessed
// from other entry points (dashboard calendar button, account menu).
//
// The root View owns the theme background color; `sceneStyle` on
// the Tabs is transparent so no white scene layer leaks through
// between the theme bg and screen content. Each screen can then
// render its own content transparent on top of the shared bg.

export default function TabLayout() {
  const { colors } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
          sceneStyle: { backgroundColor: 'transparent' },
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
