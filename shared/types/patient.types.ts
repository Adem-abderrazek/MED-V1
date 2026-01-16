/**
 * Patient-related types
 */

import { Medication, DashboardStats } from './index';

export interface PatientMedication extends Medication {
  // Extended medication type for patient dashboard
}

export interface PatientDashboardData {
  medications: PatientMedication[];
  stats: DashboardStats;
}

export interface DateItem {
  date: Date;
  dayName: string;
  dayNumber: number;
  monthName: string;
  isToday: boolean;
}





