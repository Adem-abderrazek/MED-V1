/**
 * Android-Specific Notification Handler
 * 
 * This service provides aggressive notification handling specifically for Android
 * to ensure the modal appears automatically without user interaction
 */

import * as Notifications from 'expo-notifications';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { notificationService, MedicationNotificationData } from './notificationService';

interface AndroidNotificationHandler {
  currentReminder: MedicationNotificationData | null;
  setCurrentReminder: (data: MedicationNotificationData | null) => void;
  showReminderModal: boolean;
  setShowReminderModal: (show: boolean) => void;
  localVoicePath: string | null;
  setLocalVoicePath: (path: string | null) => void;
}

class AndroidNotificationHandlerService {
  private appStateSubscription: any = null;
  private notificationResponseSubscription: any = null;
  private notificationReceivedSubscription: any = null;
  private context: AndroidNotificationHandler | null = null;
  private lastNotificationCheck: Date | null = null;
  private isInitialized = false;

  /**
   * Initialize the Android notification handler
   */
  init(context: AndroidNotificationHandler) {
    if (Platform.OS !== 'android') {
      console.log('⚠️ Android notification handler only works on Android');
      return;
    }

    this.context = context;
    this.isInitialized = true;
    console.log('🚀 Initializing Android notification handler...');

    // Set up app state listener
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange.bind(this));

    // Set up notification response listener (when user taps notification)
    this.notificationResponseSubscription = Notifications.addNotificationResponseReceivedListener(
      this.handleNotificationResponse.bind(this)
    );

    // Set up notification received listener (for foreground notifications)
    this.notificationReceivedSubscription = Notifications.addNotificationReceivedListener(
      this.handleNotificationReceived.bind(this)
    );

    // Set up notification handler for background processing
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        console.log('⚙️ Android notification handler triggered:', notification);
        
        // Check if this is a medication reminder
        const medicationData = notificationService.parseMedicationNotification(notification);
        if (medicationData && this.context) {
          console.log('💊 Android handler - medication reminder detected:', medicationData);
          
          // Extract voice path
          const voicePath = notification.request.content.data?.localVoicePath as string;
          
          // Set context for automatic modal display
          this.context.setLocalVoicePath(voicePath || null);
          this.context.setCurrentReminder(medicationData);
          this.context.setShowReminderModal(true);
          
          console.log('🚀 ANDROID AUTOMATIC MODAL - Modal should now be visible');
        }
        
        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        };
      },
    });

    console.log('✅ Android notification handler initialized');
  }

  /**
   * Handle app state changes
   */
  private handleAppStateChange(nextAppState: AppStateStatus) {
    console.log('📱 Android handler - App state changed to:', nextAppState);
    
    if (nextAppState === 'active' && this.context) {
      console.log('🚀 Android handler - App is now active, checking for pending reminders');
      this.checkForPendingReminders();
    }
  }

  /**
   * Handle notification responses (when user taps notification)
   */
  private async handleNotificationResponse(response: Notifications.NotificationResponse) {
    console.log('📩 Android handler - Notification response received:', response);
    
    const notification = response.notification;
    const medicationData = notificationService.parseMedicationNotification(notification);
    
    if (medicationData && this.context) {
      console.log('💊 Android handler - Notification response medication reminder:', medicationData);
      
      // Extract voice path from notification data
      const voicePath = notification.request.content.data?.localVoicePath as string;
      console.log('🎤 Android handler - Response voice path:', voicePath || 'none');
      
      // Store voice path in context for modal to use
      this.context.setLocalVoicePath(voicePath || null);
      this.context.setCurrentReminder(medicationData);
      this.context.setShowReminderModal(true);
      
      console.log('🚀 ANDROID AUTOMATIC MODAL - Modal should now be visible');
    }
  }

  /**
   * Handle notification received (foreground only)
   */
  private async handleNotificationReceived(notification: Notifications.Notification) {
    console.log('📩 Android handler - Notification received:', notification);
    
    const medicationData = notificationService.parseMedicationNotification(notification);
    if (medicationData && this.context) {
      console.log('💊 Android handler - Received medication reminder:', medicationData);
      
      // Extract voice path from notification data
      const voicePath = notification.request.content.data?.localVoicePath as string;
      console.log('🎤 Android handler - Received voice path:', voicePath || 'none');
      
      // Store voice path in context for modal to use
      this.context.setLocalVoicePath(voicePath || null);
      this.context.setCurrentReminder(medicationData);
      this.context.setShowReminderModal(true);
      
      console.log('🚀 ANDROID AUTOMATIC MODAL - Modal should now be visible');
    }
  }

  /**
   * Check for pending reminders when app becomes active
   */
  private async checkForPendingReminders() {
    if (!this.context) return;

    try {
      // Get all scheduled notifications
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log('📋 Android handler - Checking scheduled notifications:', scheduledNotifications.length);

      // Check if any are due now or in the past
      const now = new Date();
      const dueNotifications = scheduledNotifications.filter(notification => {
        const triggerDate = new Date(notification.trigger.value as number);
        return triggerDate <= now;
      });

      if (dueNotifications.length > 0) {
        console.log('🚨 Android handler - Found due notifications:', dueNotifications.length);
        
        // Show modal for the most recent due notification
        const latestNotification = dueNotifications[dueNotifications.length - 1];
        const medicationData = notificationService.parseMedicationNotification(latestNotification);
        
        if (medicationData) {
          console.log('💊 Android handler - Showing modal for due notification:', medicationData);
          
          // Extract voice path
          const voicePath = latestNotification.request.content.data?.localVoicePath as string;
          
          // Set context for automatic modal display
          this.context.setLocalVoicePath(voicePath || null);
          this.context.setCurrentReminder(medicationData);
          this.context.setShowReminderModal(true);
          
          console.log('🚀 ANDROID AUTOMATIC MODAL - Modal should now be visible');
        }
      }
    } catch (error) {
      console.error('❌ Android handler - Error checking for pending reminders:', error);
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
    console.log('🧹 Android notification handler cleaned up');
  }
}

export default new AndroidNotificationHandlerService();
