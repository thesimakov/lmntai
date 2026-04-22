'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import {
  COOKIE_KEY,
  guessLanguageFromLocale,
  readStoredLanguage,
  t as translate,
  type MessageKey,
  type UiLanguage,
  writeStoredLanguage,
} from '@/lib/i18n';

type I18nContextValue = {
  lang: UiLanguage;
  setLang: (lang: UiLanguage) => void;
  t: (key: MessageKey) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<UiLanguage>('ru');

  useEffect(() => {
    const stored = readStoredLanguage();
    const initial = stored ?? guessLanguageFromLocale(window.navigator.language);
    setLangState(initial);
    try {
      document.cookie = `${COOKIE_KEY}=${initial}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      // ignore
    }
  }, []);

  function setLang(next: UiLanguage) {
    setLangState(next);
    try {
      writeStoredLanguage(next);
      // Server components (not-found/landing metadata) can read this.
      document.cookie = `${COOKIE_KEY}=${next}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      // ignore
    }
  }

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      setLang,
      t: (key) => translate(lang, key),
    }),
    [lang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      lang: 'ru',
      setLang: () => undefined,
      t: (key) => translate('ru', key),
    };
  }
  return ctx;
}

