import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import Constants from "expo-constants";

// Configure notification behavior for iOS and Android
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    console.log(
      "🔔 Unified notification handler called:",
      notification.request.content.title
    );

    // Check if this is a medication reminder
    if (notification.request.content.data?.type === "medication_reminder") {
      console.log("💊 Medication reminder detected in handler");
      return {
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      };
    }

    return {
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      priority: Notifications.AndroidNotificationPriority.DEFAULT,
    };
  },
});

export interface MedicationNotificationData {
  reminderId: string;
  medicationName: string;
  dosage: string;
  instructions?: string;
  imageUrl?: string;
  patientId: string;
  reminderTime: string;
  voicePath?: string; // Add voice path to interface
  medications?: Array<{
    id: string;
    name: string;
    dosage: string;
    instructions?: string;
    imageUrl?: string;
  }>;
}

export class NotificationService {
  private static instance: NotificationService;
  private expoPushToken: string | null = null;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize notification service and get push token
   */
  async initialize(): Promise<string | null> {
    try {
      console.log("🔔 Initializing notification service...");

      // Check if device supports notifications
      if (!Device.isDevice) {
        console.warn("⚠️ Push notifications only work on physical devices");
        return null;
      }

      // Request permissions (iOS needs specific permissions)
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        console.log("📱 Requesting notification permissions...");
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowDisplayInCarPlay: false,
            allowCriticalAlerts: false, // Requires special entitlement
            provideAppNotificationSettings: false,
            allowProvisional: false,
          },
        });
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.warn("❌ Failed to get push notification permissions");
        return null;
      }

      console.log("✅ Notification permissions granted");

      // Get push token with error handling for Firebase issues
      try {
        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ||
          "08c7d74c-34aa-414e-87ee-6a8c0211968b";

        const token = await Notifications.getExpoPushTokenAsync({
          projectId: projectId,
        });

        this.expoPushToken = token.data;
        console.log(
          "📱 Expo push token obtained:",
          this.expoPushToken.substring(0, 30) + "..."
        );
      } catch (tokenError: any) {
        console.warn("⚠️ Failed to get Expo push token:", tokenError.message);
        console.log(
          "📱 Continuing without push token (local notifications only)"
        );
        return null;
      }

      // Configure notification channels for Android with FULL-SCREEN INTENT
      if (Platform.OS === "android") {
        await this.setupAndroidChannels();
      }

      return this.expoPushToken;
    } catch (error) {
      console.error("❌ Error initializing notifications:", error);
      return null;
    }
  }

  /**
   * Set up Android notification channels
   */
  private async setupAndroidChannels(): Promise<void> {
    try {
      // High priority channel for medication reminders
      await Notifications.setNotificationChannelAsync("medication-reminders", {
        name: "Rappels de Médicaments",
        description: "Notifications critiques pour les médicaments",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#10B981",
        sound: "default",
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility:
          Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true, // Bypass Do Not Disturb
        enableLights: true,
      });

      // Critical channel for urgent medication reminders with FULL-SCREEN INTENT
      await Notifications.setNotificationChannelAsync("critical-medication", {
        name: "Médicaments Critiques",
        description: "Notifications urgentes pour médicaments critiques",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 1000, 500, 1000, 500, 1000, 500, 1000], // More aggressive vibration
        lightColor: "#EF4444",
        sound: "default",
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility:
          Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
        enableLights: true,
      });

      // Emergency channel for immediate full-screen display
      await Notifications.setNotificationChannelAsync("emergency-medication", {
        name: "URGENCE Médicaments",
        description: "Notifications d'urgence - affichage plein écran",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 1500, 300, 1500, 300, 1500], // Emergency pattern
        lightColor: "#DC2626",
        sound: "default",
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility:
          Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
        enableLights: true,
      });

      console.log(
        "✅ Android notification channels configured with FULL-SCREEN INTENT support"
      );
    } catch (error) {
      console.error("❌ Error setting up Android channels:", error);
    }
  }

  /**
   * Perform a lightweight background notification check without modal handling
   */
  async handleBackgroundNotificationCheck() {
    console.log("🔄 Performing background notification check (modal disabled)");

    try {
      const presentedNotifications =
        await Notifications.getPresentedNotificationsAsync();
      console.log(
        "📋 Presented notifications (informational only):",
        presentedNotifications.length
      );
    } catch (error) {
      console.error("❌ Error in background notification check:", error);
    }
  }

  /**
   * Clean up notification service state
   */
  cleanup() {
    console.log("🧹 Notification service cleanup");
  }

  /**
   * Get current push token
   */
  getPushToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Schedule a medication reminder with full-screen alarm support
   */
  async scheduleMedicationReminder(
    reminderId: string,
    medicationName: string,
    dosage: string,
    reminderTime: string,
    voicePath?: string
  ): Promise<string> {
    try {
      console.log("💊 Scheduling medication reminder:", {
        reminderId,
        medicationName,
        dosage,
        reminderTime,
        voicePath,
      });

      // Parse reminder time
      const reminderDate = new Date(reminderTime);

      // Schedule notification
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `💊 ${medicationName}`,
          body: `Il est temps de prendre: ${dosage}`,
          data: {
            /* ... */
          },
          sound: "default",
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminderDate,
        } as any,
      });

      console.log(`✅ Medication reminder scheduled, ID: ${notificationId}`);
      return notificationId;
    } catch (error) {
      console.error("❌ Error scheduling medication reminder:", error);
      throw error;
    }
  }

  /**
   * Schedule a local notification for testing
   */
  async scheduleTestNotification(seconds: number = 5): Promise<string> {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "💊 Test Medication Reminder",
        body: "This is a test notification for medication reminders",
        data: {
          type: "medication_reminder",
          reminderId: "test-123",
          medicationName: "Test Medication",
          dosage: "1 tablet",
          patientId: "test-patient",
          reminderTime: new Date().toISOString(),
        },
        sound: "default",
        priority: Notifications.AndroidNotificationPriority.MAX,
        categoryIdentifier: "medication_reminder",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: seconds,
      } as any,
    });

    console.log(
      `🧪 Test notification scheduled for ${seconds} seconds, ID: ${notificationId}`
    );
    return notificationId;
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log(`❌ Cancelled notification: ${notificationId}`);
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log("❌ Cancelled all scheduled notifications");
  }

  /**
   * Get all scheduled notifications
   */
  async getScheduledNotifications(): Promise<
    Notifications.NotificationRequest[]
  > {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  /**
   * Handle notification received while app is in foreground
   */
  addNotificationReceivedListener(
    listener: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(listener);
  }

  /**
   * Handle notification response (user tapped notification)
   */
  addNotificationResponseReceivedListener(
    listener: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }

  /**
   * Parse medication data from notification
   */
  parseMedicationNotification(
    notification: Notifications.Notification
  ): MedicationNotificationData | null {
    try {
      // Check if notification has the expected structure
      if (
        !notification ||
        !notification.request ||
        !notification.request.content
      ) {
        console.log("⚠️ Invalid notification structure:", notification);
        return null;
      }

      const data = notification.request.content.data;

      if (!data || data.type !== "medication_reminder") {
        return null;
      }

      return {
        reminderId: data.reminderId as string,
        medicationName: data.medicationName as string,
        dosage: data.dosage as string,
        instructions: data.instructions as string | undefined,
        imageUrl: data.imageUrl as string | undefined,
        patientId: data.patientId as string,
        reminderTime: data.reminderTime as string,
        voicePath: data.localVoicePath as string | undefined,
        medications: data.medications as any[] | undefined,
      };
    } catch (error) {
      console.error("❌ Error parsing medication notification:", error);
      return null;
    }
  }

  /**
   * Parse medication data from notification request
   */
  parseMedicationNotificationFromRequest(
    notificationRequest: Notifications.NotificationRequest
  ): MedicationNotificationData | null {
    try {
      // Check if notification request has the expected structure
      if (!notificationRequest || !notificationRequest.content) {
        console.log(
          "⚠️ Invalid notification request structure:",
          notificationRequest
        );
        return null;
      }

      const data = notificationRequest.content.data;

      if (!data || data.type !== "medication_reminder") {
        return null;
      }

      return {
        reminderId: data.reminderId as string,
        medicationName: data.medicationName as string,
        dosage: data.dosage as string,
        instructions: data.instructions as string | undefined,
        imageUrl: data.imageUrl as string | undefined,
        patientId: data.patientId as string,
        reminderTime: data.reminderTime as string,
        voicePath: data.localVoicePath as string | undefined,
        medications: data.medications as any[] | undefined,
      };
    } catch (error) {
      console.error(
        "❌ Error parsing medication notification from request:",
        error
      );
      return null;
    }
  }

  /**
   * Show immediate notification (for testing)
   */
  async showImmediateNotification(
    title: string,
    body: string,
    data?: any
  ):  Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: "default",
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: null, 
    });
  }

 /**
   * Dismiss all notifications
   */
  async dismissAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
    console.log("🗑️ All notifications dismissed");
  }


  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }


  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }
}

export const notificationService = NotificationService.getInstance();
