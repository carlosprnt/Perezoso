// CurrencySheet — half-height modal for selecting the default currency.

import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Check } from 'lucide-react-native';

import { fontFamily, fontSize } from '../../design/typography';
import { useTheme } from '../../design/useTheme';
import { usePreferencesStore } from './useSettingsStore';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const CURRENCIES = [
  { label: '€ EUR', symbol: '€' },
  { label: '$ USD', symbol: '$' },
  { label: '£ GBP', symbol: '£' },
  { label: '¥ JPY', symbol: '¥' },
  { label: 'Fr CHF', symbol: 'Fr' },
  { label: '$ MXN', symbol: '$' },
  { label: '$ ARS', symbol: '$' },
  { label: '$ COP', symbol: '$' },
  { label: 'R$ BRL', symbol: 'R$' },
  { label: '$ CLP', symbol: '$' },
];

export function CurrencySheet({ visible, onClose }: Props) {
  const { isDark } = useTheme();
  const currency = usePreferencesStore((s) => s.currency);
  const setCurrency = usePreferencesStore((s) => s.setCurrency);

  const bg = isDark ? '#1C1C1E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const mutedColor = isDark ? '#8E8E93' : '#8E8E93';
  const rowBorder = isDark ? '#38383A' : '#F0F0F0';
  const handleColor = isDark ? '#636366' : '#D4D4D4';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onDismiss={onClose}
    >
      <View style={[styles.container, { backgroundColor: bg }]}>
        <View style={styles.handleWrap}>
          <View style={[styles.handle, { backgroundColor: handleColor }]} />
        </View>
        <View style={styles.header}>
          <Text style={[styles.title, { color: textColor }]}>Moneda</Text>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={({ pressed }) => pressed && { opacity: 0.6 }}
          >
            <Text style={[styles.doneBtn, { color: mutedColor }]}>Listo</Text>
          </Pressable>
        </View>
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {CURRENCIES.map((c) => {
            const selected = currency === c.label;
            return (
              <Pressable
                key={c.label}
                style={({ pressed }) => [
                  styles.row,
                  { borderBottomColor: rowBorder },
                  pressed && { opacity: 0.6 },
                ]}
                onPress={() => { setCurrency(c.label); onClose(); }}
              >
                <Text style={[styles.currencyLabel, { color: textColor }]}>
                  {c.label}
                </Text>
                {selected && <Check size={18} color="#34C759" strokeWidth={2.5} />}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 6,
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 9999,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  title: {
    ...fontFamily.bold,
    fontSize: fontSize[24],
    letterSpacing: -0.4,
  },
  doneBtn: {
    ...fontFamily.semibold,
    fontSize: fontSize[16],
  },
  list: {
    flex: 1,
    paddingHorizontal: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  currencyLabel: {
    ...fontFamily.medium,
    fontSize: fontSize[16],
    letterSpacing: -0.2,
  },
});
