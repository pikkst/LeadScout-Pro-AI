import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Language, Translations, LANGUAGES } from './types';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  languages: typeof LANGUAGES;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// Lazy-load translations
const loadTranslations = async (lang: Language): Promise<Translations> => {
  switch (lang) {
    case 'ru': return (await import('./ru')).default;
    case 'fi': return (await import('./fi')).default;
    case 'de': return (await import('./de')).default;
    case 'es': return (await import('./es')).default;
    default: return (await import('./en')).default;
  }
};

const STORAGE_KEY = 'leadscout_lang';

const getInitialLanguage = (): Language => {
  // 1. Check localStorage
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && ['en', 'ru', 'fi', 'de', 'es'].includes(stored)) {
    return stored as Language;
  }
  // 2. Check browser language
  const browserLang = navigator.language.slice(0, 2).toLowerCase();
  if (['ru', 'fi', 'de', 'es'].includes(browserLang)) {
    return browserLang as Language;
  }
  return 'en';
};

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage());
  const [translations, setTranslations] = useState<Translations | null>(null);

  const loadLang = useCallback(async (lang: Language) => {
    const t = await loadTranslations(lang);
    setTranslations(t);
    document.documentElement.lang = lang;
  }, []);

  useEffect(() => {
    loadLang(language);
  }, [language, loadLang]);

  const setLanguage = useCallback((lang: Language) => {
    localStorage.setItem(STORAGE_KEY, lang);
    setLanguageState(lang);
  }, []);

  if (!translations) {
    return null; // Loading translations
  }

  return (
    <I18nContext.Provider value={{ language, setLanguage, t: translations, languages: LANGUAGES }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
};
