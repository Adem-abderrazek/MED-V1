import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from './api';

const STORAGE_KEYS = {
  REMINDERS: '@medication_reminders',
  LAST_SYNC: '@last_sync_time',
};

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
}

type StoredReminder = {
  notificationId: string;
  medicationName: string;
  dosage: string;
};


export async function downloadAndScheduleReminders(token: string): Promise<{ success: boolean; scheduled: number }> {
  try {
    console.log('🔄 Starting reminder sync...');

    const response = await apiService.getUpcomingReminders(token);
    const reminders = (response.data as LocalReminder[]) || [];

    console.log(`✅ Fetched ${reminders.length} upcoming reminders`);

    for (const reminder of reminders) {
      try {
        await scheduleReminder(reminder);
      } catch (error) {
        console.error(`❌ Error scheduling reminder ${reminder.reminderId}:`, error);
      }
    }

    await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());

    return { success: true, scheduled: reminders.length };
  } catch (error) {
    console.error('❌ Error downloading and scheduling reminders:', error);
    throw error;
  }
}


export async function scheduleReminder(reminder: LocalReminder): Promise<string> {
  const scheduledDate = new Date(reminder.scheduledFor);
  console.log(`⏰ Scheduling reminder for ${reminder.medicationName} at ${scheduledDate.toLocaleString()}`);

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
    await Notifications.cancelScheduledNotificationAsync(stored.notificationId);

    const snoozeTime = new Date(Date.now() + 10 * 60 * 1000);
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Rappel Médicament (Snooze)',
        body: `Rappel dans 10 minutes pour ${stored.medicationName}`,
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
};

export default localReminderServiceCompat;