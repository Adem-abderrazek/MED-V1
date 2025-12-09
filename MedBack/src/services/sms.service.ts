/**
 * SMS Service
 * 
 * Handles SMS sending via Educanet API.
 * All console.log statements replaced with logger.
 */

import { logger } from '@utils/logger.js';
import { normalizePhoneNumber } from '@utils/phoneNormalizer.js';

interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

const BASE_URL = 'https://mon-compte.educanet.pro/mobile/notificationgeneral/sendsms/Medicare';

/**
 * Send SMS to a phone number
 */
export async function sendSMS(to: string, message: string): Promise<SMSResponse> {
    try {
      logger.debug('Sending SMS', { to, messageLength: message.length });

      // Normalize phone number
      const phoneResult = normalizePhoneNumber(to);
      if (!phoneResult.isValid) {
        logger.warn('Invalid phone number format', { to });
        return {
          success: false,
          error: 'Invalid phone number format',
        };
      }

      // Format for Educanet API (remove + and ensure correct format)
      let cleanPhoneNumber = phoneResult.withoutPlus;
      
      // Only force 216 prefix for Tunisia numbers
      // Check if it's a Tunisia number by country code or length
      if (phoneResult.countryCode === 'TN' || phoneResult.normalized.startsWith('+216')) {
        // Tunisia number - ensure 216 prefix
        if (!cleanPhoneNumber.startsWith('216')) {
          if (cleanPhoneNumber.startsWith('0')) {
            cleanPhoneNumber = '216' + cleanPhoneNumber.substring(1);
          } else if (cleanPhoneNumber.length === 8) {
            cleanPhoneNumber = '216' + cleanPhoneNumber;
          }
        }
      } else {
        // International number - use as-is (without +)
        // Note: Educanet API might only support Tunisia numbers
        // For international numbers, log a warning
        if (phoneResult.countryCode && phoneResult.countryCode !== 'TN') {
          logger.warn('SMS service: International number detected, Educanet API may not support it', {
            countryCode: phoneResult.countryCode,
            normalized: phoneResult.normalized,
          });
        }
        // Still try to send, but use the withoutPlus format
        cleanPhoneNumber = phoneResult.withoutPlus;
      }

      // Encode message for URL
      const encodedMessage = encodeURIComponent(message);
      const url = `${BASE_URL}/${cleanPhoneNumber}/${encodedMessage}`;

      logger.debug('Sending SMS request', { 
        to: cleanPhoneNumber,
        countryCode: phoneResult.countryCode,
        normalized: phoneResult.normalized,
        url: url.substring(0, 150) + '...' 
      });

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      const responseText = await response.text();
      logger.debug('SMS API response', {
        status: response.status,
        statusText: response.statusText,
        responseBody: responseText.substring(0, 200),
      });

      if (response.ok) {
        try {
          const responseData = JSON.parse(responseText);
          
          if (responseData.etat === 'ok' || responseData.success === true) {
            logger.info('SMS sent successfully', { 
              to: cleanPhoneNumber,
              normalized: phoneResult.normalized,
            });
            return {
              success: true,
              messageId: `educanet_${Date.now()}`,
            };
          } else {
            logger.warn('SMS send failed - Educanet error', { 
              etat: responseData.etat,
              message: responseData.message,
              to: cleanPhoneNumber,
              normalized: phoneResult.normalized,
            });
            return {
              success: false,
              error: `Educanet error: ${responseData.etat || responseData.message || 'Unknown'}`,
            };
          }
        } catch (parseErr) {
          // If 200 OK but can't parse, check response text
          if (responseText.toLowerCase().includes('ok') || responseText.toLowerCase().includes('success')) {
            logger.info('SMS sent successfully (200 OK, unparseable response)', { 
              to: cleanPhoneNumber,
              normalized: phoneResult.normalized,
              responseText: responseText.substring(0, 100),
            });
            return {
              success: true,
              messageId: `educanet_${Date.now()}`,
            };
          } else {
            logger.warn('SMS send may have failed - unexpected response format', {
              to: cleanPhoneNumber,
              normalized: phoneResult.normalized,
              responseText: responseText.substring(0, 200),
            });
            // Still return success if status is 200, but log warning
            return {
              success: true,
              messageId: `educanet_${Date.now()}`,
            };
          }
        }
      } else {
        logger.error('SMS send failed', new Error(`HTTP ${response.status}`), {
          status: response.status,
          statusText: response.statusText,
          to: cleanPhoneNumber,
          normalized: phoneResult.normalized,
          errorBody: responseText.substring(0, 200),
        });
        
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
    } catch (error) {
      logger.error('SMS service error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
}

/**
 * Send invitation SMS
 */
export async function sendInvitationSMS(phoneNumber: string, email: string, password: string): Promise<SMSResponse> {
    logger.debug('Sending invitation SMS', { phoneNumber, email });
    
    const message = `Medicare: Email: ${email} Password: ${password}`;
    const result = await sendSMS(phoneNumber, message);
    
    logger.info('Invitation SMS result', { success: result.success, phoneNumber });
    return result;
}

/**
 * Send verification code SMS
 */
export async function sendVerificationCode(phoneNumber: string, code: string): Promise<SMSResponse> {
    logger.debug('Sending verification code SMS', { phoneNumber });
    
    const message = `Votre code de verification MediCare est: ${code}. Ne partagez ce code avec personne.`;
    const result = await sendSMS(phoneNumber, message);
    
    logger.info('Verification code SMS result', { success: result.success, phoneNumber });
    return result;
}

/**
 * Send update notification SMS
 */
export async function sendUpdateNotification(phoneNumber: string, updateType: string): Promise<SMSResponse> {
    logger.debug('Sending update notification SMS', { phoneNumber, updateType });
    
    const message = `MediCare: Votre medecin/tuteur a modifie votre traitement. Ouvrez l'app pour synchroniser.`;
    const result = await sendSMS(phoneNumber, message);
    
    logger.info('Update notification SMS result', { success: result.success, phoneNumber });
    return result;
}


