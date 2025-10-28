import * as Notifications from 'expo-notifications';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import apiService from './api';
import voicePlayerService from './voicePlayerService';
import simpleAlarmService from './simpleAlarmService';

const STORAGE_KEYS = {
  REMINDERS: '@medication_reminders',
  LAST_SYNC: '@last_sync_time',
  VOICE_FILES: '@voice_files_map',
};

const VOICES_DIR = `${FileSystem.documentDirectory}voices/`;

export interface LocalReminder {
  id: string;
  reminderId: string;
  prescriptionId: string;
  medicationName: string;
  dosage: string;
  instructions?: string;
  imageUrl?: string;
  scheduledFor: string;
  voiceUrl?: string;
  voiceFileName?: string;
  voiceDuration?: number;
  localVoicePath?: string;
  notificationId?: string;
  patientId: string;
}

/**
 * Clean Reminder Service
 * Simplified version focused on full-screen alarms
 */
class CleanReminderService {
  
  /**
   * Schedule a medication reminder with full-screen alarm
   */
  async scheduleReminder(reminder: LocalReminder): Promise<string> {
    try {
      const scheduledDate = new Date(reminder.scheduledFor);
      console.log(`⏰ Scheduling reminder for ${reminder.medicationName} at ${scheduledDate.toLocaleString()}`);

      // Use simple alarm service for full-screen behavior
      const alarmId = await simpleAlarmService.scheduleFullScreenAlarm(
        reminder.reminderId,
        reminder.medicationName,
        reminder.dosage,
        scheduledDate,
        reminder.localVoicePath
      );

      console.log(`✅ Full-screen alarm scheduled: ${alarmId}`);
      return alarmId;

    } catch (error) {
      console.error('❌ Error scheduling reminder:', error);
      throw error;
    }
  }

  /**
   * Cancel a reminder
   */
  async cancelReminder(reminderId: string): Promise<void> {
    try {
      await simpleAlarmService.cancelAlarm(reminderId);
      console.log(`🗑️ Cancelled reminder: ${reminderId}`);
    } catch (error) {
      console.error('❌ Error cancelling reminder:', error);
    }
  }

  /**
   * Cancel all reminders
   */
  async cancelAllReminders(): Promise<void> {
    try {
      await simpleAlarmService.cancelAllAlarms();
      console.log('🗑️ Cancelled all reminders');
    } catch (error) {
      console.error('❌ Error cancelling all reminders:', error);
    }
  }

  /**
   * Check if service is available
   */
  isAvailable(): boolean {
    return simpleAlarmService.isAvailable();
  }
}

export default new CleanReminderService();
