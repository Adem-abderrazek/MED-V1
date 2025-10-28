/**
 * Background Notification Handler
 * 
 * This service handles automatic modal display when notifications are triggered
 * in the background, ensuring the modal appears automatically without user interaction
 * 
 * CRITICAL: This is specifically designed for Android's notification limitations
 */

import * as Notifications from 'expo-notifications';
import { AppState, AppStateStatus } from 'react-native';
import { notificationService, MedicationNotificationData } from './notificationService';

interface BackgroundNotificationHandler {
  currentReminder: MedicationNotificationData | null;
  setCurrentReminder: (data: MedicationNotificationData | null) => void;
  showReminderModal: boolean;
  setShowReminderModal: (show: boolean) => void;
  localVoicePath: string | null;
  setLocalVoicePath: (path: string | null) => void;
}

class BackgroundNotificationHandlerService {
  private appStateSubscription: any = null;
  private notificationResponseSubscription: any = null;
  private notificationReceivedSubscription: any = null;
  private context: BackgroundNotificationHandler | null = null;
  private lastNotificationCheck: Date | null = null;
  private periodicCheckInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize the background notification handler
   */
  init(context: BackgroundNotificationHandler) {
    this.context = context;
    console.log('🚀 Initializing background notification handler...');

    // Set up app state listener to detect when app comes to foreground
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange.bind(this));

    // Set up notification response listener (works better on Android)
    this.notificationResponseSubscription = Notifications.addNotificationResponseReceivedListener(
      this.handleNotificationResponse.bind(this)
    );

    // Set up notification received listener for automatic modal display
    this.notificationReceivedSubscription = Notifications.addNotificationReceivedListener(
      this.handleNotificationReceived.bind(this)
    );

    // Start periodic check for due notifications
    this.startPeriodicCheck();

    console.log('✅ Background notification handler initialized');
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
    const medicationData = notificationService.parseMedicationNotification(notification);
    
    if (medicationData && this.context) {
      console.log('💊 Notification response medication reminder:', medicationData);
      
      // Extract voice path from notification data
      const voicePath = notification.request.content.data?.localVoicePath as string;
      console.log('🎤 Response voice path from notification:', voicePath || 'none');
      
      // Store voice path in context for modal to use
      this.context.setLocalVoicePath(voicePath || null);
      this.context.setCurrentReminder(medicationData);
      this.context.setShowReminderModal(true);
      
      console.log('🚀 AUTOMATIC MODAL - Modal should now be visible');
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
        const triggerDate = new Date(notification.trigger.value as number);
        return triggerDate <= now;
      });

      if (dueNotifications.length > 0 && this.context) {
        console.log('🚨 Found due notifications:', dueNotifications.length);
        
        // Show modal for the most recent due notification
        const latestNotification = dueNotifications[dueNotifications.length - 1];
        const medicationData = notificationService.parseMedicationNotification(latestNotification);
        
        if (medicationData) {
          console.log('💊 Showing modal for due notification:', medicationData);
          
          const voicePath = latestNotification.content.data?.localVoicePath as string;
          this.context.setLocalVoicePath(voicePath || null);
          this.context.setCurrentReminder(medicationData);
          this.context.setShowReminderModal(true);
        }
      }
    } catch (error) {
      console.error('❌ Error checking for pending reminders:', error);
    }
  }

  /**
   * Handle notification received (automatic modal display)
   */
  private async handleNotificationReceived(notification: Notifications.Notification) {
    console.log('📩 Notification received automatically:', notification);
    
    const medicationData = notificationService.parseMedicationNotification(notification);
    
    if (medicationData && this.context) {
      console.log('💊 Automatic notification medication reminder:', medicationData);
      
      // Extract voice path from notification data
      const voicePath = notification.request.content.data?.localVoicePath as string;
      console.log('🎤 Automatic voice path from notification:', voicePath || 'none');
      
      // Store voice path in context for modal to use
      this.context.setLocalVoicePath(voicePath || null);
      this.context.setCurrentReminder(medicationData);
      this.context.setShowReminderModal(true);
      
      console.log('🚀 AUTOMATIC MODAL - Modal should now be visible automatically');
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
        const triggerDate = new Date(notification.trigger.value as number);
        // Check if notification is due within the last 2 minutes
        const timeDiff = now.getTime() - triggerDate.getTime();
        return timeDiff >= 0 && timeDiff <= 120000; // 2 minutes
      });

      if (dueNotifications.length > 0 && this.context) {
        console.log('⏰ Found due notifications:', dueNotifications.length);
        
        // Get the most recent due notification
        const latestNotification = dueNotifications[dueNotifications.length - 1];
        const medicationData = notificationService.parseMedicationNotification(latestNotification);
        
        if (medicationData) {
          console.log('💊 Showing modal for due notification:', medicationData);
          
          const voicePath = latestNotification.request.content.data?.localVoicePath as string;
          this.context.setLocalVoicePath(voicePath || null);
          this.context.setCurrentReminder(medicationData);
          this.context.setShowReminderModal(true);
          
          console.log('🚀 AUTOMATIC MODAL - Modal should now be visible for due notification');
        }
      }
    } catch (error) {
      console.error('❌ Error checking for due notifications:', error);
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
    console.log('🧹 Background notification handler cleaned up');
  }
}

export default new BackgroundNotificationHandlerService();
