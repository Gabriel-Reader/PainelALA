import React, { createContext, useContext, useState, useCallback } from 'react';
import { translations, Lang, Translations } from './i18n';

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'pt',
  setLang: () => {},
  t: translations['pt'],
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem('painel_lang');
    return (stored === 'en' || stored === 'pt') ? stored : 'pt';
  });

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem('painel_lang', l);
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}
