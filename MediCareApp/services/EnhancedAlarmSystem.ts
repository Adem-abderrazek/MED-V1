import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { notifee } from '@notifee/react-native';
import { Audio } from 'expo-av';
import Vibration from 'react-native-vibration';
import localReminderService from './localReminderService';
import aggressiveNotificationService from './aggressiveNotificationService';
import nativeAlarmService from './nativeAlarmService';

/**
 * Enhanced Alarm System
 * 
 * Enhances your existing locked phone alarm system with:
 * - Better reliability for locked phones
 * - Enhanced full-screen modal behavior
 * - Improved voice playback with looping
 * - Escalation system for missed alarms
 * - Better battery optimization handling
 * 
 * This builds on your existing services without changing your patient dashboard.
 */
class EnhancedAlarmSystem {
  private isInitialized = false;
  private activeAlarms = new Map<string, any>();
  private escalationTimers = new Map<string, NodeJS.Timeout>();

  /**
   * Initialize the enhanced alarm system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🚨 Initializing Enhanced Alarm System...');

      // Request enhanced permissions
      await this.requestEnhancedPermissions();

      // Setup enhanced notification handlers
      this.setupEnhancedNotificationHandlers();

      // Setup escalation system
      this.setupEscalationSystem();

      this.isInitialized = true;
      console.log('✅ Enhanced Alarm System initialized');

    } catch (error) {
      console.error('❌ Error initializing enhanced alarm system:', error);
      throw error;
    }
  }

  /**
   * Request enhanced permissions for better alarm reliability
   */
  private async requestEnhancedPermissions(): Promise<void> {
    try {
      console.log('🔐 Requesting enhanced alarm permissions...');

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
      console.error('❌ Error requesting enhanced permissions:', error);
    }
  }

  /**
   * Setup enhanced notification handlers
   */
  private setupEnhancedNotificationHandlers(): void {
    console.log('🔧 Setting up enhanced notification handlers...');

    // Enhanced notification handler
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        console.log('🔔 Enhanced notification received:', notification);
        
        if (notification.request.content.data?.type === 'medication_reminder') {
          const data = notification.request.content.data;
          
          // Trigger enhanced alarm behavior
          await this.handleEnhancedAlarmTrigger(data);
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
      console.log('🔔 Enhanced notification received listener:', notification);
      
      if (notification.request.content.data?.type === 'medication_reminder') {
        const data = notification.request.content.data;
        console.log('💊 Enhanced medication alarm triggered:', data);
        
        // Handle enhanced alarm trigger
        await this.handleEnhancedAlarmTrigger(data);
      }
    });

    // Listen for notification response events (button presses)
    Notifications.addNotificationResponseReceivedListener(async (response) => {
      console.log('🔔 Enhanced notification response received:', response);
      
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
   * Setup escalation system for missed alarms
   */
  private setupEscalationSystem(): void {
    console.log('⏰ Setting up alarm escalation system...');
    
    // This will be called when alarms are not responded to
    // We'll implement escalation logic here
  }

  /**
   * Enhanced alarm trigger handler
   */
  private async handleEnhancedAlarmTrigger(data: any): Promise<void> {
    try {
      console.log('🚨 Handling enhanced alarm trigger:', data);

      // Start enhanced vibration pattern
      this.startEnhancedVibration();

      // Play voice file with enhanced looping
      if (data.localVoicePath) {
        await this.playEnhancedVoiceFile(data.localVoicePath);
      }

      // Start escalation timer
      this.startEscalationTimer(data.reminderId);

      // Store active alarm
      this.activeAlarms.set(data.reminderId, {
        ...data,
        triggeredAt: new Date(),
        escalationCount: 0
      });

    } catch (error) {
      console.error('❌ Error handling enhanced alarm trigger:', error);
    }
  }

  /**
   * Enhanced vibration pattern for maximum attention
   */
  private startEnhancedVibration(): void {
    try {
      if (Platform.OS === 'android') {
        // Enhanced vibration pattern for maximum attention
        const vibratePattern = [0, 1000, 1000, 1000, 1000, 1000];
        Vibration.vibrate(vibratePattern);
        
        // Repeat vibration every 3 seconds
        setInterval(() => {
          Vibration.vibrate(vibratePattern);
        }, 3000);
      }
    } catch (error) {
      console.error('❌ Error starting enhanced vibration:', error);
    }
  }

  /**
   * Enhanced voice file playback with looping
   */
  private async playEnhancedVoiceFile(voicePath: string): Promise<void> {
    try {
      console.log('🎤 Playing enhanced voice file:', voicePath);

      // Configure audio mode for maximum priority
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
      });

      // Create and play sound with looping
      const { sound } = await Audio.Sound.createAsync(
        { uri: voicePath.startsWith('file://') ? voicePath : `file://${voicePath}` },
        { 
          shouldPlay: true, 
          volume: 1.0,
          isLooping: true // Enhanced looping
        }
      );

      // Store sound reference for later control
      this.activeAlarms.set('currentSound', sound);

      console.log('✅ Enhanced voice file playing with looping');

    } catch (error) {
      console.error('❌ Error playing enhanced voice file:', error);
    }
  }

  /**
   * Start escalation timer for missed alarms
   */
  private startEscalationTimer(reminderId: string): void {
    console.log(`⏰ Starting escalation timer for: ${reminderId}`);

    // Escalate after 2 minutes if not responded to
    const escalationTimer = setTimeout(async () => {
      await this.escalateAlarm(reminderId);
    }, 2 * 60 * 1000); // 2 minutes

    this.escalationTimers.set(reminderId, escalationTimer);
  }

  /**
   * Escalate alarm for missed reminders
   */
  private async escalateAlarm(reminderId: string): Promise<void> {
    try {
      console.log(`🚨 Escalating alarm: ${reminderId}`);

      const alarm = this.activeAlarms.get(reminderId);
      if (!alarm) return;

      // Increase escalation count
      alarm.escalationCount = (alarm.escalationCount || 0) + 1;

      // Create more aggressive notification
      await this.scheduleEscalatedNotification(alarm);

      // Schedule next escalation
      if (alarm.escalationCount < 3) {
        setTimeout(() => {
          this.escalateAlarm(reminderId);
        }, 5 * 60 * 1000); // 5 minutes
      }

    } catch (error) {
      console.error('❌ Error escalating alarm:', error);
    }
  }

  /**
   * Schedule escalated notification
   */
  private async scheduleEscalatedNotification(alarm: any): Promise<void> {
    try {
      console.log('🚨 Scheduling escalated notification');

      const escalatedContent = {
        title: '🚨 RAPPEL MÉDICAMENT - ESCALATION',
        body: `⏰ URGENT: ${alarm.medicationName}\n📋 ${alarm.dosage}\n\n🔊 RÉPONDEZ IMMÉDIATEMENT!`,
        data: {
          type: 'medication_reminder',
          reminderId: alarm.reminderId,
          medicationName: alarm.medicationName,
          dosage: alarm.dosage,
          localVoicePath: alarm.localVoicePath,
          isEscalated: true,
          escalationCount: alarm.escalationCount,
        },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        sticky: true,
        autoDismiss: false,
        vibrate: [0, 2000, 1000, 2000], // More aggressive vibration
      };

      // Schedule immediate escalated notification
      await Notifications.scheduleNotificationAsync({
        content: escalatedContent,
        trigger: null, // Immediate
      });

    } catch (error) {
      console.error('❌ Error scheduling escalated notification:', error);
    }
  }

  /**
   * Handle medication taken
   */
  private async handleMedicationTaken(reminderId: string): Promise<void> {
    try {
      console.log(`✅ Enhanced medication taken: ${reminderId}`);

      // Stop current sound
      await this.stopCurrentSound();

      // Stop vibration
      Vibration.cancel();

      // Clear escalation timer
      const timer = this.escalationTimers.get(reminderId);
      if (timer) {
        clearTimeout(timer);
        this.escalationTimers.delete(reminderId);
      }

      // Remove from active alarms
      this.activeAlarms.delete(reminderId);

      // Use your existing service
      await localReminderService.confirmReminderLocally(reminderId);

      console.log(`✅ Enhanced medication taken handled: ${reminderId}`);

    } catch (error) {
      console.error('❌ Error handling medication taken:', error);
    }
  }

  /**
   * Handle medication snoozed
   */
  private async handleMedicationSnoozed(reminderId: string): Promise<void> {
    try {
      console.log(`⏰ Enhanced medication snoozed: ${reminderId}`);

      // Stop current sound
      await this.stopCurrentSound();

      // Stop vibration
      Vibration.cancel();

      // Clear escalation timer
      const timer = this.escalationTimers.get(reminderId);
      if (timer) {
        clearTimeout(timer);
        this.escalationTimers.delete(reminderId);
      }

      // Remove from active alarms
      this.activeAlarms.delete(reminderId);

      // Use your existing service
      await localReminderService.snoozeReminderLocally(reminderId);

      console.log(`✅ Enhanced medication snoozed handled: ${reminderId}`);

    } catch (error) {
      console.error('❌ Error handling medication snoozed:', error);
    }
  }

  /**
   * Stop current sound playback
   */
  private async stopCurrentSound(): Promise<void> {
    try {
      const currentSound = this.activeAlarms.get('currentSound');
      if (currentSound) {
        await currentSound.stopAsync();
        await currentSound.unloadAsync();
        this.activeAlarms.delete('currentSound');
        console.log('🔇 Enhanced voice playback stopped');
      }
    } catch (error) {
      console.error('❌ Error stopping current sound:', error);
    }
  }

  /**
   * Schedule enhanced alarm using multiple strategies
   */
  async scheduleEnhancedAlarm(
    reminderId: string,
    medicationName: string,
    dosage: string,
    scheduledDate: Date,
    voicePath?: string
  ): Promise<string> {
    try {
      console.log('🚨 Scheduling enhanced alarm:', reminderId);

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

      // Strategy 2: Use Notifee for Android exact alarms
      if (Platform.OS === 'android') {
        console.log('📱 Using Notifee for Android exact alarms');
        return await this.scheduleWithNotifee(reminderId, medicationName, dosage, scheduledDate, voicePath);
      }

      // Strategy 3: Use your existing aggressive notification service
      console.log('📱 Using enhanced aggressive notifications');
      return await aggressiveNotificationService.scheduleAggressiveAlarm(
        reminderId,
        medicationName,
        dosage,
        scheduledDate,
        voicePath
      );

    } catch (error) {
      console.error('❌ Error scheduling enhanced alarm:', error);
      throw error;
    }
  }

  /**
   * Schedule with Notifee for Android exact alarms
   */
  private async scheduleWithNotifee(
    reminderId: string,
    medicationName: string,
    dosage: string,
    scheduledDate: Date,
    voicePath?: string
  ): Promise<string> {
    try {
      // Create notification channel for medication alarms
      const channelId = await notifee.createChannel({
        id: 'enhanced-medication-alarms',
        name: 'Enhanced Medication Alarms',
        description: 'Critical medication reminder alarms with enhanced behavior',
        importance: 4, // High importance
        sound: 'default',
        vibration: true,
        vibrationPattern: [0, 1000, 1000, 1000],
        lights: true,
        lightColor: '#FF0000',
        bypassDnd: true, // Bypass Do Not Disturb
      });

      // Create enhanced notification
      const notificationId = await notifee.createTriggerNotification(
        {
          id: reminderId,
          title: '🚨 RAPPEL MÉDICAMENT URGENT',
          body: `⏰ Il est temps de prendre: ${medicationName}\n📋 ${dosage}\n\n🔊 Appuyez pour confirmer`,
          data: {
            type: 'medication_reminder',
            reminderId,
            medicationName,
            dosage,
            localVoicePath: voicePath,
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

      console.log(`✅ Enhanced Notifee alarm scheduled: ${notificationId}`);
      return notificationId;

    } catch (error) {
      console.error('❌ Error scheduling with Notifee:', error);
      throw error;
    }
  }

  /**
   * Cancel enhanced alarm
   */
  async cancelEnhancedAlarm(reminderId: string): Promise<void> {
    try {
      console.log(`🗑️ Cancelling enhanced alarm: ${reminderId}`);

      // Cancel Notifee notification
      await notifee.cancelNotification(reminderId);

      // Cancel Expo notification
      await Notifications.cancelScheduledNotificationAsync(reminderId);

      // Clear escalation timer
      const timer = this.escalationTimers.get(reminderId);
      if (timer) {
        clearTimeout(timer);
        this.escalationTimers.delete(reminderId);
      }

      // Remove from active alarms
      this.activeAlarms.delete(reminderId);

      console.log(`✅ Enhanced alarm cancelled: ${reminderId}`);

    } catch (error) {
      console.error('❌ Error cancelling enhanced alarm:', error);
    }
  }

  /**
   * Cancel all enhanced alarms
   */
  async cancelAllEnhancedAlarms(): Promise<void> {
    try {
      console.log('🗑️ Cancelling all enhanced alarms...');

      // Cancel all Notifee notifications
      await notifee.cancelAllNotifications();

      // Cancel all Expo notifications
      await Notifications.cancelAllScheduledNotificationsAsync();

      // Clear all escalation timers
      this.escalationTimers.forEach(timer => clearTimeout(timer));
      this.escalationTimers.clear();

      // Clear all active alarms
      this.activeAlarms.clear();

      console.log('✅ All enhanced alarms cancelled');

    } catch (error) {
      console.error('❌ Error cancelling all enhanced alarms:', error);
    }
  }

  /**
   * Get enhanced alarm statistics
   */
  getEnhancedAlarmStatistics(): { active: number; escalated: number } {
    const active = this.activeAlarms.size;
    const escalated = Array.from(this.activeAlarms.values())
      .filter(alarm => alarm.escalationCount > 0).length;

    return { active, escalated };
  }

  /**
   * Check if service is available
   */
  isAvailable(): boolean {
    return this.isInitialized;
  }
}

export default new EnhancedAlarmSystem();
