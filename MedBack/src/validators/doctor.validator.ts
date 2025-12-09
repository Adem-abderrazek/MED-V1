/**
 * Doctor Validation Schemas
 * 
 * Zod schemas for validating doctor-related requests.
 */

import { z } from 'zod';

/**
 * Search patients query validation
 */
export const searchPatientsSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
});

/**
 * Create prescription validation
 */
export const createPrescriptionSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID'),
  medicationName: z.string().min(1, 'Medication name is required'),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  duration: z.number().optional(),
  instructions: z.string().optional(),
});

/**
 * Add patient medication validation
 */
export const addPatientMedicationSchema = z.object({
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
});

/**
 * Patient ID parameter validation
 */
export const patientIdParamSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID'),
});

// Type exports
export type SearchPatientsInput = z.infer<typeof searchPatientsSchema>;
export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;
export type AddPatientMedicationInput = z.infer<typeof addPatientMedicationSchema>;
export type PatientIdParamInput = z.infer<typeof patientIdParamSchema>;


