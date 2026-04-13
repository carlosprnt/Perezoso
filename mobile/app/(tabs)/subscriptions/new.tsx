// Phase 9 — Create subscription screen
import { View, Text, StyleSheet } from 'react-native';

export default function NewSubscriptionScreen() {
  return (
    <View style={styles.container}>
      <Text>Nueva suscripcion</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
