import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { storage } from './storage';
import { Platform, NativeModules } from 'react-native';

import es from '../assets/locales/es.json';
import en from '../assets/locales/en.json';

// Detecta el idioma del dispositivo nativamente
const getSystemLanguage = (): string => {
  try {
    const locale =
      Platform.OS === 'ios'
        ? NativeModules.SettingsManager?.settings?.AppleLocale ||
          NativeModules.SettingsManager?.settings?.AppleLanguages?.[0]
        : NativeModules.I18nManager?.localeIdentifier;

    if (locale) {
      const lang = locale.split(/[_-]/)[0].toLowerCase();
      if (lang === 'es' || lang === 'en') {
        return lang;
      }
    }
  } catch (e) {
    console.log('[i18n] Error detecting system language:', e);
  }
  return 'es'; // default a español
};

export const initI18n = async () => {
  let savedLanguage = null;
  try {
    savedLanguage = await storage.get('language');
  } catch (e) {
    console.log('[i18n] Error reading language from AsyncStorage:', e);
  }

  const lng = savedLanguage === 'en' || savedLanguage === 'es' ? savedLanguage : getSystemLanguage();

  await i18n
    .use(initReactI18next)
    .init({
      resources: {
        es: { translation: es },
        en: { translation: en },
      },
      lng,
      fallbackLng: 'es',
      interpolation: {
        escapeValue: false,
      },
    });
};

export default i18n;
