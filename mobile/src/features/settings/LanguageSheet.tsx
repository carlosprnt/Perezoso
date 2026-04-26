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
import { radius } from '../../design/radius';
import { useTheme } from '../../design/useTheme';
import { haptic } from '../../lib/haptics';
import { useLanguageStore } from '../../lib/i18n/useLanguageStore';
import { useT } from '../../lib/i18n/LocaleProvider';

export interface Language {
  code: string;
  name: string;
  nativeName: string;
}

const ALL_LANGUAGES: Language[] = [
  { code: 'auto', name: '',           nativeName: '' },
  { code: 'es',   name: 'Spanish',    nativeName: 'Español' },
  { code: 'en',   name: 'English',    nativeName: 'English' },
  { code: 'fr',   name: 'French',     nativeName: 'Français' },
  { code: 'de',   name: 'German',     nativeName: 'Deutsch' },
  { code: 'pt',   name: 'Portuguese', nativeName: 'Português' },
  { code: 'it',   name: 'Italian',    nativeName: 'Italiano' },
  { code: 'nl',   name: 'Dutch',      nativeName: 'Nederlands' },
  { code: 'pl',   name: 'Polish',     nativeName: 'Polski' },
  { code: 'tr',   name: 'Turkish',    nativeName: 'Türkçe' },
  { code: 'ru',   name: 'Russian',    nativeName: 'Русский' },
  { code: 'ar',   name: 'Arabic',     nativeName: 'العربية' },
  { code: 'hi',   name: 'Hindi',      nativeName: 'हिन्दी' },
  { code: 'ja',   name: 'Japanese',   nativeName: '日本語' },
  { code: 'zh',   name: 'Chinese',    nativeName: '中文' },
  { code: 'ko',   name: 'Korean',     nativeName: '한국어' },
];

function matches(lang: Language, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase().trim();
  return (
    lang.code.toLowerCase().includes(needle) ||
    lang.name.toLowerCase().includes(needle) ||
    lang.nativeName.toLowerCase().includes(needle)
  );
}

export function languageLabel(code: string): string {
  if (code === 'auto') return '';
  const lang = ALL_LANGUAGES.find((l) => l.code === code);
  return lang?.nativeName ?? code;
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function LanguageSheet({ visible, onClose }: Props) {
  const { isDark } = useTheme();
  const t = useT();
  const currentLang = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(currentLang);

  const languageList = ALL_LANGUAGES.slice(1);

  const filtered = useMemo(
    () => languageList.filter((l) => matches(l, query)),
    [query],
  );
  const showAuto = query.trim().length === 0;

  const handleTap = (code: string) => {
    haptic.selection();
    setSelected(code);
  };

  const handleSave = () => {
    haptic.success();
    setLanguage(selected);
    setQuery('');
    onClose();
  };

  const handleClose = () => {
    setSelected(currentLang);
    setQuery('');
    onClose();
  };

  const hasChanges = selected !== currentLang;

  const bg = isDark ? '#1C1C1E' : '#FFFFFF';
  const inputBg = isDark ? '#2C2C2E' : '#F0F0F2';
  const inputText = isDark ? '#FFFFFF' : '#000000';
  const placeholderColor = '#8E8E93';
  const iconMuted = '#8E8E93';
  const sectionHeaderColor = isDark ? '#8E8E93' : '#6B6B6B';
  const primaryColor = isDark ? '#FFFFFF' : '#000000';
  const secondaryColor = isDark ? '#8E8E93' : '#6B6B6B';
  const dividerColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const checkColor = '#30D158';

  return (
    <HalfSheet
      isOpen={visible}
      onClose={handleClose}
      title={t('language.title')}
      subtitle={t('language.subtitle')}
      heightFraction={0.72}
    >
      <View style={[styles.searchWrap, { backgroundColor: bg }]}>
        <View style={[styles.searchBox, { backgroundColor: inputBg }]}>
          <Search size={16} color={iconMuted} strokeWidth={2} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('language.search')}
            placeholderTextColor={placeholderColor}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
            style={[styles.searchInput, { color: inputText }]}
          />
        </View>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {showAuto && (
          <Pressable
            onPress={() => handleTap('auto')}
            style={({ pressed }) => [
              styles.row,
              { borderBottomColor: dividerColor, borderBottomWidth: StyleSheet.hairlineWidth },
              pressed && { opacity: 0.55 },
            ]}
          >
            <View style={styles.rowLeft}>
              <Text style={[styles.rowNative, { color: primaryColor }]}>
                {t('language.auto')}
              </Text>
            </View>
            <View style={styles.rowRight}>
              {selected === 'auto' ? (
                <Check size={18} color={checkColor} strokeWidth={2.6} />
              ) : (
                <View style={styles.checkPlaceholder} />
              )}
            </View>
          </Pressable>
        )}

        {showAuto && (
          <Text style={[styles.sectionHeader, { color: sectionHeaderColor, marginTop: 14 }]}>
            {t('currency.all')}
          </Text>
        )}

        {filtered.length === 0 ? (
          <Text style={[styles.emptyState, { color: sectionHeaderColor }]}>
            {t('language.noResults')}
          </Text>
        ) : (
          filtered.map((lang, idx) => (
            <Pressable
              key={lang.code}
              onPress={() => handleTap(lang.code)}
              style={({ pressed }) => [
                styles.row,
                idx < filtered.length - 1 && {
                  borderBottomColor: dividerColor,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                },
                pressed && { opacity: 0.55 },
              ]}
              accessibilityLabel={`${lang.nativeName} (${lang.name})`}
            >
              <View style={styles.rowLeft}>
                <Text style={[styles.rowNative, { color: primaryColor }]}>
                  {lang.nativeName}
                </Text>
                <Text style={[styles.rowName, { color: secondaryColor }]} numberOfLines={1}>
                  {lang.name}
                </Text>
              </View>
              <View style={styles.rowRight}>
                {selected === lang.code ? (
                  <Check size={18} color={checkColor} strokeWidth={2.6} />
                ) : (
                  <View style={styles.checkPlaceholder} />
                )}
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: bg }]}>
        <Pressable
          onPress={handleSave}
          disabled={!hasChanges}
          style={({ pressed }) => [
            styles.saveBtn,
            !hasChanges && { opacity: 0.4 },
            pressed && hasChanges && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.saveBtnText}>{t('common.save')}</Text>
        </Pressable>
      </View>
    </HalfSheet>
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
    ...fontFamily.semibold,
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
  rowNative: {
    ...fontFamily.medium,
    fontSize: fontSize[16],
    letterSpacing: -0.1,
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
  },
  checkPlaceholder: {
    width: 18,
    height: 18,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  saveBtn: {
    height: 52,
    borderRadius: radius.full,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    ...fontFamily.semibold,
    fontSize: fontSize[16],
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
});
