/**
 * Time formatting utilities for consistent timezone handling across the app
 * All times are displayed in Africa/Tunis timezone to match backend formatting
 */

import i18n from '../../../i18n';

/**
 * Get locale based on current language, but force Western numerals (1,2,3)
 */
function getLocaleWithWesternNumerals(): string {
  const lang = i18n.language || 'en';
  // Use locale but we'll force Western numerals via numberingSystem
  return lang === 'ar' ? 'ar-TN' : lang === 'fr' ? 'fr-FR' : 'en-US';
}

/**
 * Format a date string or Date object to time string in Tunisia timezone
 * @param dateString - ISO date string or Date object
 * @returns Formatted time string (HH:mm) with Western numerals
 */
export function formatTime(dateString: string | Date): string {
  // Backend stores time in UTC, we need to display in Tunisia timezone consistently
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

  // IMPORTANT: Always use Tunisia timezone (Africa/Tunis) for consistent display
  // Force Western numerals (1,2,3) even in Arabic locale
  const locale = getLocaleWithWesternNumerals();
  return date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Africa/Tunis',
    numberingSystem: 'latn' // Force Western/Latin numerals
  });
}

/**
 * Format a date string or Date object to date string in Tunisia timezone
 * @param dateString - ISO date string or Date object
 * @param options - Optional Intl.DateTimeFormatOptions
 * @returns Formatted date string with Western numerals
 */
export function formatDate(
  dateString: string | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Tunis',
    numberingSystem: 'latn' // Force Western/Latin numerals
  };

  const locale = getLocaleWithWesternNumerals();
  return date.toLocaleDateString(locale, { ...defaultOptions, ...options });
}

/**
 * Format a date string or Date object to date and time string in Tunisia timezone
 * @param dateString - ISO date string or Date object
 * @param options - Optional Intl.DateTimeFormatOptions
 * @returns Formatted date and time string with Western numerals
 */
export function formatDateTime(
  dateString: string | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Tunis',
    numberingSystem: 'latn' // Force Western/Latin numerals
  };

  const locale = getLocaleWithWesternNumerals();
  return date.toLocaleString(locale, { ...defaultOptions, ...options });
}





