import {
  parsePhoneNumber,
  isValidPhoneNumber,
  getCountryCallingCode,
} from 'libphonenumber-js';

/**
 * Validate phone number using libphonenumber-js
 * @param {string} phoneNumber - Phone number to validate
 * @param {string} defaultCountry - Default country code (optional)
 * @returns {Object} Validation result with detailed information
 */
export function validatePhoneNumber(phoneNumber, defaultCountry) {
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
  } catch (error) {
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
 * @param {string} phoneNumber - Phone number to validate
 * @param {string} defaultCountry - Default country code (optional)
 * @returns {string} Normalized E.164 format phone number
 * @throws {Error} If phone number is invalid
 */
export function validateAndNormalizePhone(phoneNumber, defaultCountry) {
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
 * @param {string} phoneNumber - Phone number to check
 * @returns {boolean} True if in E.164 format
 */
export function isE164Format(phoneNumber) {
  // E.164 format: + followed by 1-15 digits
  return /^\+[1-9]\d{1,14}$/.test(phoneNumber);
}

/**
 * Get localized error message for phone validation
 * @param {Object} validation - Validation result object
 * @param {string} countryName - Country name (optional)
 * @returns {string} Error message
 */
export function getPhoneValidationErrorMessage(validation, countryName) {
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
