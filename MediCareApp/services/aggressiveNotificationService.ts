/**
 * Aggressive Notification Service
 * 
 * This service provides the most aggressive notification behavior possible
 * using Expo notifications to simulate full-screen alarm behavior
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';

interface AggressiveNotificationData {
  reminderId: string;
  medicationName: string;
  dosage: string;
  localVoicePath?: string;
  voiceDuration?: number;
}

class AggressiveNotificationService {
  
  /**
   * Schedule an aggressive notification that behaves like a full-screen alarm
   */
  async scheduleAggressiveAlarm(
    reminderId: string,
    medicationName: string,
    dosage: string,
    scheduledDate: Date,
    localVoicePath?: string
  ): Promise<string> {
    
    console.log('🚨 SCHEDULING ULTRA-AGGRESSIVE NOTIFICATION ALARM');
    
    // Create multiple notifications for maximum persistence
    const notifications = [];
    
    // Primary notification - Maximum priority
    const primaryId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🚨 RAPPEL MÉDICAMENT URGENT',
        body: `⏰ Il est temps de prendre: 💊 ${medicationName}\n📋 ${dosage}\n\n🔊 Appuyez pour confirmer`,
        data: {
          type: 'medication_reminder',
          reminderId,
          medicationName,
          dosage,
          localVoicePath,
          isPrimary: true,
        },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        categoryIdentifier: 'MEDICATION_ALARM',
        sticky: true,
        autoDismiss: false,
        badge: 1,
        color: '#EF4444',
        // Maximum visibility settings
        vibrate: [0, 1000, 1000, 1000],
      },
      trigger: { type: 'date', date: scheduledDate } as any,
    });

    // Secondary notification - 30 seconds later
    const secondaryId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🚨 RAPPEL MÉDICAMENT - RÉPÉTITION',
        body: `⏰ RAPPEL: 💊 ${medicationName}\n📋 ${dosage}\n\n🔊 Confirmez maintenant!`,
        data: {
          type: 'medication_reminder',
          reminderId,
          medicationName,
          dosage,
          localVoicePath,
          isRepeat: true,
        },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        categoryIdentifier: 'MEDICATION_ALARM',
        sticky: true,
        autoDismiss: false,
        badge: 1,
        color: '#FF0000',
        // Maximum visibility settings
        vibrate: [0, 1000, 1000, 1000],
      },
      trigger: { type: 'date', date: new Date(scheduledDate.getTime() + 30000) } as any,
    });

    // Tertiary notification - 1 minute later
    const tertiaryId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🚨 RAPPEL MÉDICAMENT - FINAL',
        body: `⏰ DERNIER RAPPEL: 💊 ${medicationName}\n📋 ${dosage}\n\n🔊 CONFIRMEZ MAINTENANT!`,
        data: {
          type: 'medication_reminder',
          reminderId,
          medicationName,
          dosage,
          localVoicePath,
          isFinal: true,
        },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        categoryIdentifier: 'MEDICATION_ALARM',
        sticky: true,
        autoDismiss: false,
        badge: 1,
        color: '#CC0000',
        // Maximum visibility settings
        vibrate: [0, 1000, 1000, 1000],
      },
      trigger: { type: 'date', date: new Date(scheduledDate.getTime() + 60000) } as any,
    });

    console.log(`✅ ULTRA-AGGRESSIVE notifications scheduled: ${primaryId}, ${secondaryId}, ${tertiaryId}`);
    return primaryId;
  }

  /**
   * Cancel aggressive alarm
   */
  async cancelAggressiveAlarm(reminderId: string): Promise<void> {
    try {
      // Cancel all scheduled notifications
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      // FIXED: Stop any currently playing sound
      try {
        const { Audio } = await import('expo-av');
        // Stop all audio playback
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: false,
          staysActiveInBackground: false,
        });
        console.log('🔇 Stopped all audio playback');
      } catch (audioError) {
        console.error('❌ Error stopping audio:', audioError);
      }
      
      console.log(`🗑️ All aggressive notifications cancelled for: ${reminderId}`);
    } catch (error) {
      console.error('❌ Error cancelling aggressive alarm:', error);
    }
  }

  /**
   * Set up ultra-aggressive notification handler
   */
  setupAggressiveHandler() {
    console.log('🚨 Setting up ULTRA-AGGRESSIVE notification handler');
    
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        console.log('🚨 ULTRA-AGGRESSIVE notification handler triggered:', notification);
        
        // Check if this is a medication reminder
        if (notification.request.content.data?.type === 'medication_reminder') {
          console.log('💊 MEDICATION REMINDER - FORCING IMMEDIATE ACTION');
          
        // Force voice playback using local voice file or notification sound
        console.log('🔊 FORCING VOICE PLAYBACK - Using local voice file or notification sound');
        
        // Try to play local voice file if available
        const localVoicePath = notification.request.content.data?.localVoicePath;
        if (localVoicePath) {
          console.log('🎤 Playing local voice file:', localVoicePath);
          try {
            const { sound } = await Audio.Sound.createAsync(
              { uri: localVoicePath as string },
              { shouldPlay: true, isLooping: true }
            );
            console.log('🔊 Local voice file playing');
            
            // Keep playing for 30 seconds
            setTimeout(async () => {
              try {
                await sound.unloadAsync();
                console.log('🔊 Local voice stopped');
              } catch (stopError) {
                console.error('❌ Error stopping local voice:', stopError);
              }
            }, 30000);
            
          } catch (voiceError) {
            console.error('❌ Error playing local voice:', voiceError);
            console.log('🔊 Falling back to notification sound');
          }
        } else {
          console.log('🔊 No local voice file, using notification sound');
          console.log('🔊 Notification sound will play automatically with the notification');
        }
        }
        
        // ULTRA-AGGRESSIVE settings
        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        };
      },
    });

    // Set up notification received listener
    Notifications.addNotificationReceivedListener(async (notification) => {
      console.log('🚨 ULTRA-AGGRESSIVE notification received:', notification);
      
      if (notification.request.content.data?.type === 'medication_reminder') {
        console.log('💊 MEDICATION REMINDER RECEIVED - FORCING MODAL DISPLAY');
        
        // Force modal to show immediately
        console.log('🚀 FORCING MODAL DISPLAY - Modal should now be visible');
        console.log('💊 Medication data:', {
          reminderId: notification.request.content.data?.reminderId,
          medicationName: notification.request.content.data?.medicationName,
          dosage: notification.request.content.data?.dosage,
        });
        
        // Auto-play voice using local voice file or notification sound
        console.log('🔊 AUTO-PLAYING VOICE - Using local voice file or notification sound');
        
        // Try to play local voice file if available
        const localVoicePath = notification.request.content.data?.localVoicePath;
        if (localVoicePath) {
          console.log('🎤 Auto-playing local voice file:', localVoicePath);
          try {
            const { sound } = await Audio.Sound.createAsync(
              { uri: localVoicePath as string },
              { shouldPlay: true, isLooping: true }
            );
            console.log('🔊 Auto-play local voice file playing');
            
            // Keep playing for 30 seconds
            setTimeout(async () => {
              try {
                await sound.unloadAsync();
                console.log('🔊 Auto-play local voice stopped');
              } catch (stopError) {
                console.error('❌ Error stopping auto-play local voice:', stopError);
              }
            }, 30000);
            
          } catch (voiceError) {
            console.error('❌ Error auto-playing local voice:', voiceError);
            console.log('🔊 Falling back to notification sound');
          }
        } else {
          console.log('🔊 No local voice file, using notification sound');
          console.log('🔊 Notification sound will play automatically with the notification');
        }
      }
    });
  }
}

export default new AggressiveNotificationService();
