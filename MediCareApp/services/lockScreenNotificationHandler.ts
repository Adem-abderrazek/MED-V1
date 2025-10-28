/**
 * Lock Screen Notification Handler
 * 
 * This service specifically handles notifications when the phone is locked
 * and ensures the modal appears even on the lock screen
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { notificationService, MedicationNotificationData } from './notificationService';

interface LockScreenNotificationHandler {
  currentReminder: MedicationNotificationData | null;
  setCurrentReminder: (data: MedicationNotificationData | null) => void;
  showReminderModal: boolean;
  setShowReminderModal: (show: boolean) => void;
  localVoicePath: string | null;
  setLocalVoicePath: (path: string | null) => void;
}

class LockScreenNotificationHandlerService {
  private context: LockScreenNotificationHandler | null = null;
  private isInitialized = false;

  /**
   * Initialize the lock screen notification handler
   */
  init(context: LockScreenNotificationHandler) {
    if (Platform.OS !== 'android') {
      console.log('⚠️ Lock screen notification handler only works on Android');
      return;
    }

    this.context = context;
    this.isInitialized = true;
    console.log('🚀 Initializing lock screen notification handler...');

    // Set up aggressive notification handler for lock screen
    this.setupLockScreenNotificationHandler();

    console.log('✅ Lock screen notification handler initialized');
  }

  /**
   * Set up aggressive notification handler for lock screen
   */
  private setupLockScreenNotificationHandler() {
    // Override the global notification handler with lock screen specific logic
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        console.log('🔒 Lock screen notification handler triggered:', notification);
        
        // Check if this is a medication reminder
        const medicationData = notificationService.parseMedicationNotification(notification);
        if (medicationData && this.context) {
          console.log('💊 Lock screen - medication reminder detected:', medicationData);
          
          // Extract voice path
          const voicePath = notification.request.content.data?.localVoicePath as string;
          
          // Set context for automatic modal display
          this.context.setLocalVoicePath(voicePath || null);
          this.context.setCurrentReminder(medicationData);
          this.context.setShowReminderModal(true);
          
          console.log('🚀 LOCK SCREEN AUTOMATIC MODAL - Modal should now be visible on lock screen');
        }
        
        // Return aggressive settings for lock screen
        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          // Additional lock screen specific settings
          shouldShowBanner: true,
          shouldShowList: true,
        };
      },
    });

    // Set up notification received listener for lock screen
    Notifications.addNotificationReceivedListener(async (notification) => {
      console.log('🔒 Lock screen - notification received:', notification);
      
      const medicationData = notificationService.parseMedicationNotification(notification);
      if (medicationData && this.context) {
        console.log('💊 Lock screen - automatic medication reminder:', medicationData);
        
        const voicePath = notification.request.content.data?.localVoicePath as string;
        this.context.setLocalVoicePath(voicePath || null);
        this.context.setCurrentReminder(medicationData);
        this.context.setShowReminderModal(true);
        
        console.log('🚀 LOCK SCREEN AUTOMATIC MODAL - Modal should now be visible on lock screen');
      }
    });

    // Set up notification response listener for lock screen
    Notifications.addNotificationResponseReceivedListener(async (response) => {
      console.log('🔒 Lock screen - notification response received:', response);
      
      const notification = response.notification;
      const medicationData = notificationService.parseMedicationNotification(notification);
      if (medicationData && this.context) {
        console.log('💊 Lock screen - response medication reminder:', medicationData);
        
        const voicePath = notification.request.content.data?.localVoicePath as string;
        this.context.setLocalVoicePath(voicePath || null);
        this.context.setCurrentReminder(medicationData);
        this.context.setShowReminderModal(true);
        
        console.log('🚀 LOCK SCREEN AUTOMATIC MODAL - Modal should now be visible from response');
      }
    });
  }

  /**
   * Clean up the lock screen notification handler
   */
  cleanup() {
    console.log('🧹 Lock screen notification handler cleaned up');
    this.context = null;
    this.isInitialized = false;
  }
}

export default new LockScreenNotificationHandlerService();
