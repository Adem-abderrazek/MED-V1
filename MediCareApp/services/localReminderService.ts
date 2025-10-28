import * as Notifications from 'expo-notifications';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import apiService from './api';
import voicePlayerService from './voicePlayerService';
import nativeAlarmService from './nativeAlarmService';
import aggressiveNotificationService from './aggressiveNotificationService';

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
 * Local Reminder Service
 * Manages offline medication reminders with full-screen alarms
 */
class LocalReminderService {
  
  /**
   * Download and schedule reminders from API
   */
  async downloadAndScheduleReminders(token: string): Promise<any> {
    try {
      console.log('🔄 Starting reminder sync...');

      // Get upcoming reminders from API
      const response = await apiService.getUpcomingReminders(token);
      const reminders = (response.data as LocalReminder[]) || [];
      
      console.log(`✅ Fetched ${reminders.length} upcoming reminders`);

      // Download voice files and schedule each reminder
      for (const reminder of reminders) {
        try {
          // Download voice file if available
          if (reminder.voiceUrl) {
            console.log(`🎤 Downloading voice file for ${reminder.medicationName}...`);
            reminder.localVoicePath = await this.downloadVoiceFile(reminder.voiceUrl, reminder.reminderId);
            console.log(`✅ Voice file downloaded: ${reminder.localVoicePath}`);
          } else {
            console.log(`⚠️ No voice file for ${reminder.medicationName}`);
          }
          
          await this.scheduleReminder(reminder);
        } catch (error) {
          console.error(`❌ Error scheduling reminder ${reminder.reminderId}:`, error);
        }
      }
      
      // Update last sync time
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
      
      return { success: true, scheduled: reminders.length };
      
    } catch (error) {
      console.error('❌ Error downloading and scheduling reminders:', error);
      throw error;
    }
  }

  /**
   * Download voice file from URL to local storage
   */
  async downloadVoiceFile(voiceUrl: string, reminderId: string): Promise<string> {
    try {
      console.log(`🎤 Downloading voice file: ${voiceUrl}`);
      
      // Ensure voices directory exists
      const voicesDirInfo = await FileSystem.getInfoAsync(VOICES_DIR);
      if (!voicesDirInfo.exists) {
        await FileSystem.makeDirectoryAsync(VOICES_DIR, { intermediates: true });
        console.log(`📁 Created voices directory: ${VOICES_DIR}`);
      }
      
      // Generate local filename
      const fileExtension = voiceUrl.split('.').pop() || 'mp3';
      const localFileName = `voice_${reminderId}.${fileExtension}`;
      const localFilePath = `${VOICES_DIR}${localFileName}`;
      
      // Check if file already exists
      const existingFile = await FileSystem.getInfoAsync(localFilePath);
      if (existingFile.exists) {
        console.log(`✅ Voice file already exists: ${localFilePath}`);
        return localFilePath;
      }
      
      // Download the file
      const downloadResult = await FileSystem.downloadAsync(voiceUrl, localFilePath);
      
      if (downloadResult.status === 200) {
        console.log(`✅ Voice file downloaded successfully: ${localFilePath}`);
        return localFilePath;
      } else {
        throw new Error(`Download failed with status: ${downloadResult.status}`);
      }
      
    } catch (error) {
      console.error(`❌ Error downloading voice file: ${voiceUrl}`, error);
      throw error;
    }
  }

  /**
   * Schedule a single reminder with full-screen alarm
   */
  async scheduleReminder(reminder: LocalReminder): Promise<string> {
    try {
      const scheduledDate = new Date(reminder.scheduledFor);
      console.log(`⏰ Scheduling reminder for ${reminder.medicationName} at ${scheduledDate.toLocaleString()}`);

      // Try native alarm service first, fallback to Expo notifications
      if (nativeAlarmService.isAvailable()) {
        console.log('🚨 Using NATIVE ALARM SERVICE for full-screen alarms');
        
        const alarmId = await nativeAlarmService.scheduleAlarm(
            reminder.reminderId,
            reminder.medicationName,
            reminder.dosage,
            scheduledDate,
            reminder.localVoicePath
          );
          
        console.log(`✅ Native full-screen alarm scheduled: ${alarmId}`);
        return alarmId;
      } else {
        console.log('⚠️ Native alarm not available, using ULTRA-AGGRESSIVE NOTIFICATIONS');
        
        // Use aggressive notification service for maximum visibility
        const alarmId = await aggressiveNotificationService.scheduleAggressiveAlarm(
          reminder.reminderId,
          reminder.medicationName,
          reminder.dosage,
          scheduledDate,
          reminder.localVoicePath
        );
        
        console.log(`✅ Ultra-aggressive alarm scheduled: ${alarmId}`);
        return alarmId;
      }

    } catch (error) {
      console.error('❌ Error scheduling reminder:', error);
      throw error;
    }
  }

  /**
   * Check for updates
   */
  async checkForUpdates(token: string): Promise<any> {
    try {
      console.log('🔄 Checking for updates...');
      
      // Get latest reminders from API
      const response = await apiService.getUpcomingReminders(token);
      const reminders = (response.data as LocalReminder[]) || [];
      
      console.log(`✅ Found ${reminders.length} reminders`);
      
      return { hasUpdates: reminders.length > 0, lastModified: new Date().toISOString() };
      
    } catch (error) {
      console.error('❌ Error checking for updates:', error);
      return { hasUpdates: false, lastModified: null };
    }
  }

  /**
   * Get last sync time
   */
  async getLastSyncTime(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    } catch (error) {
      console.error('❌ Error getting last sync time:', error);
      return null;
    }
  }

  /**
   * Confirm reminder locally
   */
  async confirmReminderLocally(reminderId: string): Promise<void> {
    try {
      console.log(`✅ Confirming reminder locally: ${reminderId}`);
      
      // Cancel the alarm (native or aggressive)
      if (nativeAlarmService.isAvailable()) {
        await nativeAlarmService.cancelAlarm(reminderId);
      } else {
        await aggressiveNotificationService.cancelAggressiveAlarm(reminderId);
      }
      
      // Store confirmation for later sync
      const confirmations = await AsyncStorage.getItem('@medication_confirmations') || '[]';
      const confirmationsList = JSON.parse(confirmations);
      confirmationsList.push({
        reminderId,
        confirmedAt: new Date().toISOString()
      });
      await AsyncStorage.setItem('@medication_confirmations', JSON.stringify(confirmationsList));
      
    } catch (error) {
      console.error('❌ Error confirming reminder locally:', error);
      throw error;
    }
  }

  /**
   * Snooze reminder locally
   */
  async snoozeReminderLocally(reminderId: string): Promise<void> {
    try {
      console.log(`⏰ Snoozing reminder locally: ${reminderId}`);
      
      // Cancel current alarm
      if (nativeAlarmService.isAvailable()) {
        await nativeAlarmService.cancelAlarm(reminderId);
      } else {
        await aggressiveNotificationService.cancelAggressiveAlarm(reminderId);
      }
      
      // Schedule snooze alarm (10 minutes from now)
      const snoozeTime = new Date(Date.now() + 10 * 60 * 1000);
      
      if (nativeAlarmService.isAvailable()) {
        await nativeAlarmService.scheduleAlarm(
          `${reminderId}_snooze`,
          'Médicament (Snooze)',
          'Rappel reporté',
          snoozeTime
        );
      } else {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🚨 RAPPEL MÉDICAMENT (Snooze)',
            body: '⏰ Rappel reporté - Il est temps de prendre votre médicament',
            data: { reminderId: `${reminderId}_snooze`, type: 'snooze' },
            priority: Notifications.AndroidNotificationPriority.MAX,
            sticky: true,
            autoDismiss: false,
          },
          trigger: { type: 'date', date: snoozeTime } as any,
        });
      }
      
    } catch (error) {
      console.error('❌ Error snoozing reminder locally:', error);
      throw error;
    }
  }

  /**
   * Clear all local reminders
   */
  async clearAllLocalReminders(): Promise<void> {
    try {
      console.log('🧹 Clearing all local reminders...');
      
      // Cancel all alarms
      if (nativeAlarmService.isAvailable()) {
        await nativeAlarmService.cancelAllAlarms();
      } else {
        await aggressiveNotificationService.cancelAggressiveAlarm('all');
      }
      
      // Clear storage
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.REMINDERS,
        STORAGE_KEYS.LAST_SYNC,
        STORAGE_KEYS.VOICE_FILES,
        '@medication_confirmations'
      ]);
      
      console.log('✅ All local reminders cleared');
      
    } catch (error) {
      console.error('❌ Error clearing local reminders:', error);
      throw error;
    }
  }

  /**
   * Get all scheduled notifications
   */
  async getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('❌ Error getting scheduled notifications:', error);
      return [];
    }
  }

  /**
   * Check if service is available
   */
  isAvailable(): boolean {
    return nativeAlarmService.isAvailable();
  }
}

export default new LocalReminderService();