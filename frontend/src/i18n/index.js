import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslation from './locales/en.json';
import amTranslation from './locales/am.json';

const defaultLang = import.meta.env.VITE_DEFAULT_LANGUAGE || 'en';

const stored = localStorage.getItem('mcms_lang');
// Migrate legacy Spanish selection to Amharic
const initialLang = stored === 'es' ? 'am' : stored || defaultLang;
if (stored === 'es') {
  localStorage.setItem('mcms_lang', 'am');
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: enTranslation },
    am: { translation: amTranslation },
  },
  lng: initialLang,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

document.documentElement.lang = initialLang === 'am' ? 'am' : 'en';

export default i18n;
