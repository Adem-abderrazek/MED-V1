/**
 * Centralized type definitions for the MediCare App
 */

// ========== User Types ==========
export type UserType = 'patient' | 'tuteur' | 'medecin';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: UserType;
  phoneNumber: string;
}

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  userType: string;
  notificationsEnabled: boolean;
  lastLogin?: string;
  createdAt: string;
  timezone?: string;
  language?: string;
}

// ========== Patient Types ==========
export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  lastVisit?: Date;
  medicationCount: number;
  age?: number;
  name?: string;
  createdAt?: Date;
  lastLogin?: Date | null;
  adherenceRate?: number;
  medications?: Array<{
    id: string;
    name: string;
    nextDue: string;
    status: 'taken' | 'missed' | 'pending';
  }>;
  lastActivity?: string;
}

// ========== Medication Types ==========
export interface Medication {
  id: string;
  medicationName: string;
  dosage: string;
  scheduledFor: string;
  status: 'pending' | 'taken' | 'missed' | 'scheduled';
  reminderId: string;
  prescriptionId: string;
}

export interface MedicationDetail {
  id: string;
  name: string;
  dosage?: string;
  frequency?: string;
  startDate?: Date;
  endDate?: Date;
  isActive: boolean;
  instructions?: string;
  customDosage?: string;
  form?: string;
  genericName?: string;
  description?: string;
  medication?: {
    id: string;
    name: string;
    dosage?: string;
    form?: string;
    genericName?: string;
    description?: string;
  };
  schedules?: PrescriptionSchedule[];
  isChronic?: boolean;
  scheduleType?: 'daily' | 'weekly' | 'interval' | 'monthly' | 'custom';
  intervalHours?: number;
}

export interface PrescriptionSchedule {
  time: string;
  days: number[];
}

export interface PrescriptionData {
  id?: string;
  medication?: MedicationDetail;
  customDosage?: string;
  instructions?: string;
  schedules?: PrescriptionSchedule[];
  isChronic?: boolean;
  scheduleType?: 'daily' | 'weekly' | 'interval' | 'monthly' | 'custom';
  intervalHours?: number;
  repeatWeeks?: number;
}

// ========== Voice Message Types ==========
export interface VoiceMessage {
  id: string;
  fileName: string;
  fileUrl: string;
  title?: string;
  durationSeconds: number;
  isActive: boolean;
  createdAt: string;
}

// ========== Reminder Types ==========
export interface LocalReminder {
  id: string;
  reminderId: string;
  prescriptionId: string;
  medicationName: string;
  dosage: string;
  instructions?: string;
  imageUrl?: string;
  scheduledFor: string;
  patientId: string;
  voiceUrl?: string | null;
  voiceFileName?: string | null;
  voiceTitle?: string | null;
  voiceDuration?: number;
}

// ========== API Types ==========
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: any[];
  token?: string;
  user?: User;
}

// ========== Dashboard Types ==========
export interface DashboardStats {
  totalMedicationsToday: number;
  takenToday: number;
  adherenceRate: number;
}

export interface DoctorDashboardStats {
  totalPatients: number;
  recentPatients: Patient[];
  upcomingAppointments: any[];
  medicationAlerts: any[];
}

// ========== Modal Types ==========
export interface FeedbackModalState {
  visible: boolean;
  type: 'success' | 'error' | 'confirm';
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

// ========== Offline Queue Types ==========
export interface QueuedAction {
  id: string;
  type: 'confirm' | 'snooze';
  reminderId: string;
  timestamp: string;
  synced?: boolean;
  retryCount: number;
}

// ========== Component Props Types ==========
export interface FeatureCard {
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  title: string;
  description: string;
  gradient: [string, string];
}





