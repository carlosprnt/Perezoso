// Phase 9 — Settings screen
import { View, Text, StyleSheet } from 'react-native';
import { useT } from '../../src/lib/i18n/LocaleProvider';

export default function SettingsScreen() {
  const t = useT();
  return (
    <View style={styles.container}>
      <Text>{t('settings.title')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
