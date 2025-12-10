import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';

// Import translation files
// @ts-ignore - JSON imports
import en from '../locales/en/translation.json';
// @ts-ignore - JSON imports
import fr from '../locales/fr/translation.json';
// @ts-ignore - JSON imports
import ar from '../locales/ar/translation.json';

const LANGUAGE_STORAGE_KEY = '@medicare_language';

// RTL languages
const RTL_LANGUAGES = ['ar'];

// Initialize language from storage or device locale
const initLanguage = async (): Promise<string> => {
  try {
    // First, try to get saved language preference
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    console.log(`📦 Loaded saved language from storage: ${savedLanguage}`);
    if (savedLanguage && ['en', 'fr', 'ar'].includes(savedLanguage)) {
      console.log(`✅ Using saved language: ${savedLanguage}`);
      return savedLanguage;
    }

    // Second, try to detect from device locale
    const locales = Localization.getLocales();
    if (locales && locales.length > 0) {
      const deviceLocale = locales[0].languageCode || locales[0].languageTag?.split('-')[0];
      console.log(`📱 Detected device locale: ${deviceLocale}`);
      if (deviceLocale && ['en', 'fr', 'ar'].includes(deviceLocale)) {
        console.log(`✅ Using device locale: ${deviceLocale}`);
        return deviceLocale;
      }
    }

    // Default to English
    console.log(`⚠️ No language found, defaulting to English`);
    return 'en';
  } catch (error) {
    console.error('❌ Error initializing language:', error);
    return 'en';
  }
};

// Set RTL layout based on language
const setRTL = (language: string, forceUpdate: boolean = false) => {
  const isRTL = RTL_LANGUAGES.includes(language);
  const Platform = require('react-native').Platform;
  const previousRTL = I18nManager.isRTL;
  
  // ALWAYS update RTL settings - this is critical for proper switching
  // Especially important when switching from RTL to LTR (must explicitly set to false)
  I18nManager.forceRTL(isRTL);
  I18nManager.allowRTL(isRTL);
  
  // Log the change for debugging
  if (previousRTL !== isRTL) {
    console.log(`🔄 RTL changed from ${previousRTL} to ${isRTL} for language: ${language}`);
    
    // On Android, RTL changes may require app reload for full effect
    // But we set it anyway for immediate partial effect
    if (Platform.OS === 'android') {
      console.log(`⚠️ On Android, full RTL layout update may require app reload`);
    }
  } else {
    console.log(`🌐 RTL maintained at ${isRTL} for language: ${language}`);
  }
};

// Initialize i18n
const initializeI18n = async () => {
  try {
    const language = await initLanguage();
    console.log(`🌐 Initializing i18n with language: ${language}`);
    setRTL(language);

    await i18n
      .use(initReactI18next)
      .init({
        compatibilityJSON: 'v4',
        resources: {
          en: { translation: en },
          fr: { translation: fr },
          ar: { translation: ar },
        },
        lng: language,
        fallbackLng: 'en',
        interpolation: {
          escapeValue: false, // React already escapes values
        },
        react: {
          useSuspense: false,
        },
      });

    console.log(`✅ i18n initialized with language: ${i18n.language}`);
    return language;
  } catch (error) {
    console.error('❌ Error initializing i18n:', error);
    // Initialize with default language on error
    await i18n
      .use(initReactI18next)
      .init({
        compatibilityJSON: 'v4',
        resources: {
          en: { translation: en },
          fr: { translation: fr },
          ar: { translation: ar },
        },
        lng: 'en',
        fallbackLng: 'en',
        interpolation: {
          escapeValue: false,
        },
        react: {
          useSuspense: false,
        },
      });
    return 'en';
  }
};

// Change language function
export const changeLanguage = async (language: string) => {
  if (!['en', 'fr', 'ar'].includes(language)) {
    console.warn(`Invalid language code: ${language}`);
    return;
  }

  try {
    const previousLanguage = getCurrentLanguage();
    const wasRTL = RTL_LANGUAGES.includes(previousLanguage);
    const willBeRTL = RTL_LANGUAGES.includes(language);
    
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    
    // Always set RTL, especially important when switching from RTL to LTR
    setRTL(language, wasRTL !== willBeRTL);
    
    await i18n.changeLanguage(language);
    
    console.log(`✅ Language changed from ${previousLanguage} to ${language} (RTL: ${wasRTL} → ${willBeRTL})`);
  } catch (error) {
    console.error('Error changing language:', error);
  }
};

// Get current language
export const getCurrentLanguage = (): string => {
  return i18n.language || 'en';
};

// Check if current language is RTL
export const isRTL = (): boolean => {
  return RTL_LANGUAGES.includes(getCurrentLanguage());
};

// Initialize on import
initializeI18n().catch(console.error);

export default i18n;

