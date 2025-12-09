/**
 * User Validators
 * 
 * Zod schemas for user profile operations.
 */

import { z } from 'zod';

/**
 * Update user profile validation schema
 */
export const updateUserProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  phoneNumber: z.string().optional(),
  notificationsEnabled: z.boolean().optional(),
  dateOfBirth: z.string().datetime().optional().or(z.date().optional()),
  address: z.string().max(500).optional(),
  emergencyContact: z.string().max(200).optional(),
  specialization: z.string().max(200).optional(),
  licenseNumber: z.string().max(100).optional(),
  department: z.string().max(200).optional(),
  bio: z.string().max(1000).optional(),
  profilePicture: z.string().url().optional(),
});


