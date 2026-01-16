import { NativeModules, NativeEventEmitter, PermissionsAndroid, Platform } from 'react-native';

const { MedicationAlarmModule } = NativeModules;

// Event emitter for alarm events
const alarmEventEmitter = MedicationAlarmModule 
  ? new NativeEventEmitter(MedicationAlarmModule) 
  : null;

export interface AlarmData {
  alarmId: string;
  medicationName: string;
  dosage: string;
  instructions: string;
  audioPath: string | null;
  reminderId: string;
  patientId: string;
}

export interface ScheduleAlarmParams {
  alarmId: string;
  triggerTime: Date;
  medicationName: string;
  dosage: string;
  instructions?: string;
  audioPath?: string | null;
  reminderId: string;
  patientId: string;
}

/**
 * Medication Alarm Service
 * Provides a JavaScript interface to the native Android alarm module
 */
class AlarmService {
  private listeners: Map<string, any> = new Map();

  /**
   * Check if we're on Android (alarms only work on Android)
   */
  isAvailable(): boolean {
    return Platform.OS === 'android' && MedicationAlarmModule != null;
  }

  /**
   * Schedule a medication alarm
   */
  async scheduleAlarm(params: ScheduleAlarmParams): Promise<{ success: boolean; alarmId: string }> {
    if (!this.isAvailable()) {
      console.warn('⚠️ Alarm service not available on this platform');
      return { success: false, alarmId: params.alarmId };
    }

    try {
      const triggerTimeMillis = params.triggerTime.getTime();

      console.log(`⏰ Scheduling native alarm: ${params.medicationName} at ${params.triggerTime.toLocaleString()}`);

      // Native module signature:
      // scheduleAlarm(reminderId, triggerTimeMs, medicationName, dosage, instructions, patientId, audioPath)
      const result = await MedicationAlarmModule.scheduleAlarm(
        params.alarmId,
        triggerTimeMillis,
        params.medicationName,
        params.dosage,
        params.instructions || '',
        params.patientId || '',
        params.audioPath || null
      );

      console.log('✅ Native alarm scheduled:', result);
      return { success: result, alarmId: params.alarmId };
    } catch (error) {
      console.error('❌ Failed to schedule native alarm:', error);
      throw error;
    }
  }

  /**
   * Test alarm - triggers immediately for testing
   */
  async testAlarm(medicationName: string = 'Test Medication', dosage: string = '500mg'): Promise<boolean> {
    if (!this.isAvailable()) {
      console.warn('⚠️ Alarm service not available on this platform');
      return false;
    }

    try {
      console.log(`🧪 Testing alarm for: ${medicationName}`);
      const result = await MedicationAlarmModule.testAlarm(medicationName, dosage);
      console.log('✅ Test alarm triggered:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to trigger test alarm:', error);
      throw error;
    }
  }

  /**
   * Open exact alarm settings (Android 12+)
   */
  async openExactAlarmSettings(): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const result = await MedicationAlarmModule.openExactAlarmSettings();
      return result;
    } catch (error) {
      console.error('❌ Failed to open alarm settings:', error);
      return false;
    }
  }

  /**
   * Cancel a scheduled alarm
   */
  async cancelAlarm(alarmId: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const result = await MedicationAlarmModule.cancelAlarm(alarmId);
      console.log(`✅ Alarm cancelled: ${alarmId}`);
      return result;
    } catch (error) {
      console.error('❌ Failed to cancel alarm:', error);
      throw error;
    }
  }

  /**
   * Stop the currently playing alarm
   */
  async stopAlarm(): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const result = await MedicationAlarmModule.stopAlarm();
      console.log('✅ Alarm stopped');
      return result;
    } catch (error) {
      console.error('❌ Failed to stop alarm:', error);
      throw error;
    }
  }

  /**
   * Confirm medication taken - stops alarm
   */
  async confirmMedication(): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const result = await MedicationAlarmModule.confirmMedication();
      console.log('✅ Medication confirmed');
      return result;
    } catch (error) {
      console.error('❌ Failed to confirm medication:', error);
      throw error;
    }
  }

  /**
   * Snooze the alarm for 5 minutes
   */
  async snoozeAlarm(): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const result = await MedicationAlarmModule.snoozeAlarm();
      console.log('✅ Alarm snoozed for 5 minutes');
      return result;
    } catch (error) {
      console.error('❌ Failed to snooze alarm:', error);
      throw error;
    }
  }

  /**
   * Check if an alarm is currently active
   */
  async isAlarmActive(): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      return await MedicationAlarmModule.isAlarmActive();
    } catch (error) {
      console.error('❌ Failed to check alarm status:', error);
      return false;
    }
  }

  /**
   * Get the current alarm data if active
   */
  async getCurrentAlarmData(): Promise<AlarmData | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      return await MedicationAlarmModule.getCurrentAlarmData();
    } catch (error) {
      console.error('❌ Failed to get alarm data:', error);
      return null;
    }
  }

  /**
   * Check if exact alarms can be scheduled (Android 12+)
   */
  async canScheduleExactAlarms(): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      return await MedicationAlarmModule.canScheduleExactAlarms();
    } catch (error) {
      console.error('❌ Failed to check exact alarm permission:', error);
      return false;
    }
  }

  async canDrawOverlays(): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }
    try {
      return await MedicationAlarmModule.canDrawOverlays();
    } catch (error) {
      console.error('❌ Failed to check overlay permission:', error);
      return false;
    }
  }

  async openOverlaySettings(): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }
    try {
      return await MedicationAlarmModule.openOverlaySettings();
    } catch (error) {
      console.error('❌ Failed to open overlay settings:', error);
      return false;
    }
  }

  async isIgnoringBatteryOptimizations(): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }
    try {
      return await MedicationAlarmModule.isIgnoringBatteryOptimizations();
    } catch (error) {
      console.error('❌ Failed to check battery optimization status:', error);
      return false;
    }
  }

  async requestIgnoreBatteryOptimizations(): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }
    try {
      return await MedicationAlarmModule.requestIgnoreBatteryOptimizations();
    } catch (error) {
      console.error('❌ Failed to request ignore battery optimizations:', error);
      return false;
    }
  }

  async ensureAlarmPermissions(): Promise<void> {
    if (!this.isAvailable()) {
      return;
    }

    try {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
      }
    } catch (error) {
      console.error('❌ Failed to request notification permission:', error);
    }

    try {
      const canExact = await this.canScheduleExactAlarms();
      if (!canExact) {
        await this.openExactAlarmSettings();
      }
    } catch (error) {
      console.error('❌ Failed to request exact alarm permission:', error);
    }

    try {
      const canOverlay = await this.canDrawOverlays();
      if (!canOverlay) {
        await this.openOverlaySettings();
      }
    } catch (error) {
      console.error('❌ Failed to request overlay permission:', error);
    }

    try {
      const ignoring = await this.isIgnoringBatteryOptimizations();
      if (!ignoring) {
        await this.requestIgnoreBatteryOptimizations();
      }
    } catch (error) {
      console.error('❌ Failed to request battery optimization exemption:', error);
    }
  }

  /**
   * Get pending confirmations made from native alarm UI
   * These are confirmations made when the app was killed/background
   */
  async getPendingConfirmations(): Promise<{ reminderId: string; timestamp: number }[]> {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const confirmations = await MedicationAlarmModule.getPendingConfirmations();
      console.log(`📥 Got ${confirmations.length} pending confirmations from native`);
      return confirmations;
    } catch (error) {
      console.error('❌ Failed to get pending confirmations:', error);
      return [];
    }
  }

  /**
   * Clear pending confirmations after they've been synced to backend
   */
  async clearPendingConfirmations(): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await MedicationAlarmModule.clearPendingConfirmations();
      console.log('🧹 Cleared pending confirmations');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear pending confirmations:', error);
      return false;
    }
  }

  /**
   * Subscribe to alarm triggered events
   */
  onAlarmTriggered(callback: (data: AlarmData) => void): () => void {
    if (!alarmEventEmitter) {
      return () => {};
    }

    const subscription = alarmEventEmitter.addListener('onAlarmTriggered', callback);
    return () => subscription.remove();
  }

  /**
   * Subscribe to medication confirmed events
   */
  onMedicationConfirmed(callback: (data: { reminderId: string; medicationName: string }) => void): () => void {
    if (!alarmEventEmitter) {
      return () => {};
    }

    const subscription = alarmEventEmitter.addListener('onMedicationConfirmed', callback);
    return () => subscription.remove();
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners(): void {
    if (alarmEventEmitter) {
      alarmEventEmitter.removeAllListeners('onAlarmTriggered');
      alarmEventEmitter.removeAllListeners('onMedicationConfirmed');
    }
  }
}

// Export singleton instance
export const alarmService = new AlarmService();
export default alarmService;
