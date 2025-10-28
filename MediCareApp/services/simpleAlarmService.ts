import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Simple Full-Screen Alarm Service
 * Creates aggressive notifications for lock screen and background behavior
 */
class SimpleAlarmService {
  
  /**
   * Schedule a full-screen alarm
   */
  async scheduleFullScreenAlarm(
    reminderId: string,
    medicationName: string,
    dosage: string,
    scheduledTime: Date,
    voicePath?: string
  ): Promise<string> {
    try {
      console.log('🚨 Scheduling FULL-SCREEN alarm:', {
        reminderId,
        medicationName,
        scheduledTime: scheduledTime.toISOString()
      });

      // Create aggressive notification for full-screen effect
      const notificationId = `alarm_${reminderId}`;

      await Notifications.scheduleNotificationAsync({
        identifier: notificationId,
        content: {
          title: '🚨 RAPPEL MÉDICAMENT URGENT',
          subtitle: '⏰ Il est temps de prendre votre médicament',
          body: `💊 ${medicationName}\n📋 ${dosage}\n\n🔊 Appuyez pour confirmer`,
          data: {
            reminderId,
            medicationName,
            dosage,
            voicePath,
            alarmType: 'fullscreen',
            priority: 'critical'
          },
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 250, 250, 250],
          categoryIdentifier: 'MEDICATION_ALARM',
          sticky: true,
          autoDismiss: false,
          ...(Platform.OS === 'android' && {
            channelId: 'medication-alarms',
            color: '#FF4444',
            lights: true,
            lightColor: '#FF4444',
            showTimestamp: true,
            localOnly: false,
            ongoing: true,
            silent: false,
            fullScreenIntent: true
          })
        },
        trigger: {
          date: scheduledTime
        }
      });

      console.log(`✅ Full-screen alarm scheduled: ${notificationId}`);
      return notificationId;

    } catch (error) {
      console.error('❌ Error scheduling full-screen alarm:', error);
      throw error;
    }
  }

  /**
   * Cancel alarm
   */
  async cancelAlarm(reminderId: string): Promise<void> {
    try {
      const notificationId = `alarm_${reminderId}`;
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log(`🗑️ Cancelled full-screen alarm: ${notificationId}`);
    } catch (error) {
      console.error('❌ Error cancelling full-screen alarm:', error);
    }
  }

  /**
   * Cancel all alarms
   */
  async cancelAllAlarms(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('🗑️ Cancelled all full-screen alarms');
    } catch (error) {
      console.error('❌ Error cancelling all full-screen alarms:', error);
    }
  }

  /**
   * Check if service is available
   */
  isAvailable(): boolean {
    return true; // Always available with Expo notifications
  }
}

export default new SimpleAlarmService();
