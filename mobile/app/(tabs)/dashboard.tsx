// Phase 8 — Dashboard screen composition
import { View, Text, StyleSheet } from 'react-native';
import { light } from '../../src/design/colors';

export default function DashboardScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Dashboard</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: light.background,
  },
  text: {
    fontSize: 17,
    fontFamily: 'Nunito_700Bold',
    color: light.textPrimary,
  },
});
