/**
 * Medication and prescription-related types
 */

import { PrescriptionData, PrescriptionSchedule, VoiceMessage } from './index';

export interface MedicationOption {
  id: string;
  name: string;
  genericName?: string;
  dosage?: string;
  form?: string;
  description?: string;
}

export interface PrescriptionFormData extends PrescriptionData {
  // Extended form data
}

export interface ScheduleConfig {
  scheduleType: 'daily' | 'weekly' | 'interval' | 'monthly' | 'custom';
  schedules?: PrescriptionSchedule[];
  intervalHours?: number;
  repeatWeeks?: number;
}





