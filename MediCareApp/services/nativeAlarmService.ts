/**
 * Native Alarm Service
 *
 * This service integrates with the native Android AlarmModule
 * to provide true full-screen alarms that work even when the
 * phone is locked and the app is killed.
 */

import { NativeModules } from 'react-native';

const { AlarmModule } = NativeModules;

interface AlarmData {
  reminderId: string;
  medicationName: string;
  dosage: string;
  reminderTime: string;
  voicePath?: string;
}

class NativeAlarmService {

  /**
   * Schedule a native full-screen alarm
   */
  async scheduleNativeAlarm(alarmData: AlarmData): Promise<boolean> {
    try {
      console.log('🚨 SCHEDULING NATIVE FULL-SCREEN ALARM:', alarmData);

      // Check if native module is available
      if (!AlarmModule) {
        console.error('❌ AlarmModule not available');
        return false;
      }

      // Check permissions first
      const hasPermission = await this.checkFullScreenPermission();
      if (!hasPermission) {
        console.log('⚠️ Requesting full-screen permission...');
        await this.requestFullScreenPermission();
        // Wait a bit for permission to be granted
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Schedule the alarm
      const result = await AlarmModule.scheduleFullScreenAlarm(
        alarmData.reminderId,
        alarmData.medicationName,
        alarmData.dosage,
        alarmData.reminderTime,
        alarmData.voicePath || null
      );

      console.log('✅ Native alarm scheduled successfully:', result);
      return true;

    } catch (error) {
      console.error('❌ Failed to schedule native alarm:', error);
      return false;
    }
  }

  /**
   * Cancel a native alarm
   */
  async cancelNativeAlarm(reminderId: string): Promise<boolean> {
    try {
      console.log('🗑️ Cancelling native alarm:', reminderId);

      if (!AlarmModule) {
        console.error('❌ AlarmModule not available');
        return false;
      }

      const result = await AlarmModule.cancelAlarm(reminderId);
      console.log('✅ Native alarm cancelled:', result);
      return true;

    } catch (error) {
      console.error('❌ Failed to cancel native alarm:', error);
      return false;
    }
  }

  /**
   * Check if full-screen permission is granted
   */
  async checkFullScreenPermission(): Promise<boolean> {
    try {
      if (!AlarmModule) {
        return false;
      }

      const hasPermission = await AlarmModule.checkFullScreenPermission();
      console.log('🔍 Full-screen permission status:', hasPermission);
      return hasPermission;

    } catch (error) {
      console.error('❌ Error checking permission:', error);
      return false;
    }
  }

  /**
   * Request full-screen permission from user
   */
  async requestFullScreenPermission(): Promise<void> {
    try {
      if (!AlarmModule) {
        throw new Error('AlarmModule not available');
      }

      await AlarmModule.requestFullScreenPermission();
      console.log('📱 Full-screen permission request initiated');

    } catch (error) {
      console.error('❌ Error requesting permission:', error);
      throw error;
    }
  }

  /**
   * Check if native alarm service is available
   */
  isNativeAlarmAvailable(): boolean {
    return !!AlarmModule;
  }
}

export default new NativeAlarmService();