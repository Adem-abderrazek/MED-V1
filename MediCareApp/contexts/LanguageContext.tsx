import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { I18nManager } from 'react-native';
import { changeLanguage, getCurrentLanguage, isRTL as checkRTL } from '../config/i18n';

interface LanguageContextType {
  currentLanguage: string;
  changeLanguage: (language: string) => Promise<void>;
  isRTL: boolean;
  t: (key: string, options?: any) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const { t, i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState<string>(i18n.language || getCurrentLanguage());
  const [isRTL, setIsRTL] = useState<boolean>(checkRTL());
  const [refreshKey, setRefreshKey] = useState<number>(0); // Force re-render key

  useEffect(() => {
    // Initialize language on mount - load from storage
    const initializeLanguage = async () => {
      try {
        // Wait a bit for i18n to initialize if needed
        let attempts = 0;
        while (!i18n.isInitialized && attempts < 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        // Get language from storage or i18n
        const lang = i18n.language || getCurrentLanguage();
        console.log(`🌐 Initializing language context with: ${lang} (i18n initialized: ${i18n.isInitialized})`);
        setCurrentLanguage(lang);
        setIsRTL(checkRTL());
        
        // Force RTL setup
        const rtl = lang === 'ar';
        I18nManager.forceRTL(rtl);
        I18nManager.allowRTL(rtl);
        
        // Force refresh to ensure all components update
        setRefreshKey(prev => prev + 1);
      } catch (error) {
        console.error('Error initializing language:', error);
        const lang = getCurrentLanguage();
        setCurrentLanguage(lang);
        setIsRTL(checkRTL());
      }
    };
    
    initializeLanguage();
    
    // Listen to language changes from i18n
    const handleLanguageChanged = (lng: string) => {
      console.log(`🌐 i18n language changed event: ${lng}`);
      setCurrentLanguage(lng);
      const rtl = lng === 'ar';
      setIsRTL(rtl);
      // Force RTL update
      I18nManager.forceRTL(rtl);
      I18nManager.allowRTL(rtl);
      // Force a refresh to ensure all components update
      setRefreshKey(prev => prev + 1);
    };
    
    i18n.on('languageChanged', handleLanguageChanged);
    
    // Also listen for when i18n becomes initialized
    const handleInitialized = () => {
      console.log('🌐 i18n initialized, syncing language context');
      const lang = i18n.language || getCurrentLanguage();
      setCurrentLanguage(lang);
      setIsRTL(checkRTL());
      const rtl = lang === 'ar';
      I18nManager.forceRTL(rtl);
      I18nManager.allowRTL(rtl);
      setRefreshKey(prev => prev + 1);
    };
    
    if (i18n.isInitialized) {
      handleInitialized();
    } else {
      i18n.on('initialized', handleInitialized);
    }
    
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
      i18n.off('initialized', handleInitialized);
    };
  }, [i18n]);

  const handleChangeLanguage = useCallback(async (language: string) => {
    if (!['en', 'fr', 'ar'].includes(language)) {
      console.warn(`Invalid language code: ${language}`);
      return;
    }

    try {
      const previousRTL = isRTL;
      const previousLang = currentLanguage;
      
      console.log(`🔄 Changing language from ${previousLang} to ${language}`);
      
      // Update state immediately for responsive UI
      const rtl = language === 'ar';
      setCurrentLanguage(language);
      setIsRTL(rtl);
      
      // Force RTL layout change - always set it to ensure proper switching
      // This is critical when switching from RTL to LTR
      I18nManager.forceRTL(rtl);
      I18nManager.allowRTL(rtl);
      
      // Call the i18n change function
      await changeLanguage(language);
      
      // Force a refresh to ensure all components re-render
      setRefreshKey(prev => prev + 1);
      
      // If RTL state changed, log it
      if (previousRTL !== rtl) {
        console.log(`🔄 RTL state changed: ${previousRTL} → ${rtl}`);
      }
      
      console.log(`✅ Language change completed: ${previousLang} → ${language}`);
    } catch (error) {
      console.error('Error changing language:', error);
    }
  }, [isRTL, currentLanguage]);

  // Create a new value object on each language change to force re-renders
  // The refreshKey ensures the value object reference changes
  const value: LanguageContextType = useMemo(() => ({
    currentLanguage,
    changeLanguage: handleChangeLanguage,
    isRTL,
    t,
  }), [currentLanguage, isRTL, refreshKey, t, handleChangeLanguage]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

