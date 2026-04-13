// Phase 9 — Login screen with carousel + floating logos + OAuth
import { View, Text, StyleSheet } from 'react-native';
import { light } from '../../src/design/colors';

export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Perezoso</Text>
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
    fontSize: 32,
    fontFamily: 'Nunito_900Black',
    color: light.textPrimary,
  },
});
