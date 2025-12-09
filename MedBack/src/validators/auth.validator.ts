/**
 * Authentication Validation Schemas
 * 
 * Zod schemas for validating authentication-related requests.
 */

import { z } from 'zod';
import { USER_TYPES } from '@utils/constants.js';

/**
 * Login request validation schema
 */
export const loginSchema = z.object({
  emailOrPhone: z
    .string()
    .min(1, 'Email or phone number is required')
    .refine(
      (value) => {
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        const isPhone = /^\+?[0-9\s\-\(\)]{8,15}$/.test(value);
        return isEmail || isPhone;
      },
      { message: 'Please provide a valid email or phone number' }
    ),
  password: z
    .string()
    .min(4, 'Password must contain at least 4 characters'),
  pushToken: z
    .string()
    .optional(),
});

/**
 * Register request validation schema
 */
export const registerSchema = z.object({
  email: z
    .string()
    .email('Please provide a valid email address')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  firstName: z
    .string()
    .min(2, 'First name must be between 2 and 50 characters')
    .max(50, 'First name must be between 2 and 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'First name can only contain letters and spaces')
    .trim(),
  lastName: z
    .string()
    .min(2, 'Last name must be between 2 and 50 characters')
    .max(50, 'Last name must be between 2 and 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Last name can only contain letters and spaces')
    .trim(),
  phoneNumber: z
    .string()
    .min(1, 'Phone number is required')
    .refine(
      (value) => {
        // Basic phone validation - detailed validation happens in service
        return /^\+?[0-9\s\-\(\)]{8,15}$/.test(value);
      },
      { message: 'Please provide a valid phone number' }
    ),
  userType: z
    .enum([USER_TYPES.TUTEUR, USER_TYPES.MEDECIN, USER_TYPES.PATIENT], {
      errorMap: () => ({ message: 'User type must be one of: tuteur, medecin, patient' }),
    }),
});

/**
 * Send verification code request validation schema
 */
export const sendVerificationCodeSchema = z.object({
  phoneNumber: z
    .string()
    .min(1, 'Phone number is required'),
});

/**
 * Verify code request validation schema
 */
export const verifyCodeSchema = z.object({
  phoneNumber: z
    .string()
    .min(1, 'Phone number is required'),
  code: z
    .string()
    .length(4, 'Verification code must be 4 digits')
    .regex(/^\d{4}$/, 'Verification code must be 4 digits'),
});

/**
 * Reset password request validation schema
 */
export const resetPasswordSchema = z.object({
  phoneNumber: z
    .string()
    .min(1, 'Phone number is required'),
  code: z
    .string()
    .length(4, 'Verification code must be 4 digits')
    .regex(/^\d{4}$/, 'Verification code must be 4 digits'),
  newPassword: z
    .string()
    .min(6, 'Password must be at least 6 characters long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
});

// Type exports
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type SendVerificationCodeInput = z.infer<typeof sendVerificationCodeSchema>;
export type VerifyCodeInput = z.infer<typeof verifyCodeSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;


