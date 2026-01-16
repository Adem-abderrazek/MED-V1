import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DevSettings, I18nManager, Platform } from 'react-native';

import en from './en.json';
import fr from './fr.json';
import ar from './ar.json';

const LANGUAGE_STORAGE_KEY = '@app_language';

// Language resources
const resources = {
  en: { translation: en },
  fr: { translation: fr },
  ar: { translation: ar },
};

// Initialize i18n
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'fr', // Default language
    fallbackLng: 'fr',
    compatibilityJSON: 'v3',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false, // Disable suspense for React Native
    },
  });

// Load saved language preference
export const loadSavedLanguage = async (): Promise<string> => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'fr' || savedLanguage === 'ar')) {
      return savedLanguage;
    }
    // Try to detect from device locale
    if (Localization.locale && typeof Localization.locale === 'string') {
      const deviceLocale = Localization.locale.split('-')[0];
      if (deviceLocale === 'fr' || deviceLocale === 'ar') {
        return deviceLocale;
      }
    }
    return 'fr'; // Default to French
  } catch (error) {
    console.error('Error loading saved language:', error);
    return 'fr'; // Default to French
  }
};

// Change language and save preference
export const changeLanguage = async (language: 'en' | 'fr' | 'ar'): Promise<void> => {
  try {
    console.log(`Changing language to: ${language}`);

    // Ensure i18n is initialized
    if (!i18n.isInitialized) {
      await i18n.init({
        resources,
        lng: language,
        fallbackLng: 'fr',
        compatibilityJSON: 'v3',
        interpolation: {
          escapeValue: false,
        },
        react: {
          useSuspense: false,
        },
      });
    }

    // Handle RTL for Arabic - reset to LTR for other languages
    const isRTL = language === 'ar';
    const currentIsRTL = I18nManager.isRTL;
    const shouldReload = currentIsRTL !== isRTL && Platform.OS === 'android';

    // Always set RTL state, even if it's the same, to ensure proper layout
    if (currentIsRTL !== isRTL) {
      I18nManager.forceRTL(isRTL);
      // On Android, we need to reload the app for RTL changes to take full effect.
      if (Platform.OS === 'android' && I18nManager.swapLeftAndRightInRTL) {
        I18nManager.swapLeftAndRightInRTL(isRTL);
      }
      console.log(`RTL changed from ${currentIsRTL ? 'RTL' : 'LTR'} to ${isRTL ? 'RTL' : 'LTR'}`);
    } else {
      // Ensure RTL state is correct even if already set
      I18nManager.forceRTL(isRTL);
    }

    // Change language - this is synchronous but returns a promise
    const changeResult = await i18n.changeLanguage(language);
    console.log('i18n.changeLanguage result:', changeResult);

    // Save to storage
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);

    // Verify the language was actually changed
    const currentLang = i18n.language;
    console.log(`Language changed to: ${currentLang}, RTL: ${isRTL}`);

    if (currentLang !== language) {
      console.warn(`Language mismatch! Expected: ${language}, Got: ${currentLang}`);
    }

    if (shouldReload) {
      DevSettings.reload();
    }
  } catch (error) {
    console.error('Error changing language:', error);
    throw error;
  }
};

// Initialize language on app start
loadSavedLanguage().then((lang) => {
  console.log(`Initializing app with language: ${lang}`);
  i18n.changeLanguage(lang).then(() => {
    console.log(`App initialized with language: ${i18n.language}`);
  }).catch((err) => {
    console.error('Error initializing language:', err);
  });
});

export default i18n;
