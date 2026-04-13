// Phase 8 — Dashboard screen composition
import { View, Text, StyleSheet } from 'react-native';
import { palette } from '../../src/design/colors';

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
    backgroundColor: palette.background.light,
  },
  text: {
    fontSize: 17,
    fontFamily: 'Nunito_700Bold',
    color: palette.textPrimary.light,
  },
});
