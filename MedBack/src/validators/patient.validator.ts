/**
 * Patient Validation Schemas
 * 
 * Zod schemas for validating patient-related requests.
 */

import { z } from 'zod';

/**
 * Get medications by date query validation
 */
export const getMedicationsByDateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
});

/**
 * Get next medications query validation
 */
export const getNextMedicationsSchema = z.object({
  limit: z.string().optional().transform((val) => val ? parseInt(val, 10) : 5),
});

/**
 * Get upcoming reminders query validation
 */
export const getUpcomingRemindersSchema = z.object({
  days: z.string().optional().transform((val) => val ? parseInt(val, 10) : 30),
  lastSync: z.string().optional().transform((val) => val ? new Date(val) : undefined),
});

/**
 * Check for updates query validation
 */
export const checkForUpdatesSchema = z.object({
  lastSync: z.string().optional().transform((val) => val ? new Date(val) : undefined),
});

/**
 * Confirm reminder request validation
 * Accepts either reminderIds (array) or reminderId (single string) for backwards compatibility
 * Empty arrays are allowed (no-op - nothing to confirm)
 */
export const confirmReminderSchema = z.union([
  z.object({
    reminderIds: z.array(z.string()).optional(), // Allow empty arrays and empty strings - will be filtered in controller
  }),
  z.object({
    reminderId: z.string().optional(), // Allow empty string - will be filtered in controller
  }),
]);

/**
 * Snooze reminder request validation
 */
export const snoozeReminderSchema = z.object({
  reminderId: z.string().min(1, 'Reminder ID is required'),
  snoozeDurationMinutes: z.number().int().min(1).max(60).optional().default(5),
});

/**
 * Mark message as read validation
 */
export const markMessageReadSchema = z.object({
  messageId: z.string().min(1, 'Message ID is required'),
});

/**
 * Update patient profile validation
 */
export const updatePatientProfileSchema = z.object({
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50).optional(),
  phoneNumber: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  medicalConditions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
});

/**
 * Get messages query validation
 */
export const getMessagesSchema = z.object({
  limit: z.string().optional().transform((val) => val ? parseInt(val, 10) : 50),
});

// Type exports
export type GetMedicationsByDateInput = z.infer<typeof getMedicationsByDateSchema>;
export type GetNextMedicationsInput = z.infer<typeof getNextMedicationsSchema>;
export type GetUpcomingRemindersInput = z.infer<typeof getUpcomingRemindersSchema>;
export type CheckForUpdatesInput = z.infer<typeof checkForUpdatesSchema>;
export type ConfirmReminderInput = z.infer<typeof confirmReminderSchema>;
export type SnoozeReminderInput = z.infer<typeof snoozeReminderSchema>;
export type MarkMessageReadInput = z.infer<typeof markMessageReadSchema>;
export type UpdatePatientProfileInput = z.infer<typeof updatePatientProfileSchema>;
export type GetMessagesInput = z.infer<typeof getMessagesSchema>;


