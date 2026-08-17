import i18n from 'i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

import en from './locales/en.json';
import hi from './locales/hi.json';
import te from './locales/te.json';
import ta from './locales/ta.json';
import mr from './locales/mr.json';
import kn from './locales/kn.json';
import bn from './locales/bn.json';

const LANGUAGE_KEY = '@vetgo_selected_language';

export const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', native: 'हिंदी', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', native: 'मराठी', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', flag: '🇮🇳' },
];

const initI18n = async () => {
  let savedLanguage = 'en';
  try {
    const storedLang = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (storedLang) {
      savedLanguage = storedLang;
    } else {
      const deviceLang = Localization.getLocales()[0]?.languageCode;
      if (deviceLang && LANGUAGES.some(l => l.code === deviceLang)) {
        savedLanguage = deviceLang;
      }
    }
  } catch (error) {
    console.error('Error loading saved language preference:', error);
  }

  await i18n.init({
    compatibilityJSON: 'v4',
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      te: { translation: te },
      ta: { translation: ta },
      mr: { translation: mr },
      kn: { translation: kn },
      bn: { translation: bn },
    },
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });
};

export const changeAppLanguage = async (languageCode: string) => {
  try {
    await i18n.changeLanguage(languageCode);
    await AsyncStorage.setItem(LANGUAGE_KEY, languageCode);
  } catch (error) {
    console.error('Failed to change language:', error);
  }
};

import { useState, useEffect } from 'react';

export const useTranslation = () => {
  const [, setLanguage] = useState(i18n.language);

  useEffect(() => {
    const onLanguageChange = (lng: string) => {
      setLanguage(lng);
    };
    i18n.on('languageChanged', onLanguageChange);
    return () => {
      i18n.off('languageChanged', onLanguageChange);
    };
  }, []);

  return {
    t: (key: string, options?: any): string => String(i18n.t(key, options)),
    i18n,
  };
};

initI18n();

export default i18n;
