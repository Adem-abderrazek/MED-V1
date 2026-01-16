import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../../i18n';

/**
 * Custom hook for handling language changes
 * Provides consistent language change handling across components
 * 
 * @returns Object with currentLanguage, showLanguagePicker state, and handlers
 */
export function useLanguageChange() {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'fr' | 'ar'>(
    (i18n.language as 'en' | 'fr' | 'ar') || 'fr'
  );
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  // Listen to language changes
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      const lang = (lng || 'fr') as 'en' | 'fr' | 'ar';
      setCurrentLanguage(lang);
      setShowLanguagePicker(false); // Close modal if open
    };

    // Subscribe to language changes
    i18n.on('languageChanged', handleLanguageChange);
    
    // Also check current language on mount
    const currentLang = i18n.language as 'en' | 'fr' | 'ar';
    if (currentLang && currentLang !== currentLanguage) {
      setCurrentLanguage(currentLang);
    }
    
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n, currentLanguage]);

  const handleLanguageChange = async (language: 'en' | 'fr' | 'ar') => {
    await changeLanguage(language);
    setCurrentLanguage(language);
    i18n.emit('languageChanged', language);
  };

  return {
    currentLanguage,
    showLanguagePicker,
    setShowLanguagePicker,
    handleLanguageChange,
  };
}


