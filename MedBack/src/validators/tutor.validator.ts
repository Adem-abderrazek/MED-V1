/**
 * Tutor Validation Schemas
 * 
 * Zod schemas for validating tutor-related requests.
 */

import { z } from 'zod';

/**
 * Send patient invitation validation
 */
export const sendPatientInvitationSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phoneNumber: z.string().min(1, 'Phone number is required'),
  audioMessage: z.string().optional(),
  audioDuration: z.number().optional(),
});

/**
 * Confirm medication manually validation
 */
export const confirmMedicationManuallySchema = z.object({
  reminderId: z.string().uuid('Invalid reminder ID'),
});

/**
 * Search patients query validation
 */
export const tutorSearchPatientsSchema = z.object({
  q: z.string().min(1, 'Search query is required'),
});

/**
 * Get patient adherence history query validation
 */
export const getAdherenceHistorySchema = z.object({
  days: z.string().optional().transform((val) => val ? parseInt(val, 10) : 30),
});

/**
 * Create prescription for patient validation
 */
export const createPrescriptionForPatientSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID'),
  medicationName: z.string().min(1, 'Medication name is required'),
  medicationGenericName: z.string().optional(),
  medicationDosage: z.string().optional(),
  medicationForm: z.string().optional(),
  medicationDescription: z.string().optional(),
  medicationImageUrl: z.string().url().optional(),
  customDosage: z.string().optional(),
  instructions: z.string().optional(),
  schedules: z.array(z.object({
    scheduledTime: z.string().datetime(),
    daysOfWeek: z.array(z.number().int().min(1).max(7)),
  })).min(1, 'At least one schedule is required'),
  isChronic: z.boolean().optional().default(false),
  endDate: z.string().datetime().optional(),
  scheduleType: z.enum(['daily', 'weekly', 'interval', 'monthly', 'custom']).optional(),
  intervalHours: z.number().int().positive().optional(),
});

/**
 * Update prescription validation
 */
export const updatePrescriptionSchema = z.object({
  medicationName: z.string().min(1).optional(),
  medicationGenericName: z.string().optional(),
  medicationDosage: z.string().optional(),
  medicationForm: z.string().optional(),
  medicationDescription: z.string().optional(),
  medicationImageUrl: z.string().url().optional(),
  customDosage: z.string().optional(),
  instructions: z.string().optional(),
  schedules: z.array(z.object({
    scheduledTime: z.string().datetime(),
    daysOfWeek: z.array(z.number().int().min(1).max(7)),
  })).optional(),
  voiceMessageId: z.string().uuid().optional(),
  isChronic: z.boolean().optional(),
  endDate: z.string().datetime().optional(),
  scheduleType: z.enum(['daily', 'weekly', 'interval', 'monthly', 'custom']).optional(),
  intervalHours: z.number().int().positive().optional(),
});

/**
 * Upload voice message validation
 */
export const uploadVoiceMessageSchema = z.object({
  fileBase64: z.string().min(1, 'fileBase64 is required'),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
});

/**
 * Create voice message validation
 */
export const createVoiceMessageSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID'),
  fileUrl: z.string().url('Invalid file URL'),
  fileName: z.string().optional(),
  title: z.string().optional(),
  durationSeconds: z.number().int().positive().optional(),
});

/**
 * Generate reminders for next days validation
 */
export const generateRemindersForNextDaysSchema = z.object({
  days: z.number().int().min(1).max(365).default(7),
});

/**
 * Get voice messages query validation
 */
export const getVoiceMessagesSchema = z.object({
  patientId: z.string().uuid().optional(),
});

/**
 * Prescription ID parameter validation
 */
export const prescriptionIdParamSchema = z.object({
  prescriptionId: z.string().uuid('Invalid prescription ID'),
});

/**
 * Patient ID parameter validation (for tutor routes)
 */
export const tutorPatientIdParamSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID'),
});

/**
 * Voice message ID parameter validation
 */
export const voiceMessageIdParamSchema = z.object({
  id: z.string().uuid('Invalid voice message ID'),
});

// Type exports
export type SendPatientInvitationInput = z.infer<typeof sendPatientInvitationSchema>;
export type ConfirmMedicationManuallyInput = z.infer<typeof confirmMedicationManuallySchema>;
export type TutorSearchPatientsInput = z.infer<typeof tutorSearchPatientsSchema>;
export type GetAdherenceHistoryInput = z.infer<typeof getAdherenceHistorySchema>;
export type CreatePrescriptionForPatientInput = z.infer<typeof createPrescriptionForPatientSchema>;
export type UpdatePrescriptionInput = z.infer<typeof updatePrescriptionSchema>;
export type UploadVoiceMessageInput = z.infer<typeof uploadVoiceMessageSchema>;
export type CreateVoiceMessageInput = z.infer<typeof createVoiceMessageSchema>;
export type GenerateRemindersForNextDaysInput = z.infer<typeof generateRemindersForNextDaysSchema>;
export type GetVoiceMessagesInput = z.infer<typeof getVoiceMessagesSchema>;
export type PrescriptionIdParamInput = z.infer<typeof prescriptionIdParamSchema>;
export type TutorPatientIdParamInput = z.infer<typeof tutorPatientIdParamSchema>;
export type VoiceMessageIdParamInput = z.infer<typeof voiceMessageIdParamSchema>;


