/**
 * Phone Number Normalization Utility
 * 
 * Handles phone number normalization for all international formats using libphonenumber-js.
 * Supports all countries and generates multiple formats for flexible searching.
 */

import { parsePhoneNumber, isValidPhoneNumber, AsYouType, CountryCode } from 'libphonenumber-js';

export interface PhoneNormalizationResult {
  normalized: string;
  withoutPlus: string;
  localFormat: string;
  isValid: boolean;
  formats: string[];
  countryCode?: string;
}

/**
 * Normalize phone number to international E.164 format (e.g., +33612345678, +216612345678)
 * Generates multiple formats for flexible database searching
 */
export function normalizePhoneNumber(phone: string | null | undefined): PhoneNormalizationResult {
  if (!phone || typeof phone !== 'string') {
    return {
      normalized: '',
      withoutPlus: '',
      localFormat: '',
      isValid: false,
      formats: [],
    };
  }

  // Remove all non-digit characters except +
  let cleanPhone = phone.trim();

  // Try to parse as international number
  try {
    // Remove any formatting characters but keep +
    cleanPhone = cleanPhone.replace(/[^\d+]/g, '');
    
    // If it doesn't start with +, try to detect country code
    if (!cleanPhone.startsWith('+')) {
      // Try parsing with common country codes or let the library detect
      // First, try Tunisia (216) as default fallback for local formats
      if (cleanPhone.startsWith('0') && cleanPhone.length === 9) {
        // Tunisian local format: 052536742 -> +21652536742
        cleanPhone = `+216${cleanPhone.substring(1)}`;
      } else if (cleanPhone.length === 8 && !cleanPhone.startsWith('0')) {
        // Tunisian 8-digit: 52536742 -> +21652536742
        cleanPhone = `+216${cleanPhone}`;
      } else if (cleanPhone.startsWith('216') && cleanPhone.length === 11) {
        // Tunisian with country code: 21652536742 -> +21652536742
        cleanPhone = `+${cleanPhone}`;
      } else {
        // For other numbers, try with + prefix
        // libphonenumber-js will try to parse it, but might need country hint
        // We'll try without country first, then with Tunisia as fallback
        cleanPhone = `+${cleanPhone}`;
      }
    }

    // Try to parse the phone number
    let parsedNumber = null;
    
    // First, try parsing without country hint
    try {
      parsedNumber = parsePhoneNumber(cleanPhone);
      if (!parsedNumber || !parsedNumber.isValid()) {
        // Try with Tunisia as default country (for local formats)
        parsedNumber = parsePhoneNumber(cleanPhone, 'TN' as CountryCode);
      }
    } catch (error) {
      // If parsing fails, try with country hint
      try {
        parsedNumber = parsePhoneNumber(cleanPhone, 'TN' as CountryCode);
      } catch (error2) {
        // Last attempt: use AsYouType parser
        try {
          const asYouType = new AsYouType();
          asYouType.input(cleanPhone);
          const number = asYouType.getNumber();
          if (number && number.isValid()) {
            parsedNumber = number;
          }
        } catch (error3) {
          // All parsing attempts failed
          parsedNumber = null;
        }
      }
    }

    // If still no valid parse, return invalid
    if (!parsedNumber || !parsedNumber.isValid()) {
      const digitsOnly = phone.replace(/[^\d]/g, '');
      return {
        normalized: phone.startsWith('+') ? phone : `+${digitsOnly}`,
        withoutPlus: digitsOnly,
        localFormat: phone,
        isValid: false,
        formats: [
          phone,
          digitsOnly,
          phone.startsWith('+') ? phone.substring(1) : digitsOnly,
        ],
      };
    }

    const normalized = parsedNumber.number; // E.164 format with +
    const withoutPlus = normalized.substring(1); // Without +
    const countryCode = parsedNumber.country || undefined;
    const nationalNumber = parsedNumber.nationalNumber; // Local format without country code
    const countryCallingCode = parsedNumber.countryCallingCode;

    // Generate all possible search formats for database queries
    const formats: string[] = [
      normalized, // +33612345678
      withoutPlus, // 33612345678
      nationalNumber, // 612345678 (for Tunisia), 612345678 (for France)
    ];

    // Add country-specific formats
    if (countryCode === 'TN') {
      // Tunisia specific formats
      formats.push(`0${nationalNumber}`); // 0612345678
      formats.push(`216${nationalNumber}`); // 216612345678
    } else if (countryCode === 'FR') {
      // France specific formats
      formats.push(`0${nationalNumber}`); // 0612345678 (if applicable)
      formats.push(`33${nationalNumber}`); // 33612345678
    } else if (countryCode) {
      // For other countries, add common variations
      formats.push(`${countryCallingCode}${nationalNumber}`); // 33612345678
    }

    // Remove duplicates and empty strings
    const uniqueFormats = [...new Set(formats)].filter(f => f && f.length > 0);

    return {
      normalized,
      withoutPlus,
      localFormat: nationalNumber,
      isValid: true,
      formats: uniqueFormats,
      countryCode,
    };
  } catch (error) {
    // If parsing fails, return original with basic cleaning
    const digitsOnly = phone.replace(/[^\d]/g, '');
    return {
      normalized: phone.startsWith('+') ? phone : `+${digitsOnly}`,
      withoutPlus: digitsOnly,
      localFormat: phone,
      isValid: false,
      formats: [
        phone,
        digitsOnly,
        phone.startsWith('+') ? phone.substring(1) : digitsOnly,
      ],
    };
  }
}

/**
 * Check if two phone numbers are the same (handles different formats)
 */
export function arePhonesEqual(phone1: string, phone2: string): boolean {
  const norm1 = normalizePhoneNumber(phone1);
  const norm2 = normalizePhoneNumber(phone2);
  
  if (!norm1.isValid || !norm2.isValid) {
    return phone1 === phone2;
  }
  
  return norm1.normalized === norm2.normalized;
}

/**
 * Normalize email to lowercase
 */
export function normalizeEmail(email: string | null | undefined): string {
  if (!email || typeof email !== 'string') {
    return '';
  }
  return email.trim().toLowerCase();
}


