// Phase 6 — Subscription list (first critical screen)
import { View, Text, StyleSheet } from 'react-native';
import { palette } from '../../../src/design/colors';

export default function SubscriptionsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Mis suscripciones</Text>
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
