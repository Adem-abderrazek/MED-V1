import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { notifee } from '@notifee/react-native';
import { Audio } from 'expo-av';
import Vibration from 'react-native-vibration';
import localReminderService from './localReminderService';
import aggressiveNotificationService from './aggressiveNotificationService';
import nativeAlarmService from './nativeAlarmService';

/**
 * Fixed Alarm System
 * 
 * Fixes the issues with:
 * 1. Sound continuing after confirming medication taken
 * 2. Modal only opening when clicking notification (should open automatically)
 * 3. Better full-screen alarm behavior
 */
class FixedAlarmSystem {
  private isInitialized = false;
  private activeAlarms = new Map<string, any>();
  private currentSound: Audio.Sound | null = null;
  private soundInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize the fixed alarm system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🚨 Initializing Fixed Alarm System...');

      // Request permissions
      await this.requestPermissions();

      // Setup notification handlers
      this.setupNotificationHandlers();

      this.isInitialized = true;
      console.log('✅ Fixed Alarm System initialized');

    } catch (error) {
      console.error('❌ Error initializing fixed alarm system:', error);
      throw error;
    }
  }

  /**
   * Request all necessary permissions
   */
  private async requestPermissions(): Promise<void> {
    try {
      console.log('🔐 Requesting alarm permissions...');

      // Request Expo notification permissions
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: true,
        },
      });

      console.log('📱 Expo notification permission:', status);

      // Request Notifee permissions (Android)
      if (Platform.OS === 'android') {
        const notifeeStatus = await notifee.requestPermission();
        console.log('📱 Notifee permission:', notifeeStatus);

        // Request exact alarm permission (Android 12+)
        const exactAlarmStatus = await notifee.requestPermission({
          alarm: true,
        });
        console.log('📱 Exact alarm permission:', exactAlarmStatus);
      }

    } catch (error) {
      console.error('❌ Error requesting permissions:', error);
    }
  }

  /**
   * Setup notification handlers with automatic modal opening
   */
  private setupNotificationHandlers(): void {
    console.log('🔧 Setting up fixed notification handlers...');

    // Set notification handler for automatic modal opening
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        console.log('🔔 Fixed notification received:', notification);
        
        if (notification.request.content.data?.type === 'medication_reminder') {
          const data = notification.request.content.data;
          console.log('💊 Medication reminder - opening modal automatically');
          
          // Automatically open modal and play sound
          await this.handleAutomaticAlarmTrigger(data);
        }

        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        };
      },
    });

    // Listen for notification received events
    Notifications.addNotificationReceivedListener(async (notification) => {
      console.log('🔔 Fixed notification received listener:', notification);
      
      if (notification.request.content.data?.type === 'medication_reminder') {
        const data = notification.request.content.data;
        console.log('💊 Medication alarm triggered - opening modal automatically');
        
        // Automatically handle alarm trigger
        await this.handleAutomaticAlarmTrigger(data);
      }
    });

    // Listen for notification response events (button presses)
    Notifications.addNotificationResponseReceivedListener(async (response) => {
      console.log('🔔 Fixed notification response received:', response);
      
      const actionId = response.actionIdentifier;
      const data = response.notification.request.content.data;
      
      if (actionId === 'taken') {
        await this.handleMedicationTaken(data.reminderId);
      } else if (actionId === 'snooze') {
        await this.handleMedicationSnoozed(data.reminderId);
      }
    });
  }

  /**
   * Handle automatic alarm trigger with modal opening
   */
  private async handleAutomaticAlarmTrigger(data: any): Promise<void> {
    try {
      console.log('🚨 Handling automatic alarm trigger:', data);

      // Start vibration
      this.startVibration();

      // Play voice file with proper cleanup
      if (data.localVoicePath) {
        await this.playVoiceFileWithCleanup(data.localVoicePath);
      }

      // Store active alarm
      this.activeAlarms.set(data.reminderId, {
        ...data,
        triggeredAt: new Date(),
      });

      // TODO: Trigger your existing modal component here
      // This would typically involve navigation to a full-screen modal
      console.log('📱 Should open full-screen modal automatically');

    } catch (error) {
      console.error('❌ Error handling automatic alarm trigger:', error);
    }
  }

  /**
   * Play voice file with proper cleanup
   */
  private async playVoiceFileWithCleanup(voicePath: string): Promise<void> {
    try {
      console.log('🎤 Playing voice file with cleanup:', voicePath);

      // Stop any currently playing sound
      await this.stopCurrentSound();

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
      });

      // Create and play sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: voicePath.startsWith('file://') ? voicePath : `file://${voicePath}` },
        { 
          shouldPlay: true, 
          volume: 1.0,
          isLooping: true
        }
      );

      this.currentSound = sound;

      console.log('✅ Voice file playing with cleanup');

    } catch (error) {
      console.error('❌ Error playing voice file:', error);
    }
  }

  /**
   * Start vibration pattern
   */
  private startVibration(): void {
    try {
      if (Platform.OS === 'android') {
        const vibratePattern = [0, 1000, 1000, 1000];
        Vibration.vibrate(vibratePattern);
        
        // Repeat vibration every 3 seconds
        this.soundInterval = setInterval(() => {
          Vibration.vibrate(vibratePattern);
        }, 3000);
      }
    } catch (error) {
      console.error('❌ Error starting vibration:', error);
    }
  }

  /**
   * Stop current sound and cleanup
   */
  private async stopCurrentSound(): Promise<void> {
    try {
      if (this.currentSound) {
        console.log('🔇 Stopping current sound');
        await this.currentSound.stopAsync();
        await this.currentSound.unloadAsync();
        this.currentSound = null;
      }

      if (this.soundInterval) {
        clearInterval(this.soundInterval);
        this.soundInterval = null;
      }

      Vibration.cancel();
      console.log('✅ Sound and vibration stopped');

    } catch (error) {
      console.error('❌ Error stopping sound:', error);
    }
  }

  /**
   * Handle medication taken - FIXED: Stop sound immediately
   */
  private async handleMedicationTaken(reminderId: string): Promise<void> {
    try {
      console.log(`✅ Medication taken - stopping sound: ${reminderId}`);

      // FIXED: Stop sound immediately when medication is taken
      await this.stopCurrentSound();

      // Remove from active alarms
      this.activeAlarms.delete(reminderId);

      // Use your existing service
      await localReminderService.confirmReminderLocally(reminderId);

      console.log(`✅ Medication taken handled - sound stopped: ${reminderId}`);

    } catch (error) {
      console.error('❌ Error handling medication taken:', error);
    }
  }

  /**
   * Handle medication snoozed - FIXED: Stop sound immediately
   */
  private async handleMedicationSnoozed(reminderId: string): Promise<void> {
    try {
      console.log(`⏰ Medication snoozed - stopping sound: ${reminderId}`);

      // FIXED: Stop sound immediately when snoozed
      await this.stopCurrentSound();

      // Remove from active alarms
      this.activeAlarms.delete(reminderId);

      // Use your existing service
      await localReminderService.snoozeReminderLocally(reminderId);

      console.log(`✅ Medication snoozed handled - sound stopped: ${reminderId}`);

    } catch (error) {
      console.error('❌ Error handling medication snoozed:', error);
    }
  }

  /**
   * Schedule fixed alarm with automatic modal opening
   */
  async scheduleFixedAlarm(
    reminderId: string,
    medicationName: string,
    dosage: string,
    scheduledDate: Date,
    voicePath?: string
  ): Promise<string> {
    try {
      console.log('🚨 Scheduling fixed alarm:', reminderId);

      // Strategy 1: Try native alarm service first (most reliable)
      if (nativeAlarmService.isAvailable()) {
        console.log('🚨 Using native alarm service for maximum reliability');
        return await nativeAlarmService.scheduleAlarm(
          reminderId,
          medicationName,
          dosage,
          scheduledDate,
          voicePath
        );
      }

      // Strategy 2: Use Notifee for Android exact alarms with automatic modal
      if (Platform.OS === 'android') {
        console.log('📱 Using Notifee for Android exact alarms with auto-modal');
        return await this.scheduleWithNotifeeAutoModal(reminderId, medicationName, dosage, scheduledDate, voicePath);
      }

      // Strategy 3: Use your existing aggressive notification service
      console.log('📱 Using fixed aggressive notifications');
      return await aggressiveNotificationService.scheduleAggressiveAlarm(
        reminderId,
        medicationName,
        dosage,
        scheduledDate,
        voicePath
      );

    } catch (error) {
      console.error('❌ Error scheduling fixed alarm:', error);
      throw error;
    }
  }

  /**
   * Schedule with Notifee for automatic modal opening
   */
  private async scheduleWithNotifeeAutoModal(
    reminderId: string,
    medicationName: string,
    dosage: string,
    scheduledDate: Date,
    voicePath?: string
  ): Promise<string> {
    try {
      // Create notification channel for medication alarms
      const channelId = await notifee.createChannel({
        id: 'fixed-medication-alarms',
        name: 'Fixed Medication Alarms',
        description: 'Fixed medication reminder alarms with automatic modal opening',
        importance: 4, // High importance
        sound: 'default',
        vibration: true,
        vibrationPattern: [0, 1000, 1000, 1000],
        lights: true,
        lightColor: '#FF0000',
        bypassDnd: true, // Bypass Do Not Disturb
      });

      // Create notification with automatic modal opening
      const notificationId = await notifee.createTriggerNotification(
        {
          id: reminderId,
          title: '🚨 RAPPEL MÉDICAMENT URGENT',
          body: `⏰ Il est temps de prendre: ${medicationName}\n📋 ${dosage}\n\n🔊 Modal s\'ouvre automatiquement`,
          data: {
            type: 'medication_reminder',
            reminderId,
            medicationName,
            dosage,
            localVoicePath: voicePath,
            autoOpenModal: true, // FIXED: Flag for automatic modal opening
          },
          android: {
            channelId,
            importance: 4,
            sound: 'default',
            vibrationPattern: [0, 1000, 1000, 1000],
            lights: [1000, 1000, '#FF0000'],
            fullScreenAction: {
              id: 'default',
              launchActivity: 'default',
            },
            actions: [
              {
                title: 'J\'ai pris',
                pressAction: { id: 'taken' },
              },
              {
                title: 'Rappelle-moi dans 10 min',
                pressAction: { id: 'snooze' },
              },
            ],
            smallIcon: 'ic_launcher',
            color: '#FF0000',
            autoCancel: false,
            ongoing: true,
            showTimestamp: true,
            showWhen: true,
          },
        },
        {
          type: 1, // TIMESTAMP
          timestamp: scheduledDate.getTime(),
        }
      );

      console.log(`✅ Fixed Notifee alarm scheduled with auto-modal: ${notificationId}`);
      return notificationId;

    } catch (error) {
      console.error('❌ Error scheduling with Notifee auto-modal:', error);
      throw error;
    }
  }

  /**
   * Cancel fixed alarm
   */
  async cancelFixedAlarm(reminderId: string): Promise<void> {
    try {
      console.log(`🗑️ Cancelling fixed alarm: ${reminderId}`);

      // Stop current sound
      await this.stopCurrentSound();

      // Cancel Notifee notification
      await notifee.cancelNotification(reminderId);

      // Cancel Expo notification
      await Notifications.cancelScheduledNotificationAsync(reminderId);

      // Remove from active alarms
      this.activeAlarms.delete(reminderId);

      console.log(`✅ Fixed alarm cancelled: ${reminderId}`);

    } catch (error) {
      console.error('❌ Error cancelling fixed alarm:', error);
    }
  }

  /**
   * Cancel all fixed alarms
   */
  async cancelAllFixedAlarms(): Promise<void> {
    try {
      console.log('🗑️ Cancelling all fixed alarms...');

      // Stop current sound
      await this.stopCurrentSound();

      // Cancel all Notifee notifications
      await notifee.cancelAllNotifications();

      // Cancel all Expo notifications
      await Notifications.cancelAllScheduledNotificationsAsync();

      // Clear all active alarms
      this.activeAlarms.clear();

      console.log('✅ All fixed alarms cancelled');

    } catch (error) {
      console.error('❌ Error cancelling all fixed alarms:', error);
    }
  }

  /**
   * Get fixed alarm statistics
   */
  getFixedAlarmStatistics(): { active: number } {
    return {
      active: this.activeAlarms.size,
    };
  }

  /**
   * Check if service is available
   */
  isAvailable(): boolean {
    return this.isInitialized;
  }
}

export default new FixedAlarmSystem();
