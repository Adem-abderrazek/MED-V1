import { getCurrentLanguage } from '../config/i18n';

// Day names in different languages
const dayNames: Record<string, string[]> = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  fr: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
  ar: ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'],
};

// Month names in different languages
const monthNames: Record<string, string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  fr: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
};

// Full month names for longer formats
const fullMonthNames: Record<string, string[]> = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  fr: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
};

/**
 * Get day name based on current language
 */
export const getDayName = (date: Date, language?: string, short: boolean = true): string => {
  const lang = language || getCurrentLanguage();
  const dayIndex = date.getDay();
  const names = dayNames[lang] || dayNames.en;
  return names[dayIndex];
};

/**
 * Get month name based on current language
 */
export const getMonthName = (date: Date, language?: string, short: boolean = true): string => {
  const lang = language || getCurrentLanguage();
  const monthIndex = date.getMonth();
  const names = short ? (monthNames[lang] || monthNames.en) : (fullMonthNames[lang] || fullMonthNames.en);
  return names[monthIndex];
};

/**
 * Format date with language-aware month and day names
 * Numbers (1-9, 10-31) remain as numbers, only text is translated
 */
export const formatDate = (date: Date, format: 'short' | 'long' = 'short'): string => {
  const lang = getCurrentLanguage();
  const dayNumber = date.getDate();
  const monthName = getMonthName(date, format === 'short');
  const dayName = getDayName(date, format === 'short');
  
  if (format === 'short') {
    return `${dayName} ${dayNumber} ${monthName}`;
  } else {
    return `${dayName} ${dayNumber} ${monthName} ${date.getFullYear()}`;
  }
};

/**
 * Get locale string for date formatting (for toLocaleDateString)
 */
export const getLocaleString = (): string => {
  const lang = getCurrentLanguage();
  const localeMap: Record<string, string> = {
    en: 'en-US',
    fr: 'fr-FR',
    ar: 'ar-SA',
  };
  return localeMap[lang] || 'en-US';
};

