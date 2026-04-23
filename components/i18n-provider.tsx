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

type I18nProviderProps = { children: React.ReactNode; initialLang: UiLanguage };

function syncCookie(lang: UiLanguage) {
  try {
    document.cookie = `${COOKIE_KEY}=${lang}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    // ignore
  }
}

function readCookieLang(): UiLanguage | null {
  if (typeof document === 'undefined') return null;
  const m = new RegExp(`(?:^|; )${COOKIE_KEY}=([^;]*)`).exec(document.cookie);
  const v = m?.[1];
  if (v === 'ru' || v === 'en' || v === 'tg') return v;
  return null;
}

export function I18nProvider({ children, initialLang }: I18nProviderProps) {
  const [lang, setLangState] = useState<UiLanguage>(initialLang);

  useEffect(() => {
    const stored = readStoredLanguage();
    if (stored) {
      setLangState((prev) => (stored !== prev ? stored : prev));
      syncCookie(stored);
      return;
    }
    const fromCookie = readCookieLang();
    if (fromCookie) {
      setLangState((prev) => (fromCookie !== prev ? fromCookie : prev));
      return;
    }
    const guessed = guessLanguageFromLocale(
      typeof navigator !== 'undefined' ? navigator.language : undefined,
    );
    setLangState((prev) => (guessed !== prev ? guessed : prev));
    writeStoredLanguage(guessed);
    syncCookie(guessed);
    // Intentionally once on mount: align client with localStorage / cookie / browser; avoid re-running on lang.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setLang(next: UiLanguage) {
    setLangState(next);
    try {
      writeStoredLanguage(next);
      syncCookie(next);
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
