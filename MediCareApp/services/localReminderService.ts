import * as Notifications from 'expo-notifications';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import apiService from './api';
import { alarmService } from './alarmService';

const STORAGE_KEYS = {
  REMINDERS: '@medication_reminders',
  LAST_SYNC: '@last_sync_time',
  VOICE_MESSAGES: '@voice_messages',
};

// Directory for storing voice messages locally
const VOICE_MESSAGES_DIR = `${FileSystem.documentDirectory}voice-messages/`;

// Use native alarm service for Android full-screen alarms
const useNativeAlarms = Platform.OS === 'android' && alarmService.isAvailable();

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
  // Voice message fields from backend
  voiceUrl?: string | null;
  voiceFileName?: string | null;
  voiceTitle?: string | null;
  voiceDuration?: number;
}

type StoredReminder = {
  notificationId: string;
  medicationName: string;
  dosage: string;
};


// Ensure voice messages directory exists
async function ensureVoiceMessagesDir(): Promise<void> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(VOICE_MESSAGES_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(VOICE_MESSAGES_DIR, { intermediates: true });
      console.log('📁 Created voice messages directory');
    }
  } catch (error) {
    console.error('Error creating voice messages directory:', error);
  }
}

// Download voice message audio file for offline use
async function downloadVoiceMessage(reminder: LocalReminder): Promise<string | null> {
  if (!reminder.voiceUrl) {
    console.log(`ℹ️ No voice URL for ${reminder.medicationName}`);
    return null;
  }

  try {
    await ensureVoiceMessagesDir();

    // Create unique filename based on prescription ID
    const extension = reminder.voiceFileName?.split('.').pop() || 'm4a';
    const localFileName = `${reminder.prescriptionId}.${extension}`;
    const localPath = `${VOICE_MESSAGES_DIR}${localFileName}`;

    // Check if already downloaded
    const fileInfo = await FileSystem.getInfoAsync(localPath);
    if (fileInfo.exists) {
      console.log(`✅ Voice already cached: ${localFileName}`);
      return localPath;
    }

    console.log(`⬇️ Downloading voice for ${reminder.medicationName}...`);
    console.log(`   URL: ${reminder.voiceUrl}`);
    console.log(`   Local: ${localPath}`);

    const downloadResult = await FileSystem.downloadAsync(reminder.voiceUrl, localPath);

    if (downloadResult.status === 200) {
      console.log(`✅ Voice downloaded: ${localFileName}`);
      // Save the local path for this prescription
      await saveVoiceMessagePath(reminder.prescriptionId, localPath);
      return localPath;
    } else {
      console.error(`❌ Failed to download voice: HTTP ${downloadResult.status}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error downloading voice for ${reminder.medicationName}:`, error);
    return null;
  }
}

export async function downloadAndScheduleReminders(token: string): Promise<{ success: boolean; scheduled: number; audioDownloaded: number }> {
  try {
    console.log('🔄 Starting reminder sync...');

    const response = await apiService.getUpcomingReminders(token);
    const reminders = (response.data as LocalReminder[]) || [];

    console.log(`✅ Fetched ${reminders.length} upcoming reminders`);

    let audioDownloaded = 0;

    for (const reminder of reminders) {
      try {
        // First, download voice message if available
        if (reminder.voiceUrl) {
          const localAudioPath = await downloadVoiceMessage(reminder);
          if (localAudioPath) {
            audioDownloaded++;
          }
        }

        // Then schedule the reminder
        await scheduleReminder(reminder);
      } catch (error) {
        console.error(`❌ Error scheduling reminder ${reminder.reminderId}:`, error);
      }
    }

    await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());

    console.log(`📊 Sync complete: ${reminders.length} reminders, ${audioDownloaded} audio files`);

    return { success: true, scheduled: reminders.length, audioDownloaded };
  } catch (error) {
    console.error('❌ Error downloading and scheduling reminders:', error);
    throw error;
  }
}


export async function scheduleReminder(reminder: LocalReminder): Promise<string> {
  const scheduledDate = new Date(reminder.scheduledFor);
  console.log(`⏰ Scheduling reminder for ${reminder.medicationName} at ${scheduledDate.toLocaleString()}`);

  // On Android, use native alarm service for full-screen alarm
  if (useNativeAlarms) {
    try {
      // Get the audio path for this reminder (voice message from doctor)
      const audioPath = await getVoiceMessagePath(reminder.prescriptionId);
      if (audioPath) {
        console.log(`🎵 Voice message found for ${reminder.medicationName}: ${audioPath}`);
      }

      const result = await alarmService.scheduleAlarm({
        alarmId: reminder.reminderId,
        triggerTime: scheduledDate,
        medicationName: reminder.medicationName,
        dosage: reminder.dosage,
        instructions: reminder.instructions || '',
        reminderId: reminder.reminderId,
        patientId: reminder.patientId,
        audioPath: audioPath,
      });

      await saveReminder(reminder.reminderId, {
        notificationId: reminder.reminderId,
        medicationName: reminder.medicationName,
        dosage: reminder.dosage,
      });

      console.log(`✅ Reminder scheduled via native alarm: ${result.alarmId}`);
      return result.alarmId;
    } catch (error) {
      console.error('❌ Failed to schedule native alarm, falling back to expo-notifications:', error);
      // Fall through to notification-based scheduling
    }
  }

  // Fallback: Use expo-notifications (iOS or if notifee fails)
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: `💊 ${reminder.medicationName}`,
      body: `Il est temps de prendre: ${reminder.dosage}`,
      data: {
        type: 'medication_reminder',
        reminderId: reminder.reminderId,
        medicationName: reminder.medicationName,
        dosage: reminder.dosage,
        patientId: reminder.patientId,
        reminderTime: reminder.scheduledFor,
      },
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    trigger: { type: 'date', date: scheduledDate } as any,
  });

  await saveReminder(reminder.reminderId, {
    notificationId,
    medicationName: reminder.medicationName,
    dosage: reminder.dosage,
  });

  console.log(`✅ Reminder scheduled via Expo notifications, ID: ${notificationId}`);
  return notificationId;
}

// Helper function to get voice message path for a prescription
async function getVoiceMessagePath(prescriptionId: string): Promise<string | null> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.VOICE_MESSAGES);
    if (stored) {
      const voiceMessages = JSON.parse(stored);
      return voiceMessages[prescriptionId] || null;
    }
    return null;
  } catch (error) {
    console.error('Error getting voice message path:', error);
    return null;
  }
}

// Save voice message path for a prescription
export async function saveVoiceMessagePath(prescriptionId: string, localPath: string): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.VOICE_MESSAGES);
    const voiceMessages = stored ? JSON.parse(stored) : {};
    voiceMessages[prescriptionId] = localPath;
    await AsyncStorage.setItem(STORAGE_KEYS.VOICE_MESSAGES, JSON.stringify(voiceMessages));
    console.log(`✅ Voice message path saved for prescription ${prescriptionId}`);
  } catch (error) {
    console.error('Error saving voice message path:', error);
  }
}


export async function checkForUpdates(token: string): Promise<{ hasUpdates: boolean; lastModified: string | null }> {
  try {
    console.log('🔄 Checking for updates...');

    const response = await apiService.getUpcomingReminders(token);
    const reminders = (response.data as LocalReminder[]) || [];

    console.log(`✅ Found ${reminders.length} reminders`);

    return { hasUpdates: reminders.length > 0, lastModified: new Date().toISOString() };
  } catch (error) {
    console.error('❌ Error checking for updates:', error);
    return { hasUpdates: false, lastModified: null };
  }
}


export async function getLastSyncTime(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
  } catch (error) {
    console.error('❌ Error getting last sync time:', error);
    return null;
  }
}

export async function confirmReminderLocally(reminderId: string): Promise<void> {
  console.log(`✅ Confirming reminder locally: ${reminderId}`);

  const reminders = await loadReminders();
  const stored = reminders[reminderId];

  if (stored) {
    // Cancel the alarm/notification
    if (useNativeAlarms) {
      try {
        await alarmService.cancelAlarm(reminderId);
      } catch (error) {
        console.error('Error cancelling native alarm:', error);
      }
    }
    await Notifications.cancelScheduledNotificationAsync(stored.notificationId);
    delete reminders[reminderId];
    await persistReminders(reminders);
  }

  const confirmations = await AsyncStorage.getItem('@medication_confirmations').then(value => value || '[]');
  const list = JSON.parse(confirmations);
  list.push({
    reminderId,
    confirmedAt: new Date().toISOString(),
  });
  await AsyncStorage.setItem('@medication_confirmations', JSON.stringify(list));
}


export async function snoozeReminderLocally(reminderId: string): Promise<void> {
  console.log(`⏰ Snoozing reminder locally: ${reminderId}`);

  const reminders = await loadReminders();
  const stored = reminders[reminderId];

  if (stored) {
    // Cancel current alarm/notification
    if (useNativeAlarms) {
      try {
        await alarmService.cancelAlarm(reminderId);
      } catch (error) {
        console.error('Error cancelling native alarm:', error);
      }
    }
    await Notifications.cancelScheduledNotificationAsync(stored.notificationId);

    // Schedule snooze for 5 minutes
    const snoozeTime = new Date(Date.now() + 5 * 60 * 1000);

    if (useNativeAlarms) {
      try {
        const snoozeAlarmId = `${reminderId}_snooze_${Date.now()}`;
        await alarmService.scheduleAlarm({
          alarmId: snoozeAlarmId,
          triggerTime: snoozeTime,
          medicationName: stored.medicationName,
          dosage: stored.dosage,
          instructions: 'Rappel (Snooze)',
          reminderId: reminderId,
          patientId: '',
        });

        reminders[reminderId] = {
          notificationId: snoozeAlarmId,
          medicationName: stored.medicationName,
          dosage: stored.dosage,
        };

        await persistReminders(reminders);
        console.log(`✅ Snooze alarm scheduled for 5 minutes`);
        return;
      } catch (error) {
        console.error('Error scheduling snooze alarm, falling back to notification:', error);
      }
    }

    // Fallback: Use expo-notifications
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Rappel Médicament (Snooze)',
        body: `Rappel dans 5 minutes pour ${stored.medicationName}`,
        data: {
          type: 'medication_reminder',
          reminderId,
          medicationName: stored.medicationName,
          dosage: stored.dosage,
          reminderTime: snoozeTime.toISOString(),
        },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: { type: 'date', date: snoozeTime } as any,
    });

    reminders[reminderId] = {
      notificationId,
      medicationName: stored.medicationName,
      dosage: stored.dosage,
    };

    await persistReminders(reminders);
  }
}


export async function clearAllLocalReminders(): Promise<void> {
  console.log('🧹 Clearing all local reminders...');

  await Notifications.cancelAllScheduledNotificationsAsync();
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.REMINDERS,
    STORAGE_KEYS.LAST_SYNC,
    '@medication_confirmations',
  ]);

  console.log('✅ All local reminders cleared');
}


export async function getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('❌ Error getting scheduled notifications:', error);
    return [];
  }
}


export function isAvailable(): boolean {
  return true;
}



async function loadReminders(): Promise<Record<string, StoredReminder>> {
  const stored = await AsyncStorage.getItem(STORAGE_KEYS.REMINDERS);
  if (!stored) {
    return {};
  }

  try {
    return JSON.parse(stored) as Record<string, StoredReminder>;
  } catch (error) {
    console.warn('⚠️ Failed to parse stored reminders, resetting state', error);
    return {};
  }
}

async function persistReminders(reminders: Record<string, StoredReminder>): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(reminders));
}

async function saveReminder(reminderId: string, reminder: StoredReminder): Promise<void> {
  const reminders = await loadReminders();
  reminders[reminderId] = reminder;
  await persistReminders(reminders);
}


const localReminderServiceCompat = {
  downloadAndScheduleReminders,
  scheduleReminder,
  checkForUpdates,
  getLastSyncTime,
  confirmReminderLocally,
  snoozeReminderLocally,
  clearAllLocalReminders,
  getAllScheduledNotifications,
  isAvailable,
  saveVoiceMessagePath,
};

export default localReminderServiceCompat;