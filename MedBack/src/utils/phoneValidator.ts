/**
 * Phone Number Validation Utility
 * 
 * Validates phone numbers using libphonenumber-js library.
 */

import {
  parsePhoneNumber,
  isValidPhoneNumber,
  CountryCode,
} from 'libphonenumber-js';

export interface PhoneValidationResult {
  isValid: boolean;
  isPossible: boolean;
  isValidForCountry: boolean;
  e164: string;
  countryCode: CountryCode | null;
  nationalNumber: string;
  type?: 'MOBILE' | 'FIXED_LINE' | 'FIXED_LINE_OR_MOBILE' | undefined;
  error?: string;
}

/**
 * Validate phone number using libphonenumber-js
 */
export function validatePhoneNumber(
  phoneNumber: string,
  defaultCountry?: CountryCode
): PhoneValidationResult {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return {
      isValid: false,
      isPossible: false,
      isValidForCountry: false,
      e164: '',
      countryCode: null,
      nationalNumber: '',
      error: 'Phone number is required',
    };
  }

  try {
    const parsed = parsePhoneNumber(phoneNumber, defaultCountry);
    
    const isValid = isValidPhoneNumber(phoneNumber, parsed.country || defaultCountry);
    const isPossible = parsed.isPossible();
    const isValidForCountry = parsed.isValid();
    const type = parsed.getType();

    return {
      isValid,
      isPossible,
      isValidForCountry,
      e164: parsed.number || phoneNumber,
      countryCode: parsed.country || null,
      nationalNumber: parsed.nationalNumber,
      type,
    };
  } catch (error: any) {
    return {
      isValid: false,
      isPossible: false,
      isValidForCountry: false,
      e164: phoneNumber,
      countryCode: null,
      nationalNumber: phoneNumber.replace(/\D/g, ''),
      error: error.message || 'Invalid phone number format',
    };
  }
}

/**
 * Validate phone number and return normalized E.164 format
 */
export function validateAndNormalizePhone(
  phoneNumber: string,
  defaultCountry?: CountryCode
): string {
  const validation = validatePhoneNumber(phoneNumber, defaultCountry);
  
  if (!validation.isValidForCountry || !validation.isPossible) {
    throw new Error(
      validation.error || 
      'Invalid phone number format. Expected E.164 format (e.g., +21612345678)'
    );
  }

  return validation.e164;
}

/**
 * Check if phone number is in E.164 format
 */
export function isE164Format(phoneNumber: string): boolean {
  return /^\+[1-9]\d{1,14}$/.test(phoneNumber);
}

/**
 * Get localized error message for phone validation
 */
export function getPhoneValidationErrorMessage(
  validation: PhoneValidationResult,
  countryName?: string
): string {
  if (validation.isValid) {
    return '';
  }

  if (!validation.isPossible) {
    return `Number is not possible for ${countryName || 'selected country'}`;
  }

  if (!validation.isValidForCountry) {
    return `Invalid phone number format for ${countryName || 'selected country'}`;
  }

  return validation.error || 'Invalid phone number';
}


