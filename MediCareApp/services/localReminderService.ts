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
  prescriptionId?: string;
  patientId?: string;
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

    // Convert relative URL to absolute URL if needed
    let downloadUrl = reminder.voiceUrl;
    if (downloadUrl.startsWith('/')) {
      // Relative URL - prepend base URL
      const { getApiConfig } = await import('../config/api');
      const apiConfig = getApiConfig();
      // Remove /api from base URL and add the relative path
      const baseUrl = apiConfig.BASE_URL.replace('/api', '');
      downloadUrl = `${baseUrl}${reminder.voiceUrl}`;
    } else if (!downloadUrl.startsWith('http://') && !downloadUrl.startsWith('https://')) {
      // Not a valid URL - try to construct it
      const { getApiConfig } = await import('../config/api');
      const apiConfig = getApiConfig();
      const baseUrl = apiConfig.BASE_URL.replace('/api', '');
      downloadUrl = `${baseUrl}${reminder.voiceUrl.startsWith('/') ? '' : '/'}${reminder.voiceUrl}`;
    }

    console.log(`⬇️ Downloading voice for ${reminder.medicationName}...`);
    console.log(`   Original URL: ${reminder.voiceUrl}`);
    console.log(`   Download URL: ${downloadUrl}`);
    console.log(`   Local: ${localPath}`);

    const downloadResult = await FileSystem.downloadAsync(downloadUrl, localPath);

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

      // Ensure prescriptionId is always saved for proper audio retrieval on snooze
      if (!reminder.prescriptionId) {
        console.warn(`⚠️ Warning: prescriptionId is missing for reminder ${reminder.reminderId}`);
      }
      
      await saveReminder(reminder.reminderId, {
        notificationId: reminder.reminderId,
        medicationName: reminder.medicationName,
        dosage: reminder.dosage,
        prescriptionId: reminder.prescriptionId, // ✅ Always save prescriptionId
        patientId: reminder.patientId,
      });

      console.log(`✅ Reminder scheduled via native alarm: ${result.alarmId} (prescriptionId: ${reminder.prescriptionId || 'missing'})`);
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

  // Ensure prescriptionId is always saved for proper audio retrieval on snooze
  if (!reminder.prescriptionId) {
    console.warn(`⚠️ Warning: prescriptionId is missing for reminder ${reminder.reminderId}`);
  }
  
  await saveReminder(reminder.reminderId, {
    notificationId,
    medicationName: reminder.medicationName,
    dosage: reminder.dosage,
    prescriptionId: reminder.prescriptionId, // ✅ Always save prescriptionId
    patientId: reminder.patientId,
  });

  console.log(`✅ Reminder scheduled via Expo notifications, ID: ${notificationId} (prescriptionId: ${reminder.prescriptionId || 'missing'})`);
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

    // Get reminders from server
    const response = await apiService.getUpcomingReminders(token);
    const serverReminders = (response.data as LocalReminder[]) || [];
    console.log(`📥 Server has ${serverReminders.length} reminders`);

    // Get locally stored reminders
    const localReminders = await loadReminders();
    const localReminderIds = new Set(Object.keys(localReminders));
    console.log(`💾 Local storage has ${localReminderIds.size} reminders`);

    // Create a map of server reminders by reminderId for easy lookup
    const serverReminderMap = new Map<string, LocalReminder>();
    serverReminders.forEach(reminder => {
      serverReminderMap.set(reminder.reminderId, reminder);
    });

    const serverReminderIds = new Set(serverReminders.map(r => r.reminderId));

    // Check for new reminders (in server but not in local)
    const newReminders = serverReminders.filter(r => !localReminderIds.has(r.reminderId));
    
    // Check for deleted reminders (in local but not in server)
    const deletedReminders = Array.from(localReminderIds).filter(id => !serverReminderIds.has(id));
    
    // Check for changed reminders (same ID but different key data)
    const changedReminders: LocalReminder[] = [];
    serverReminders.forEach(serverReminder => {
      if (localReminderIds.has(serverReminder.reminderId)) {
        const localReminder = localReminders[serverReminder.reminderId];
        // Compare key fields that would indicate a change
        if (
          localReminder.medicationName !== serverReminder.medicationName ||
          localReminder.dosage !== serverReminder.dosage ||
          localReminder.prescriptionId !== serverReminder.prescriptionId
        ) {
          changedReminders.push(serverReminder);
        }
      }
    });

    const hasUpdates = newReminders.length > 0 || deletedReminders.length > 0 || changedReminders.length > 0;

    if (hasUpdates) {
      console.log(`⚠️ Updates detected: ${newReminders.length} new, ${deletedReminders.length} deleted, ${changedReminders.length} changed`);
    } else {
      console.log('✅ No updates - local and server reminders match');
    }

    return { 
      hasUpdates, 
      lastModified: hasUpdates ? new Date().toISOString() : null 
    };
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
        
        // Get the audio path for this reminder (voice message from doctor)
        // Try to get prescriptionId from stored reminder
        let prescriptionId = stored.prescriptionId;
        
        if (!prescriptionId) {
          console.warn(`⚠️ PrescriptionId missing for reminder ${reminderId}, attempting to find from voice messages...`);
          // Try to find prescriptionId by checking all voice messages
          // This is a fallback in case prescriptionId wasn't saved properly
          try {
            const voiceMessagesStr = await AsyncStorage.getItem(STORAGE_KEYS.VOICE_MESSAGES);
            if (voiceMessagesStr) {
              const voiceMessages = JSON.parse(voiceMessagesStr);
              // Try to find a matching prescriptionId by checking reminder patterns
              // This is not ideal but better than no audio
              for (const [prescId, path] of Object.entries(voiceMessages)) {
                // If we can't match, we'll just try the first one as last resort
                // Better approach: ensure prescriptionId is always saved
                if (Object.keys(voiceMessages).length === 1) {
                  prescriptionId = prescId;
                  console.log(`🔍 Found prescriptionId from voice messages: ${prescriptionId}`);
                  break;
                }
              }
            }
          } catch (error) {
            console.error('Error trying to find prescriptionId from voice messages:', error);
          }
        }
        
        const audioPath = await getVoiceMessagePath(prescriptionId || '');
        
        if (audioPath) {
          console.log(`🎵 Snooze audio path found: ${audioPath}`);
        } else {
          console.warn(`⚠️ No audio path found for snooze (prescriptionId: ${prescriptionId || 'missing'})`);
        }
        
        await alarmService.scheduleAlarm({
          alarmId: snoozeAlarmId,
          triggerTime: snoozeTime,
          medicationName: stored.medicationName,
          dosage: stored.dosage,
          instructions: stored.instructions || 'Rappel (Snooze)',
          reminderId: reminderId, // Keep original reminder ID for confirmation
          patientId: stored.patientId || '',
          audioPath: audioPath, // ✅ Include audio path for snooze (may be null, AlarmService will handle fallback)
        });

        reminders[reminderId] = {
          notificationId: snoozeAlarmId,
          medicationName: stored.medicationName,
          dosage: stored.dosage,
          prescriptionId: stored.prescriptionId,
          patientId: stored.patientId,
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
      prescriptionId: stored.prescriptionId,
      patientId: stored.patientId,
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