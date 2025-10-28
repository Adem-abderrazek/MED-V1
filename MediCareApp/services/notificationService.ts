import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, AppState, AppStateStatus } from 'react-native';
import Constants from 'expo-constants';
import nativeAlarmService from './nativeAlarmService';

// Unified notification handler interface
interface UnifiedNotificationHandler {
  currentReminder: MedicationNotificationData | null;
  setCurrentReminder: (data: MedicationNotificationData | null) => void;
  showReminderModal: boolean;
  setShowReminderModal: (show: boolean) => void;
  localVoicePath: string | null;
  setLocalVoicePath: (path: string | null) => void;
}

// Configure notification behavior for iOS and Android
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    console.log('🔔 Unified notification handler called:', notification.request.content.title);

    // Check if this is a medication reminder
    if (notification.request.content.data?.type === 'medication_reminder') {
      console.log('💊 Medication reminder detected in handler');
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
  private context: UnifiedNotificationHandler | null = null;
  private appStateSubscription: any = null;
  private notificationResponseSubscription: any = null;
  private notificationReceivedSubscription: any = null;
  private periodicCheckInterval: ReturnType<typeof setInterval> | null = null;

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
      console.log('🔔 Initializing notification service...');

      // Check if device supports notifications
      if (!Device.isDevice) {
        console.warn('⚠️ Push notifications only work on physical devices');
        return null;
      }

      // Request permissions (iOS needs specific permissions)
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        console.log('📱 Requesting notification permissions...');
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

      if (finalStatus !== 'granted') {
        console.warn('❌ Failed to get push notification permissions');
        return null;
      }

      console.log('✅ Notification permissions granted');

      // Get push token with error handling for Firebase issues
      try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId || '08c7d74c-34aa-414e-87ee-6a8c0211968b';

        const token = await Notifications.getExpoPushTokenAsync({
          projectId: projectId,
        });

        this.expoPushToken = token.data;
        console.log('📱 Expo push token obtained:', this.expoPushToken.substring(0, 30) + '...');
      } catch (tokenError: any) {
        console.warn('⚠️ Failed to get Expo push token:', tokenError.message);
        console.log('📱 Continuing without push token (local notifications only)');
        return null;
      }

      // Configure notification channels for Android with FULL-SCREEN INTENT
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }

      // Set up notification categories with actions
      await this.setupNotificationCategories();

      return this.expoPushToken;
    } catch (error) {
      console.error('❌ Error initializing notifications:', error);
      return null;
    }
  }

  /**
   * Set up Android notification channels
   */
  private async setupAndroidChannels(): Promise<void> {
    try {
      // High priority channel for medication reminders
      await Notifications.setNotificationChannelAsync('medication-reminders', {
        name: 'Rappels de Médicaments',
        description: 'Notifications critiques pour les médicaments',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10B981',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true, // Bypass Do Not Disturb
        enableLights: true,
      });

      // Critical channel for urgent medication reminders with FULL-SCREEN INTENT
      await Notifications.setNotificationChannelAsync('critical-medication', {
        name: 'Médicaments Critiques',
        description: 'Notifications urgentes pour médicaments critiques',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 1000, 500, 1000, 500, 1000, 500, 1000], // More aggressive vibration
        lightColor: '#EF4444',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
        enableLights: true,
      });

      // Emergency channel for immediate full-screen display
      await Notifications.setNotificationChannelAsync('emergency-medication', {
        name: 'URGENCE Médicaments',
        description: 'Notifications d\'urgence - affichage plein écran',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 1500, 300, 1500, 300, 1500], // Emergency pattern
        lightColor: '#DC2626',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
        enableLights: true,
      });

      console.log('✅ Android notification channels configured with FULL-SCREEN INTENT support');
    } catch (error) {
      console.error('❌ Error setting up Android channels:', error);
    }
  }

  /**
   * Set up notification categories and actions
   */
  private async setupNotificationCategories(): Promise<void> {
    try {
      await Notifications.setNotificationCategoryAsync('medication_reminder', [
        {
          identifier: 'confirm',
          buttonTitle: Platform.OS === 'ios' ? 'Pris 💊' : 'Pris ✓',
          options: {
            opensAppToForeground: false, // Don't open app, just mark as taken
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
        {
          identifier: 'snooze',
          buttonTitle: Platform.OS === 'ios' ? 'Rappeler 🔔' : 'Rappeler dans 10min ⏰',
          options: {
            opensAppToForeground: false, // Don't open app, just reschedule
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
      ]);

      console.log('✅ Notification categories configured');
    } catch (error) {
      console.error('❌ Error setting up notification categories:', error);
    }
  }

  /**
   * Initialize unified notification handler with modal context
   */
  initUnifiedHandler(context: UnifiedNotificationHandler) {
    this.context = context;
    console.log('🚀 Initializing unified notification handler...');

    // Set up app state listener to detect when app comes to foreground
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange.bind(this));

    // Set up notification response listener (when user taps notification)
    this.notificationResponseSubscription = Notifications.addNotificationResponseReceivedListener(
      this.handleNotificationResponse.bind(this)
    );

    // Set up notification received listener for automatic modal display
    this.notificationReceivedSubscription = Notifications.addNotificationReceivedListener(
      this.handleNotificationReceived.bind(this)
    );

    // Start periodic check for due notifications
    this.startPeriodicCheck();

    console.log('✅ Unified notification handler initialized');
  }

  /**
   * Handle app state changes
   */
  private handleAppStateChange(nextAppState: AppStateStatus) {
    console.log('📱 App state changed to:', nextAppState);

    if (nextAppState === 'active' && this.context) {
      console.log('🚀 App is now active - checking for pending medication reminders');
      this.checkForPendingReminders();
    }
  }

  /**
   * Handle notification responses (when user taps notification)
   */
  private async handleNotificationResponse(response: Notifications.NotificationResponse) {
    console.log('📩 Notification response received:', response);

    const notification = response.notification;
    const medicationData = this.parseMedicationNotification(notification);

    if (medicationData && this.context) {
      console.log('💊 Notification response medication reminder:', medicationData);

      // Extract voice path from notification data
      const voicePath = notification.request.content.data?.localVoicePath as string;
      console.log('🎤 Response voice path from notification:', voicePath || 'none');

      // Prevent multiple modal triggers by checking current state
      if (!this.context.showReminderModal) {
        // Store voice path in context for modal to use
        this.context.setLocalVoicePath(voicePath || null);
        this.context.setCurrentReminder(medicationData);
        this.context.setShowReminderModal(true);

        console.log('🚀 UNIFIED AUTOMATIC MODAL - Modal should now be visible');
      } else {
        console.log('⚠️ Modal already showing, skipping duplicate trigger');
      }
    }
  }

  /**
   * Handle notification received (automatic modal display)
   */
  private async handleNotificationReceived(notification: Notifications.Notification) {
    console.log('📩 Notification received automatically:', notification);

    const medicationData = this.parseMedicationNotification(notification);

    if (medicationData && this.context) {
      console.log('💊 Automatic notification medication reminder:', medicationData);

      // Extract voice path from notification data
      const voicePath = notification.request.content.data?.localVoicePath as string;
      console.log('🎤 Automatic voice path from notification:', voicePath || 'none');

      // FORCE MODAL DISPLAY - Even if already showing, replace with new reminder
      // This ensures critical medication reminders are never missed
      this.context.setLocalVoicePath(voicePath || null);
      this.context.setCurrentReminder(medicationData);
      this.context.setShowReminderModal(true);

      console.log('🚀 UNIFIED AUTOMATIC MODAL - Modal should now be visible automatically (FORCED)');
    }
  }

  /**
   * Check for pending reminders when app becomes active
   */
  private async checkForPendingReminders() {
    try {
      // Get all scheduled notifications
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log('📋 Checking scheduled notifications:', scheduledNotifications.length);

      // Check if any are due now or in the past
      const now = new Date();
      const dueNotifications = scheduledNotifications.filter(notification => {
        if (notification.trigger && 'seconds' in notification.trigger && notification.trigger.seconds) {
          const triggerDate = new Date(now.getTime() + (notification.trigger.seconds * 1000));
          return triggerDate <= now;
        }
        return false;
      });

      if (dueNotifications.length > 0 && this.context) {
        console.log('🚨 Found due notifications:', dueNotifications.length);

        // Show modal for the most recent due notification
        const latestNotification = dueNotifications[dueNotifications.length - 1];
        const medicationData = this.parseMedicationNotificationFromRequest(latestNotification);

        if (medicationData) {
          console.log('💊 Showing modal for due notification:', medicationData);

          // Prevent multiple modal triggers by checking current state
          if (!this.context.showReminderModal) {
            const voicePath = latestNotification.content.data?.localVoicePath as string;
            this.context.setLocalVoicePath(voicePath || null);
            this.context.setCurrentReminder(medicationData);
            this.context.setShowReminderModal(true);
          } else {
            console.log('⚠️ Modal already showing, skipping due notification trigger');
          }
        }
      }
    } catch (error) {
      console.error('❌ Error checking for pending reminders:', error);
    }
  }

  /**
   * Start periodic check for due notifications
   */
  private startPeriodicCheck() {
    // Check every 30 seconds for due notifications
    this.periodicCheckInterval = setInterval(() => {
      this.checkForDueNotifications();
    }, 30000);

    console.log('⏰ Started periodic check for due notifications (every 30 seconds)');
  }

  /**
   * Check for notifications that are due now
   */
  private async checkForDueNotifications() {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const now = new Date();

      const dueNotifications = scheduledNotifications.filter(notification => {
        if (notification.trigger && 'seconds' in notification.trigger && notification.trigger.seconds) {
          const triggerDate = new Date(now.getTime() + (notification.trigger.seconds * 1000));
          // Check if notification is due within the last 2 minutes
          const timeDiff = now.getTime() - triggerDate.getTime();
          return timeDiff >= 0 && timeDiff <= 120000; // 2 minutes
        }
        return false;
      });

      if (dueNotifications.length > 0 && this.context) {
        console.log('⏰ Found due notifications:', dueNotifications.length);

        // Get the most recent due notification
        const latestNotification = dueNotifications[dueNotifications.length - 1];
        const medicationData = this.parseMedicationNotificationFromRequest(latestNotification);

        if (medicationData) {
          console.log('💊 Showing modal for due notification:', medicationData);

          // Prevent multiple modal triggers by checking current state
          if (!this.context.showReminderModal) {
            const voicePath = latestNotification.content.data?.localVoicePath as string;
            this.context.setLocalVoicePath(voicePath || null);
            this.context.setCurrentReminder(medicationData);
            this.context.setShowReminderModal(true);

            console.log('🚀 UNIFIED AUTOMATIC MODAL - Modal should now be visible for due notification');
          } else {
            console.log('⚠️ Modal already showing, skipping due notification trigger');
          }
        }
      }
    } catch (error) {
      console.error('❌ Error checking for due notifications:', error);
    }
  }

  /**
   * Enhanced background notification handling
   * This method can be called when the app comes to foreground to check for missed notifications
   */
  async handleBackgroundNotificationCheck() {
    console.log('🔄 Performing enhanced background notification check');

    if (!this.context) {
      console.log('⚠️ No context available for background check');
      return;
    }

    try {
      // Check for any notifications that should have triggered modals
      await this.checkForPendingReminders();

      // Also check for very recent notifications that might have been missed
      const presentedNotifications = await Notifications.getPresentedNotificationsAsync();
      console.log('📋 Presented notifications:', presentedNotifications.length);

      for (const notification of presentedNotifications) {
        const medicationData = this.parseMedicationNotification(notification);
        if (medicationData) {
          console.log('💊 Found unhandled presented notification:', medicationData);

          // FORCE MODAL DISPLAY for critical medication reminders
          const voicePath = notification.request.content.data?.localVoicePath as string;
          this.context.setLocalVoicePath(voicePath || null);
          this.context.setCurrentReminder(medicationData);
          this.context.setShowReminderModal(true);

          console.log('🚀 BACKGROUND RECOVERY - Modal should now be visible (FORCED)');
          break; // Only show one modal at a time
        }
      }
    } catch (error) {
      console.error('❌ Error in background notification check:', error);
    }
  }

  /**
   * Clean up listeners
   */
  cleanup() {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    if (this.notificationResponseSubscription) {
      this.notificationResponseSubscription.remove();
    }
    if (this.notificationReceivedSubscription) {
      this.notificationReceivedSubscription.remove();
    }
    if (this.periodicCheckInterval) {
      clearInterval(this.periodicCheckInterval);
    }
    console.log('🧹 Unified notification handler cleaned up');
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
      console.log('💊 Scheduling medication reminder:', {
        reminderId,
        medicationName,
        dosage,
        reminderTime,
        voicePath
      });

      // Parse reminder time
      const reminderDate = new Date(reminderTime);

      // Schedule notification
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `💊 ${medicationName}`,
          body: `Il est temps de prendre: ${dosage}`,
          data: {
            type: 'medication_reminder',
            reminderId,
            medicationName,
            dosage,
            patientId: 'current-patient', // TODO: Get from context
            reminderTime,
            localVoicePath: voicePath,
          },
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          categoryIdentifier: 'medication_reminder',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminderDate,
        } as any,
      });

      // Schedule native full-screen alarm for Android
      if (Platform.OS === 'android' && nativeAlarmService.isNativeAlarmAvailable()) {
        const alarmScheduled = await nativeAlarmService.scheduleNativeAlarm({
          reminderId,
          medicationName,
          dosage,
          reminderTime,
          voicePath,
        });

        if (alarmScheduled) {
          console.log('🚨 Native full-screen alarm scheduled successfully');
        } else {
          console.log('⚠️ Native alarm scheduling failed, using notification only');
        }
      }

      console.log(`✅ Medication reminder scheduled, ID: ${notificationId}`);
      return notificationId;

    } catch (error) {
      console.error('❌ Error scheduling medication reminder:', error);
      throw error;
    }
  }

  /**
   * Schedule a local notification for testing
   */
  async scheduleTestNotification(seconds: number = 5): Promise<string> {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '💊 Test Medication Reminder',
        body: 'This is a test notification for medication reminders',
        data: {
          type: 'medication_reminder',
          reminderId: 'test-123',
          medicationName: 'Test Medication',
          dosage: '1 tablet',
          patientId: 'test-patient',
          reminderTime: new Date().toISOString(),
        },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        categoryIdentifier: 'medication_reminder',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: seconds,
      } as any,
    });

    console.log(`🧪 Test notification scheduled for ${seconds} seconds, ID: ${notificationId}`);
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
    console.log('❌ Cancelled all scheduled notifications');
  }

  /**
   * Get all scheduled notifications
   */
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
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
  parseMedicationNotification(notification: Notifications.Notification): MedicationNotificationData | null {
    try {
      // Check if notification has the expected structure
      if (!notification || !notification.request || !notification.request.content) {
        console.log('⚠️ Invalid notification structure:', notification);
        return null;
      }

      const data = notification.request.content.data;

      if (!data || data.type !== 'medication_reminder') {
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
      console.error('❌ Error parsing medication notification:', error);
      return null;
    }
  }

  /**
   * Parse medication data from notification request
   */
  parseMedicationNotificationFromRequest(notificationRequest: Notifications.NotificationRequest): MedicationNotificationData | null {
    try {
      // Check if notification request has the expected structure
      if (!notificationRequest || !notificationRequest.content) {
        console.log('⚠️ Invalid notification request structure:', notificationRequest);
        return null;
      }

      const data = notificationRequest.content.data;

      if (!data || data.type !== 'medication_reminder') {
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
      console.error('❌ Error parsing medication notification from request:', error);
      return null;
    }
  }

  /**
   * Show immediate notification (for testing)
   */
  async showImmediateNotification(title: string, body: string, data?: any): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        categoryIdentifier: 'medication_reminder',
      },
      trigger: null, // Show immediately
    });
  }

  /**
   * Dismiss all notifications
   */
  async dismissAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
    console.log('🗑️ All notifications dismissed');
  }

  /**
   * Get badge count
   */
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }
}

export const notificationService = NotificationService.getInstance();

