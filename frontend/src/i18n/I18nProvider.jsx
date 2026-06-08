import React, { createContext, useContext, useState } from 'react';
import { useTranslation as useReactTranslation } from 'react-i18next';

const I18nContext = createContext(null);

export const I18nProvider = ({ children }) => {
  const { i18n } = useReactTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('mcms_lang', lng);
    setCurrentLanguage(lng);
    document.documentElement.lang = lng === 'am' ? 'am' : 'en';
  };

  return (
    <I18nContext.Provider value={{ language: currentLanguage, changeLanguage }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
