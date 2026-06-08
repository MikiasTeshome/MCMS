import { config } from '../config/index.js';

export const i18nMiddleware = (req, res, next) => {
  // Read language header, fallback to config default
  const acceptLang = req.headers['accept-language'];
  
  let locale = config.defaultLanguage; // E.g. 'en'
  
  if (acceptLang) {
    // Parse header values, e.g. "es-ES,es;q=0.9,en;q=0.8" -> "es"
    const matchedLocale = acceptLang.split(',')[0].split('-')[0].trim().toLowerCase();
    
    // Legacy 'es' clients map to Amharic
    const normalized =
      matchedLocale === 'es' ? 'am' : matchedLocale;
    if (['en', 'am'].includes(normalized)) {
      locale = normalized;
    }
  }

  // Bind active locale code to request context
  req.locale = locale;
  next();
};
