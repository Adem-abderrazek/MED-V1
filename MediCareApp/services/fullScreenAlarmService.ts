import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Alert } from 'react-native';

/**
 * Full-Screen Alarm Service
 * Creates aggressive, full-screen alarm behavior using Expo notifications
 * and React Native Alert system for Islamic prayer app-style alarms
 */
class FullScreenAlarmService {
  
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

      // Create multiple aggressive notifications for full-screen effect
      const notifications = await this.createAggressiveNotifications(
        reminderId,
        medicationName,
        dosage,
        scheduledTime,
        voicePath
      );

      console.log(`✅ Scheduled ${notifications.length} aggressive notifications for full-screen alarm`);
      return reminderId;

    } catch (error) {
      console.error('❌ Error scheduling full-screen alarm:', error);
      throw error;
    }
  }

  /**
   * Create multiple aggressive notifications for full-screen effect
   */
  private async createAggressiveNotifications(
    reminderId: string,
    medicationName: string,
    dosage: string,
    scheduledTime: Date,
    voicePath?: string
  ): Promise<string[]> {
    const notificationIds: string[] = [];

    // 1. Primary full-screen notification
    const primaryId = await this.schedulePrimaryNotification(
      reminderId,
      medicationName,
      dosage,
      scheduledTime,
      voicePath
    );
    notificationIds.push(primaryId);

    // 2. Backup notification (1 second later)
    const backupId = await this.scheduleBackupNotification(
      `${reminderId}_backup`,
      medicationName,
      dosage,
      new Date(scheduledTime.getTime() + 1000),
      voicePath
    );
    notificationIds.push(backupId);

    // 3. Emergency notification (2 seconds later)
    const emergencyId = await this.scheduleEmergencyNotification(
      `${reminderId}_emergency`,
      medicationName,
      dosage,
      new Date(scheduledTime.getTime() + 2000),
      voicePath
    );
    notificationIds.push(emergencyId);

    return notificationIds;
  }

  /**
   * Schedule primary full-screen notification
   */
  private async schedulePrimaryNotification(
    reminderId: string,
    medicationName: string,
    dosage: string,
    scheduledTime: Date,
    voicePath?: string
  ): Promise<string> {
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
          fullScreenIntent: true,
          launchActivityFlags: [
            'FLAG_ACTIVITY_NEW_TASK',
            'FLAG_ACTIVITY_CLEAR_TOP',
            'FLAG_ACTIVITY_SINGLE_TOP',
            'FLAG_ACTIVITY_BROUGHT_TO_FRONT',
            'FLAG_ACTIVITY_RESET_TASK_IF_NEEDED'
          ]
        })
      },
      trigger: {
        date: scheduledTime,
        channelId: 'medication-alarms'
      }
    });

    console.log(`✅ Primary full-screen notification scheduled: ${notificationId}`);
    return notificationId;
  }

  /**
   * Schedule backup notification
   */
  private async scheduleBackupNotification(
    reminderId: string,
    medicationName: string,
    dosage: string,
    scheduledTime: Date,
    voicePath?: string
  ): Promise<string> {
    const notificationId = `backup_${reminderId}`;

    await Notifications.scheduleNotificationAsync({
      identifier: notificationId,
      content: {
        title: '⚠️ RAPPEL MÉDICAMENT (Backup)',
        subtitle: 'N\'oubliez pas votre médicament',
        body: `💊 ${medicationName}\n📋 ${dosage}`,
        data: {
          reminderId,
          medicationName,
          dosage,
          voicePath,
          alarmType: 'backup',
          priority: 'high'
        },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        vibrate: [0, 500, 500, 500],
        categoryIdentifier: 'MEDICATION_BACKUP',
        sticky: true,
        autoDismiss: false,
        ...(Platform.OS === 'android' && {
          channelId: 'medication-backup',
          color: '#FF9800',
          lights: true,
          lightColor: '#FF9800',
          showTimestamp: true,
          localOnly: false,
          ongoing: true,
          silent: false,
          fullScreenIntent: true
        })
      },
      trigger: {
        date: scheduledTime,
        channelId: 'medication-backup'
      }
    });

    console.log(`✅ Backup notification scheduled: ${notificationId}`);
    return notificationId;
  }

  /**
   * Schedule emergency notification
   */
  private async scheduleEmergencyNotification(
    reminderId: string,
    medicationName: string,
    dosage: string,
    scheduledTime: Date,
    voicePath?: string
  ): Promise<string> {
    const notificationId = `emergency_${reminderId}`;

    await Notifications.scheduleNotificationAsync({
      identifier: notificationId,
      content: {
        title: '🚨 URGENCE MÉDICAMENT',
        subtitle: 'Action requise immédiatement',
        body: `💊 ${medicationName}\n📋 ${dosage}\n\n🔊 CONFIRMEZ MAINTENANT`,
        data: {
          reminderId,
          medicationName,
          dosage,
          voicePath,
          alarmType: 'emergency',
          priority: 'critical'
        },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 1000, 1000, 1000],
        categoryIdentifier: 'MEDICATION_EMERGENCY',
        sticky: true,
        autoDismiss: false,
        ...(Platform.OS === 'android' && {
          channelId: 'medication-emergency',
          color: '#FF0000',
          lights: true,
          lightColor: '#FF0000',
          showTimestamp: true,
          localOnly: false,
          ongoing: true,
          silent: false,
          fullScreenIntent: true
        })
      },
      trigger: {
        date: scheduledTime,
        channelId: 'medication-emergency'
      }
    });

    console.log(`✅ Emergency notification scheduled: ${notificationId}`);
    return notificationId;
  }

  /**
   * Cancel all alarms for a reminder
   */
  async cancelAlarm(reminderId: string): Promise<void> {
    try {
      const notifications = [
        `alarm_${reminderId}`,
        `backup_${reminderId}`,
        `emergency_${reminderId}`
      ];

      for (const notificationId of notifications) {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
      }

      console.log(`🗑️ Cancelled all full-screen alarms for: ${reminderId}`);
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

export default new FullScreenAlarmService();
