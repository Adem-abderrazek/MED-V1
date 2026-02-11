import AsyncStorage from '@react-native-async-storage/async-storage';
import { unregisterPushToken } from '../services/api/auth';
import { notificationService } from '../services/notificationService';
import { clearAllProfileCaches } from './profileCache';

export async function performLogout(navigateToLogin: () => void): Promise<void> {
  let token: string | null = null;

  try {
    token = await AsyncStorage.getItem('userToken');
  } catch (error) {
    console.error('Failed to read auth token for logout:', error);
  }

  if (token) {
    try {
      await unregisterPushToken(token);
    } catch (error) {
      console.error('Failed to unregister push token:', error);
    }
  }

  try {
    const { default: localReminderService } = await import('../services/localReminderService');
    await localReminderService.clearAllLocalReminders();
  } catch (error) {
    console.error('Failed to clear local reminders:', error);
  }

  try {
    const { offlineQueueService } = await import('../services/offlineQueueService');
    await offlineQueueService.clearAll();
  } catch (error) {
    console.error('Failed to clear offline queue:', error);
  }

  try {
    const { alarmService } = await import('../services/alarmService');
    alarmService.removeAllListeners();
  } catch (error) {
    console.error('Failed to remove alarm listeners:', error);
  }

  try {
    await notificationService.cancelAllNotifications();
    await notificationService.dismissAllNotifications();
  } catch (error) {
    console.error('Failed to clear notifications:', error);
  }

  try {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userData');
    await clearAllProfileCaches();
  } catch (error) {
    console.error('Failed to clear auth storage:', error);
  } finally {
    navigateToLogin();
  }
}
