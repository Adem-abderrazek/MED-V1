import notifee, {
  AndroidImportance,
  AndroidVisibility,
  AndroidCategory,
  TriggerType,
  TimestampTrigger,
  EventType,
  Event,
} from '@notifee/react-native';
import { Platform, Linking } from 'react-native';

const ALARM_CHANNEL_ID = 'medication-alarm';

/**
 * Notifee-based Alarm Service for Android full-screen notifications
 * This provides proper alarm-style notifications that show on lock screen
 */
class NotifeeAlarmService {
  private initialized = false;

  /**
   * Check if notifee is available (Android only for alarms)
   */
  isAvailable(): boolean {
    return Platform.OS === 'android';
  }

  /**
   * Initialize the alarm channel with full-screen intent support
   */
  async initialize(): Promise<void> {
    if (!this.isAvailable() || this.initialized) return;

    try {
      // Create a high-priority alarm channel
      await notifee.createChannel({
        id: ALARM_CHANNEL_ID,
        name: 'Alarme Médicaments',
        description: 'Alarmes pour rappels de médicaments - affichage plein écran',
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        sound: 'default',
        vibration: true,
        vibrationPattern: [300, 1000, 500, 1000, 500, 1000],
        lights: true,
        lightColor: '#10B981',
        bypassDnd: true,
      });

      this.initialized = true;
      console.log('✅ Notifee alarm channel created');
    } catch (error) {
      console.error('❌ Failed to create notifee channel:', error);
    }
  }

  /**
   * Schedule a medication alarm with full-screen intent
   */
  async scheduleAlarm(params: {
    alarmId: string;
    triggerTime: Date;
    medicationName: string;
    dosage: string;
    instructions?: string;
    reminderId: string;
    patientId: string;
    audioPath?: string | null;
  }): Promise<{ success: boolean; alarmId: string }> {
    if (!this.isAvailable()) {
      return { success: false, alarmId: params.alarmId };
    }

    await this.initialize();

    try {
      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: params.triggerTime.getTime(),
        alarmManager: {
          allowWhileIdle: true,
        },
      };

      await notifee.createTriggerNotification(
        {
          id: params.alarmId,
          title: `💊 ${params.medicationName}`,
          body: params.instructions
            ? `${params.dosage} - ${params.instructions}`
            : `Il est temps de prendre: ${params.dosage}`,
          android: {
            channelId: ALARM_CHANNEL_ID,
            importance: AndroidImportance.HIGH,
            category: AndroidCategory.ALARM,
            visibility: AndroidVisibility.PUBLIC,
            fullScreenAction: {
              id: 'default',
              launchActivity: 'default',
            },
            pressAction: {
              id: 'default',
              launchActivity: 'default',
            },
            actions: [
              {
                title: '✅ Pris',
                pressAction: { id: 'confirm' },
              },
              {
                title: '⏰ Répéter',
                pressAction: { id: 'snooze' },
              },
            ],
            sound: 'default',
            vibrationPattern: [300, 1000, 500, 1000, 500, 1000],
            lights: ['#10B981', 500, 500],
            autoCancel: false,
            ongoing: true,
          },
          data: {
            type: 'medication_alarm',
            reminderId: params.reminderId,
            medicationName: params.medicationName,
            dosage: params.dosage,
            patientId: params.patientId,
            audioPath: params.audioPath || '',
            instructions: params.instructions || '',
          },
        },
        trigger,
      );

      console.log(`✅ Notifee alarm scheduled: ${params.medicationName} at ${params.triggerTime.toLocaleString()}`);
      return { success: true, alarmId: params.alarmId };
    } catch (error) {
      console.error('❌ Failed to schedule notifee alarm:', error);
      return { success: false, alarmId: params.alarmId };
    }
  }

  /**
   * Cancel a scheduled alarm
   */
  async cancelAlarm(alarmId: string): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      await notifee.cancelNotification(alarmId);
      console.log(`✅ Alarm cancelled: ${alarmId}`);
    } catch (error) {
      console.error('❌ Failed to cancel alarm:', error);
    }
  }

  /**
   * Display an immediate alarm notification (for testing or immediate alerts)
   */
  async displayAlarm(params: {
    alarmId: string;
    medicationName: string;
    dosage: string;
    instructions?: string;
    reminderId: string;
    patientId: string;
  }): Promise<void> {
    if (!this.isAvailable()) return;
    await this.initialize();

    try {
      await notifee.displayNotification({
        id: params.alarmId,
        title: `💊 ${params.medicationName}`,
        body: params.instructions
          ? `${params.dosage} - ${params.instructions}`
          : `Il est temps de prendre: ${params.dosage}`,
        android: {
          channelId: ALARM_CHANNEL_ID,
          importance: AndroidImportance.HIGH,
          category: AndroidCategory.ALARM,
          visibility: AndroidVisibility.PUBLIC,
          fullScreenAction: {
            id: 'default',
            launchActivity: 'default',
          },
          pressAction: {
            id: 'default',
            launchActivity: 'default',
          },
          actions: [
            {
              title: '✅ Pris',
              pressAction: { id: 'confirm' },
            },
            {
              title: '⏰ Répéter',
              pressAction: { id: 'snooze' },
            },
          ],
          sound: 'default',
          vibrationPattern: [300, 1000, 500, 1000, 500, 1000],
          lights: ['#10B981', 500, 500],
          autoCancel: false,
          ongoing: true,
        },
        data: {
          type: 'medication_alarm',
          reminderId: params.reminderId,
          medicationName: params.medicationName,
          dosage: params.dosage,
          patientId: params.patientId,
        },
      });
      console.log(`✅ Notifee alarm displayed: ${params.medicationName}`);
    } catch (error) {
      console.error('❌ Failed to display notifee alarm:', error);
    }
  }

  /**
   * Cancel all scheduled alarms
   */
  async cancelAllAlarms(): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      await notifee.cancelAllNotifications();
      console.log('✅ All alarms cancelled');
    } catch (error) {
      console.error('❌ Failed to cancel all alarms:', error);
    }
  }

  /**
   * Get all pending alarm triggers
   */
  async getPendingAlarms(): Promise<string[]> {
    if (!this.isAvailable()) return [];
    try {
      const triggers = await notifee.getTriggerNotificationIds();
      return triggers;
    } catch (error) {
      console.error('❌ Failed to get pending alarms:', error);
      return [];
    }
  }

  /**
   * Request exact alarm permission (Android 12+)
   */
  async requestExactAlarmPermission(): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const settings = await notifee.getNotificationSettings();
      if (settings.android.alarm !== 1) { // 1 = ENABLED
        // Open settings to allow exact alarms
        await Linking.openSettings();
        return false;
      }
      return true;
    } catch (error) {
      console.error('❌ Failed to check alarm permission:', error);
      return false;
    }
  }
}

export const notifeeAlarmService = new NotifeeAlarmService();
export default notifeeAlarmService;

