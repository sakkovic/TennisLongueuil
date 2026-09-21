import * as Localization from 'expo-localization';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { authStorage } from '@/lib/secureStorage';
import { setDateLocale } from '@/utils/date';

import { locales, strings, type Locale, type TranslationKey } from './strings';

const STORAGE_KEY = 'app.locale';

function deviceLocale(): Locale {
  try {
    const code = Localization.getLocales()[0]?.languageCode?.toLowerCase();
    return code === 'fr' ? 'fr' : 'en';
  } catch {
    return 'en';
  }
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? ''));
}

export function translate(
  locale: Locale,
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string {
  return interpolate(strings[locale][key], vars);
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'en',
  setLocale: () => undefined,
  t: (key, vars) => translate('en', key, vars),
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const initial = deviceLocale();
    setDateLocale(initial);
    return initial;
  });

  useEffect(() => {
    void authStorage
      .getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored && (locales as readonly string[]).includes(stored)) {
          setDateLocale(stored as Locale);
          setLocaleState(stored as Locale);
        }
      })
      .catch(() => undefined);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setDateLocale(next);
    setLocaleState(next);
    void authStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, vars) => translate(locale, key, vars),
    }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}

export function useT() {
  return useI18n().t;
}
