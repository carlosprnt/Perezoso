import React, { useEffect } from 'react';
import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { resources } from './translations';
import { useLanguageStore } from './useLanguageStore';

const SUPPORTED_LANGS = Object.keys(resources);

function detectDeviceLanguage(): string {
  try {
    const locales = getLocales();
    if (locales.length > 0) {
      const tag = locales[0].languageCode ?? 'es';
      if (SUPPORTED_LANGS.includes(tag)) return tag;
    }
  } catch {}
  return 'es';
}

i18n.use(initReactI18next).init({
  resources,
  lng: detectDeviceLanguage(),
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const language = useLanguageStore((s) => s.language);

  useEffect(() => {
    const resolved = language === 'auto' ? detectDeviceLanguage() : language;
    if (i18n.language !== resolved) {
      i18n.changeLanguage(resolved);
    }
  }, [language]);

  return <>{children}</>;
}

export function useT() {
  const { t } = useTranslation();
  return t;
}

export function useLocale(): string {
  const { i18n: inst } = useTranslation();
  return inst.language;
}

export { detectDeviceLanguage, SUPPORTED_LANGS };
