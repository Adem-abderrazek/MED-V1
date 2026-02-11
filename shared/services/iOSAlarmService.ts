import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { CRITICAL_ALERTS_ENABLED } from "./notificationService";

/**
 * iOS-specific Alarm Service for Critical Alerts
 *
 * This service handles medication reminders on iOS with Critical Alerts support.
 * Critical Alerts can bypass silent mode and Do Not Disturb.
 *
 * Requirements:
 * 1. Apple must approve your Critical Alerts entitlement request
 * 2. Set CRITICAL_ALERTS_ENABLED = true in notificationService.ts
 * 3. Set entitlement to true in app.json
 * 4. Rebuild the app with: eas build --platform ios
 *
 * Request form: https://developer.apple.com/contact/request/notifications-critical-alerts-entitlement
 */
export class iOSAlarmService {
  /**
   * Check if we're running on iOS
   */
  static isIOS(): boolean {
    return Platform.OS === "ios";
  }

  /**
   * Check if Critical Alerts are enabled in the app configuration
   */
  static isCriticalAlertsConfigured(): boolean {
    return CRITICAL_ALERTS_ENABLED;
  }

  /**
   * Check if Critical Alerts permission has been granted by the user
   */
  static async isCriticalAlertsGranted(): Promise<boolean> {
    if (!this.isIOS()) return false;
    if (!CRITICAL_ALERTS_ENABLED) return false;

    try {
      const settings = await Notifications.getPermissionsAsync();
      // iOS returns criticalAlertSetting: 0 = not supported, 1 = enabled, 2 = disabled
      const iosSettings = settings as any;
      return iosSettings.ios?.criticalAlertSetting === 1;
    } catch (error) {
      console.error("❌ Error checking Critical Alerts permission:", error);
      return false;
    }
  }

  /**
   * Get the current status of Critical Alerts
   */
  static async getCriticalAlertsStatus(): Promise<{
    available: boolean;
    configured: boolean;
    granted: boolean;
    reason: string;
  }> {
    if (!this.isIOS()) {
      return {
        available: false,
        configured: false,
        granted: false,
        reason: "Critical Alerts are only available on iOS",
      };
    }

    if (!CRITICAL_ALERTS_ENABLED) {
      return {
        available: true,
        configured: false,
        granted: false,
        reason:
          "Critical Alerts are not enabled. Waiting for Apple approval. Set CRITICAL_ALERTS_ENABLED = true after approval.",
      };
    }

    const granted = await this.isCriticalAlertsGranted();
    return {
      available: true,
      configured: true,
      granted,
      reason: granted
        ? "Critical Alerts are fully enabled and granted by user"
        : "Critical Alerts are configured but user has not granted permission",
    };
  }

  /**
   * Schedule a medication reminder with Critical Alert support
   *
   * If Critical Alerts are enabled and approved:
   * - Notification will bypass silent mode and DND
   * - Custom sound will play at specified volume
   *
   * If Critical Alerts are NOT enabled:
   * - Falls back to Time-Sensitive notifications (iOS 15+)
   * - Still breaks through Focus modes but NOT silent switch
   */
  static async scheduleMedicationReminder(params: {
    reminderId: string;
    medicationName: string;
    dosage: string;
    instructions?: string;
    scheduledTime: Date;
    patientId?: string;
    voicePath?: string | null;
    reminderTime?: string;
    soundName?: string;
    volume?: number; // 0.0 to 1.0, only for Critical Alerts
  }): Promise<string | null> {
    if (!this.isIOS()) {
      console.log("⚠️ iOSAlarmService: Not on iOS, skipping");
      return null;
    }

    const {
      reminderId,
      medicationName,
      dosage,
      instructions,
      scheduledTime,
      patientId,
      voicePath,
      reminderTime,
      soundName,
      volume = 1.0,
    } = params;

    console.log("📱 iOS: Scheduling medication reminder", {
      medicationName,
      scheduledTime: scheduledTime.toISOString(),
      criticalAlertsEnabled: CRITICAL_ALERTS_ENABLED,
    });

    // Build notification content
    const content: Notifications.NotificationContentInput = {
      title: `💊 ${medicationName}`,
      body: instructions
        ? `${dosage} - ${instructions}`
        : `Il est temps de prendre: ${dosage}`,
      data: {
        type: "medication_reminder",
        reminderId,
        medicationName,
        dosage,
        instructions,
        patientId: patientId || "",
        reminderTime: reminderTime || scheduledTime.toISOString(),
        localVoicePath: voicePath || "",
        scheduledTime: scheduledTime.toISOString(),
      },
      categoryIdentifier: "medication_reminder",
    };

    // Configure sound and interruption level based on Critical Alerts availability
    if (CRITICAL_ALERTS_ENABLED) {
      // Critical Alert: Bypasses silent mode and DND
      console.log("🔔 iOS: Using Critical Alert (bypasses silent + DND)");
      (content as any).interruptionLevel = "critical";
      content.sound = {
        critical: true,
        name: soundName || "default",
        volume: Math.min(1.0, Math.max(0.0, volume)), // Clamp between 0-1
      } as any;
    } else {
      // Fallback: Time-Sensitive notification (iOS 15+)
      // Breaks through Focus modes but NOT silent switch
      console.log(
        "🔔 iOS: Using Time-Sensitive notification (Focus bypass only)"
      );
      (content as any).interruptionLevel = "timeSensitive";
      content.sound = soundName || "default";
    }

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: scheduledTime,
        } as any,
      });

      console.log(`✅ iOS: Medication reminder scheduled, ID: ${notificationId}`);
      return notificationId;
    } catch (error) {
      console.error("❌ iOS: Error scheduling medication reminder:", error);
      throw error;
    }
  }

  /**
   * Schedule immediate Critical Alert for testing
   */
  static async sendTestCriticalAlert(): Promise<string | null> {
    if (!this.isIOS()) {
      console.log("⚠️ Test Critical Alert: Not on iOS");
      return null;
    }

    const content: Notifications.NotificationContentInput = {
      title: "🧪 Test Critical Alert",
      body: CRITICAL_ALERTS_ENABLED
        ? "This is a Critical Alert test - should bypass silent mode!"
        : "This is a Time-Sensitive test - Critical Alerts not enabled yet",
      data: { type: "test_critical_alert" },
    };

    if (CRITICAL_ALERTS_ENABLED) {
      (content as any).interruptionLevel = "critical";
      content.sound = { critical: true, name: "default", volume: 1.0 } as any;
    } else {
      (content as any).interruptionLevel = "timeSensitive";
      content.sound = "default";
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content,
      trigger: null, // Immediate
    });

    console.log(`🧪 iOS: Test alert sent, ID: ${notificationId}`);
    return notificationId;
  }

  /**
   * Log current Critical Alerts status for debugging
   */
  static async logStatus(): Promise<void> {
    const status = await this.getCriticalAlertsStatus();
    console.log("📱 iOS Critical Alerts Status:");
    console.log(`   Available: ${status.available}`);
    console.log(`   Configured: ${status.configured}`);
    console.log(`   Granted: ${status.granted}`);
    console.log(`   Reason: ${status.reason}`);
  }
}

export default iOSAlarmService;
