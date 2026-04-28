// CurrencySheet — premium iOS-style half-sheet currency picker.
//
// Features:
//   - Sticky search at the top filters by code and name
//   - "Más usadas" section (hidden while searching)
//   - Full alphabetical list below
//   - Row: code (medium) + name (muted) on left, symbol + checkmark on right
//   - Tap a row → haptic + set + close
//   - Reusable selection pattern — same shape can drive language, timezone…

import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Check, Search } from 'lucide-react-native';

import { HalfSheet } from '../../components/HalfSheet';
import { fontFamily, fontSize } from '../../design/typography';
import { useTheme } from '../../design/useTheme';
import { haptic } from '../../lib/haptics';
import { usePreferencesStore } from './useSettingsStore';
import { useT } from '../../lib/i18n/LocaleProvider';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** When provided, drives selection state externally (by currency code). */
  selectedCode?: string;
  /** When provided, called on selection instead of updating the store. */
  onSelectCurrency?: (currency: Currency) => void;
}

export interface Currency {
  code: string;  // EUR, USD…
  name: string;  // Euro, US Dollar…
  symbol: string; // €, $, £…
  /** Stored label — matches the legacy "€ EUR" format expected by the rest of the app. */
  label: string;
}

const MOST_USED_CODES = ['EUR', 'USD', 'GBP', 'JPY', 'CAD'];

const ALL_CURRENCIES: Currency[] = [
  { code: 'ARS', name: 'Argentine Peso', symbol: '$',   label: '$ ARS' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', label: 'A$ AUD' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', label: 'R$ BRL' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', label: 'C$ CAD' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr', label: 'Fr CHF' },
  { code: 'CLP', name: 'Chilean Peso', symbol: '$', label: '$ CLP' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', label: '¥ CNY' },
  { code: 'COP', name: 'Colombian Peso', symbol: '$', label: '$ COP' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', label: 'Kč CZK' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', label: 'kr DKK' },
  { code: 'EUR', name: 'Euro', symbol: '€', label: '€ EUR' },
  { code: 'GBP', name: 'British Pound', symbol: '£', label: '£ GBP' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', label: 'HK$ HKD' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', label: 'Ft HUF' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', label: 'Rp IDR' },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪', label: '₪ ILS' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', label: '₹ INR' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', label: '¥ JPY' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', label: '₩ KRW' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', label: '$ MXN' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', label: 'kr NOK' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', label: 'NZ$ NZD' },
  { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/.', label: 'S/. PEN' },
  { code: 'PLN', name: 'Polish Złoty', symbol: 'zł', label: 'zł PLN' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', label: '₽ RUB' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', label: 'kr SEK' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', label: 'S$ SGD' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', label: '฿ THB' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', label: '₺ TRY' },
  { code: 'TWD', name: 'Taiwan Dollar', symbol: 'NT$', label: 'NT$ TWD' },
  { code: 'USD', name: 'US Dollar', symbol: '$', label: '$ USD' },
  { code: 'UYU', name: 'Uruguayan Peso', symbol: '$U', label: '$U UYU' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', label: 'R ZAR' },
];

export { ALL_CURRENCIES };

const BY_CODE = new Map(ALL_CURRENCIES.map((c) => [c.code, c]));

export function currencySymbol(code: string): string {
  return BY_CODE.get(code)?.symbol ?? code;
}

const MOST_USED: Currency[] = MOST_USED_CODES
  .map((code) => BY_CODE.get(code))
  .filter((c): c is Currency => !!c);

function matches(c: Currency, q: string) {
  if (!q) return true;
  const needle = q.toLowerCase().trim();
  return (
    c.code.toLowerCase().includes(needle) ||
    c.name.toLowerCase().includes(needle)
  );
}

export function CurrencySheet({ visible, onClose, selectedCode, onSelectCurrency }: Props) {
  const t = useT();
  const { isDark } = useTheme();
  const storeCurrency = usePreferencesStore((s) => s.currency);
  const setCurrency = usePreferencesStore((s) => s.setCurrency);

  const [query, setQuery] = useState('');

  // Pending selection — tracks what the user has tapped but not yet
  // saved. `null` means nothing has been tapped this session.
  const [pending, setPending] = useState<Currency | null>(null);

  // Reset pending selection whenever the sheet opens.
  React.useEffect(() => {
    if (visible) setPending(null);
  }, [visible]);

  const filtered = useMemo(
    () => ALL_CURRENCIES.filter((c) => matches(c, query)),
    [query],
  );
  const showMostUsed = query.trim().length === 0;

  const isSelected = (c: Currency) => {
    // External selection (edit forms) — driven by selectedCode prop.
    if (selectedCode !== undefined) {
      if (pending) return c.code === pending.code;
      return c.code === selectedCode;
    }
    // Global settings — compare against pending or store value.
    if (pending) return c.code === pending.code;
    return storeCurrency === c.label;
  };

  const handleSelect = (c: Currency) => {
    haptic.selection();
    setPending(c);
  };

  const handleSave = () => {
    const chosen = pending;
    if (!chosen) {
      // Nothing changed — just close.
      setQuery('');
      onClose();
      return;
    }
    haptic.selection();
    if (onSelectCurrency) {
      onSelectCurrency(chosen);
    } else {
      setCurrency(chosen.label);
    }
    setQuery('');
    onClose();
  };

  const bg = isDark ? '#1C1C1E' : '#FFFFFF';
  const inputBg = isDark ? '#2C2C2E' : '#F0F0F2';
  const inputText = isDark ? '#FFFFFF' : '#000000';
  const placeholderColor = isDark ? '#8E8E93' : '#8E8E93';
  const iconMuted = isDark ? '#8E8E93' : '#8E8E93';
  const sectionHeaderColor = isDark ? '#8E8E93' : '#6B6B6B';
  const codeColor = isDark ? '#FFFFFF' : '#000000';
  const nameColor = isDark ? '#8E8E93' : '#6B6B6B';
  const symbolColor = isDark ? '#AEAEB2' : '#3C3C43';
  const dividerColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const checkColor = '#30D158';

  const handleClose = () => {
    setQuery('');
    onClose();
  };

  return (
    <HalfSheet
      isOpen={visible}
      onClose={handleClose}
      title={t('currency.title')}
      subtitle={t('currency.subtitle')}
      heightFraction={0.72}
    >
      {/* Sticky search */}
      <View style={[styles.searchWrap, { backgroundColor: bg }]}>
        <View style={[styles.searchBox, { backgroundColor: inputBg }]}>
          <Search size={16} color={iconMuted} strokeWidth={2} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('currency.search')}
            placeholderTextColor={placeholderColor}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
            style={[styles.searchInput, { color: inputText }]}
          />
        </View>
      </View>

      {/* List */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {showMostUsed && (
          <>
            <Text style={[styles.sectionHeader, { color: sectionHeaderColor }]}>
              Más usadas
            </Text>
            {MOST_USED.map((c, idx) => (
              <Row
                key={`mu-${c.code}`}
                currency={c}
                selected={isSelected(c)}
                onPress={() => handleSelect(c)}
                isLast={idx === MOST_USED.length - 1}
                codeColor={codeColor}
                nameColor={nameColor}
                symbolColor={symbolColor}
                dividerColor={dividerColor}
                checkColor={checkColor}
              />
            ))}
            <Text style={[styles.sectionHeader, { color: sectionHeaderColor, marginTop: 18 }]}>
              Todas
            </Text>
          </>
        )}

        {filtered.length === 0 ? (
          <Text style={[styles.emptyState, { color: sectionHeaderColor }]}>
            Sin resultados
          </Text>
        ) : (
          filtered.map((c, idx) => (
            <Row
              key={c.code}
              currency={c}
              selected={isSelected(c)}
              onPress={() => handleSelect(c)}
              isLast={idx === filtered.length - 1}
              codeColor={codeColor}
              nameColor={nameColor}
              symbolColor={symbolColor}
              dividerColor={dividerColor}
              checkColor={checkColor}
            />
          ))
        )}
      </ScrollView>

      {/* Save button */}
      <View style={[styles.saveWrap, { borderTopColor: dividerColor }]}>
        <Pressable
          onPress={handleSave}
          style={({ pressed }) => [
            styles.saveBtn,
            { backgroundColor: pending ? '#000000' : isDark ? '#3A3A3C' : '#E5E5EA' },
            pressed && { opacity: 0.85 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('common.save')}
        >
          <Text
            style={[
              styles.saveBtnText,
              { color: pending ? '#FFFFFF' : isDark ? '#8E8E93' : '#8E8E93' },
            ]}
          >
            Guardar
          </Text>
        </Pressable>
      </View>
    </HalfSheet>
  );
}

function Row({
  currency,
  selected,
  onPress,
  isLast,
  codeColor,
  nameColor,
  symbolColor,
  dividerColor,
  checkColor,
}: {
  currency: Currency;
  selected: boolean;
  onPress: () => void;
  isLast: boolean;
  codeColor: string;
  nameColor: string;
  symbolColor: string;
  dividerColor: string;
  checkColor: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !isLast && { borderBottomColor: dividerColor, borderBottomWidth: StyleSheet.hairlineWidth },
        pressed && { opacity: 0.55 },
      ]}
      accessibilityLabel={`${currency.code} ${currency.name}`}
    >
      <View style={styles.rowLeft}>
        <Text style={[styles.rowCode, { color: codeColor }]}>{currency.code}</Text>
        <Text style={[styles.rowName, { color: nameColor }]} numberOfLines={1}>
          {currency.name}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.rowSymbol, { color: symbolColor }]}>{currency.symbol}</Text>
        {selected ? (
          <Check size={18} color={checkColor} strokeWidth={2.6} />
        ) : (
          <View style={styles.checkPlaceholder} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 10,
  },
  searchInput: {
    flex: 1,
    ...fontFamily.regular,
    fontSize: fontSize[15],
    letterSpacing: -0.1,
    paddingVertical: 0,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 24,
  },
  sectionHeader: {
    ...fontFamily.medium,
    fontSize: fontSize[11],
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  emptyState: {
    ...fontFamily.regular,
    fontSize: fontSize[14],
    paddingVertical: 16,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    gap: 12,
  },
  rowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    minWidth: 0,
  },
  rowCode: {
    ...fontFamily.medium,
    fontSize: fontSize[16],
    letterSpacing: -0.1,
    width: 48,
  },
  rowName: {
    ...fontFamily.regular,
    fontSize: fontSize[14],
    letterSpacing: -0.1,
    flex: 1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowSymbol: {
    ...fontFamily.medium,
    fontSize: fontSize[15],
    letterSpacing: -0.1,
    minWidth: 24,
    textAlign: 'right',
  },
  checkPlaceholder: {
    width: 18,
    height: 18,
  },
  saveWrap: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveBtn: {
    height: 52,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    ...fontFamily.medium,
    fontSize: fontSize[16],
    letterSpacing: -0.2,
  },
});
