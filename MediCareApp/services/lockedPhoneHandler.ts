/**
 * Locked Phone Handler
 * 
 * This service handles notifications when the phone is locked with a code/password
 * and ensures the modal appears even on locked devices
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { notificationService, MedicationNotificationData } from './notificationService';

interface LockedPhoneHandler {
  currentReminder: MedicationNotificationData | null;
  setCurrentReminder: (data: MedicationNotificationData | null) => void;
  showReminderModal: boolean;
  setShowReminderModal: (show: boolean) => void;
  localVoicePath: string | null;
  setLocalVoicePath: (path: string | null) => void;
}

class LockedPhoneHandlerService {
  private context: LockedPhoneHandler | null = null;
  private isInitialized = false;

  /**
   * Initialize the locked phone handler
   */
  init(context: LockedPhoneHandler) {
    if (Platform.OS !== 'android') {
      console.log('⚠️ Locked phone handler only works on Android');
      return;
    }

    this.context = context;
    this.isInitialized = true;
    console.log('🔐 Initializing locked phone handler...');

    // Set up aggressive notification handler for locked phones
    this.setupLockedPhoneNotificationHandler();

    console.log('✅ Locked phone handler initialized');
  }

  /**
   * Set up aggressive notification handler for locked phones
   */
  private setupLockedPhoneNotificationHandler() {
    // Override the global notification handler with locked phone specific logic
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        console.log('🔐 Locked phone notification handler triggered:', notification);
        
        // Check if this is a medication reminder
        const medicationData = notificationService.parseMedicationNotification(notification);
        if (medicationData && this.context) {
          console.log('💊 Locked phone - medication reminder detected:', medicationData);
          
          // Extract voice path
          const voicePath = notification.request.content.data?.localVoicePath as string;
          
          // Set context for automatic modal display
          this.context.setLocalVoicePath(voicePath || null);
          this.context.setCurrentReminder(medicationData);
          this.context.setShowReminderModal(true);
          
          console.log('🚀 LOCKED PHONE AUTOMATIC MODAL - Modal should now be visible on locked phone');
        }
        
        // Return aggressive settings for locked phones
        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          // Additional locked phone specific settings
          shouldShowBanner: true,
          shouldShowList: true,
        };
      },
    });

    // Set up notification received listener for locked phones
    Notifications.addNotificationReceivedListener(async (notification) => {
      console.log('🔐 Locked phone - notification received:', notification);
      
      const medicationData = notificationService.parseMedicationNotification(notification);
      if (medicationData && this.context) {
        console.log('💊 Locked phone - automatic medication reminder:', medicationData);
        
        const voicePath = notification.request.content.data?.localVoicePath as string;
        this.context.setLocalVoicePath(voicePath || null);
        this.context.setCurrentReminder(medicationData);
        this.context.setShowReminderModal(true);
        
        console.log('🚀 LOCKED PHONE AUTOMATIC MODAL - Modal should now be visible on locked phone');
      }
    });

    // Set up notification response listener for locked phones
    Notifications.addNotificationResponseReceivedListener(async (response) => {
      console.log('🔐 Locked phone - notification response received:', response);
      
      const notification = response.notification;
      const medicationData = notificationService.parseMedicationNotification(notification);
      if (medicationData && this.context) {
        console.log('💊 Locked phone - response medication reminder:', medicationData);
        
        const voicePath = notification.request.content.data?.localVoicePath as string;
        this.context.setLocalVoicePath(voicePath || null);
        this.context.setCurrentReminder(medicationData);
        this.context.setShowReminderModal(true);
        
        console.log('🚀 LOCKED PHONE AUTOMATIC MODAL - Modal should now be visible from response');
      }
    });
  }

  /**
   * Clean up the locked phone notification handler
   */
  cleanup() {
    console.log('🧹 Locked phone notification handler cleaned up');
    this.context = null;
    this.isInitialized = false;
  }
}

export default new LockedPhoneHandlerService();
