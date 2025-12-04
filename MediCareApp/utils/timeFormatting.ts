/**
 * Time formatting utilities for consistent timezone handling across the app
 * All times are displayed in Africa/Tunis timezone to match backend formatting
 */

/**
 * Format a date string or Date object to time string in Tunisia timezone
 * @param dateString - ISO date string or Date object
 * @returns Formatted time string (HH:mm)
 */
export function formatTime(dateString: string | Date): string {
  // Backend stores time in UTC, we need to display in Tunisia timezone consistently
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

  // IMPORTANT: Always use Tunisia timezone (Africa/Tunis) for consistent display
  // This matches the backend formatting and ensures times are correct regardless of device timezone
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Africa/Tunis'
  });
}

/**
 * Format a date string or Date object to date string in Tunisia timezone
 * @param dateString - ISO date string or Date object
 * @param options - Optional Intl.DateTimeFormatOptions
 * @returns Formatted date string
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
    timeZone: 'Africa/Tunis'
  };

  return date.toLocaleDateString('fr-FR', { ...defaultOptions, ...options });
}

/**
 * Format a date string or Date object to date and time string in Tunisia timezone
 * @param dateString - ISO date string or Date object
 * @param options - Optional Intl.DateTimeFormatOptions
 * @returns Formatted date and time string
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
    timeZone: 'Africa/Tunis'
  };

  return date.toLocaleString('fr-FR', { ...defaultOptions, ...options });
}

