import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Vibration,
  StatusBar,
  BackHandler,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Audio } from 'expo-av';
import notifee from '@notifee/react-native';
import localReminderService from '../services/localReminderService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../services/api';
import * as FileSystem from 'expo-file-system/legacy';

const { width, height } = Dimensions.get('window');

interface AlarmParams {
  medicationName?: string;
  dosage?: string;
  instructions?: string;
  reminderId?: string;
  patientId?: string;
  audioPath?: string;
}

// Green theme colors matching patient dashboard
const COLORS = {
  primary: '#10B981',
  primaryLight: '#34D399',
  primaryDark: '#059669',
  background: ['#1a1a2e', '#1B2E1F', '#1D3020'] as const,
  cardBg: ['rgba(16, 185, 129, 0.1)', 'rgba(16, 185, 129, 0.05)'] as const,
  success: ['#10B981', '#059669'] as const,
  warning: ['#F59E0B', '#D97706'] as const,
};

export default function MedicationAlarmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<AlarmParams>();
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isProcessing, setIsProcessing] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [instructions, setInstructions] = useState(params.instructions || '');
  
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  
  const medicationName = params.medicationName || 'Médicament';
  const dosage = params.dosage || '';
  const reminderId = params.reminderId || '';
  
  // Fetch instructions from stored reminder if not provided in params
  useEffect(() => {
    const fetchInstructions = async () => {
      if (!instructions && reminderId) {
        try {
          // Try to get instructions from stored reminders
          const stored = await AsyncStorage.getItem('@medication_reminders');
          if (stored) {
            const reminders = JSON.parse(stored);
            const reminder = reminders[reminderId];
            if (reminder?.instructions) {
              setInstructions(reminder.instructions);
            }
          }
        } catch (error) {
          console.error('Error fetching instructions:', error);
        }
      }
    };
    fetchInstructions();
  }, [reminderId, instructions]);
  
  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Prevent back button from dismissing the alarm
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Prevent going back - user must interact with alarm
      return true;
    });
    return () => backHandler.remove();
  }, []);

  // Start animations when screen mounts
  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Scale in animation
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();

    // Pulsing animation for icon
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    return () => {
      pulseAnimation.stop();
    };
  }, []);

  // Start vibration and play audio when alarm screen shows
  useEffect(() => {
    // Start continuous vibration pattern
    const vibrationPattern = [0, 1000, 500, 1000, 500, 1000, 500, 1000];
    Vibration.vibrate(vibrationPattern, true); // true = repeat

    const playSound = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: false,
          playThroughEarpieceAndroid: false,
        });

        // Try to play the doctor's voice message if we have an audio path
        if (params.audioPath && params.audioPath.trim() !== '') {
          console.log('🎵 Attempting to play doctor voice message');
          console.log('📁 Audio path:', params.audioPath);
          
          // Check if file exists (for local paths)
          let audioUri = params.audioPath;
          
          // If it's a local file path, ensure it has file:// prefix
          if (audioUri.startsWith('/') && !audioUri.startsWith('file://')) {
            audioUri = `file://${audioUri}`;
            console.log('🔗 Converted to file URI:', audioUri);
          }
          
          // Verify file exists for local paths
          if (audioUri.startsWith('file://')) {
            try {
              const fileInfo = await FileSystem.getInfoAsync(audioUri.replace('file://', ''));
              if (!fileInfo.exists) {
                console.error('❌ Audio file does not exist at path:', audioUri);
                console.log('🔔 Falling back - file not found');
                return;
              }
              console.log('✅ Audio file exists, size:', fileInfo.size, 'bytes');
            } catch (fileCheckError) {
              console.error('❌ Error checking file existence:', fileCheckError);
            }
          }
          
          try {
            console.log('▶️ Creating audio player with URI:', audioUri);
            const { sound: voiceSound } = await Audio.Sound.createAsync(
              { uri: audioUri },
              { 
                shouldPlay: true, 
                isLooping: false, // Don't loop - play once
                volume: 1.0,
                rate: 1.0,
                shouldCorrectPitch: true,
              }
            );
            setSound(voiceSound);
            console.log('✅ Voice message started playing successfully');
            
            // Set up playback status listener to detect when audio finishes
            voiceSound.setOnPlaybackStatusUpdate((status: any) => {
              if (status.isLoaded) {
                if (status.didJustFinish) {
                  console.log('✅ Voice message finished playing');
                  // Optionally replay if needed, or just let it finish
                }
                if (status.error) {
                  console.error('❌ Playback error:', status.error);
                }
              }
            });
          } catch (audioError: any) {
            console.error('❌ Error loading/playing voice message:', audioError);
            console.error('❌ Error details:', {
              message: audioError?.message,
              name: audioError?.name,
              code: audioError?.code,
              uri: audioUri,
            });
            // Fallback: try to play default sound
            console.log('🔔 Falling back to default alarm sound');
          }
        } else {
          console.log('🔔 No voice message path provided (audioPath is empty or null)');
        }
      } catch (error: any) {
        console.error('❌ Error setting up audio:', error);
        console.error('❌ Error details:', {
          message: error?.message,
          name: error?.name,
        });
      }
    };

    // Play sound immediately when alarm shows
    playSound();

    return () => {
      Vibration.cancel();
      if (sound) {
        sound.unloadAsync().catch(err => console.error('Error unloading sound:', err));
      }
    };
  }, [params.audioPath]);

  const handleConfirm = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      // Stop vibration
      Vibration.cancel();

      // Stop any playing sound
      if (sound) {
        await sound.stopAsync();
      }

      // Cancel the notifee notification (Android)
      if (Platform.OS === 'android' && reminderId) {
        try {
          await notifee.cancelNotification(reminderId);
        } catch (e) {
          console.log('Could not cancel notifee notification:', e);
        }
      }

      // Confirm locally
      await localReminderService.confirmReminderLocally(reminderId);

      // Sync with backend
      const token = await AsyncStorage.getItem('userToken');
      if (token && reminderId) {
        try {
          await apiService.confirmMedicationTaken(token, [reminderId]);
          console.log('✅ Medication confirmed with backend');
        } catch (error) {
          console.error('Failed to sync with backend, will retry later:', error);
          // Queue for offline sync
          const pending = await AsyncStorage.getItem('@pending_confirmations');
          const list = pending ? JSON.parse(pending) : [];
          list.push({ reminderId, timestamp: new Date().toISOString() });
          await AsyncStorage.setItem('@pending_confirmations', JSON.stringify(list));
        }
      }

      // Navigate back to dashboard
      router.replace('/patient-dashboard');
    } catch (error) {
      console.error('Error confirming medication:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [reminderId, router, isProcessing, sound]);

  const handleSnooze = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      // Stop vibration
      Vibration.cancel();

      // Stop any playing sound
      if (sound) {
        await sound.stopAsync();
      }

      // Cancel the notifee notification (Android)
      if (Platform.OS === 'android' && reminderId) {
        try {
          await notifee.cancelNotification(reminderId);
        } catch (e) {
          console.log('Could not cancel notifee notification:', e);
        }
      }

      // Snooze locally - will reschedule for 5 minutes
      await localReminderService.snoozeReminderLocally(reminderId);

      // Sync snooze with backend
      const token = await AsyncStorage.getItem('userToken');
      if (token && reminderId) {
        try {
          await apiService.snoozeMedicationReminder(token, [reminderId]);
          console.log('✅ Medication snoozed with backend');
        } catch (error) {
          console.error('Failed to sync snooze with backend, will retry later:', error);
        }
      }

      // Navigate back to dashboard
      router.replace('/patient-dashboard');
    } catch (error) {
      console.error('Error snoozing alarm:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [router, isProcessing, reminderId, sound]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Africa/Tunis'
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1B2E1F" />
      <LinearGradient
        colors={COLORS.background}
        style={styles.gradient}
      >
        <Animated.View 
          style={[
            styles.contentContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Pulsing medication icon with animation */}
          <View style={styles.iconContainer}>
            <Animated.View 
              style={[
                styles.pulseRing,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            />
            <Animated.View 
              style={[
                styles.iconCircle,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <Ionicons name="medical" size={64} color="white" />
            </Animated.View>
          </View>

          {/* Current time */}
          <Text style={styles.timeText}>{formatTime(currentTime)}</Text>

          {/* Medication info card with gradient */}
          <LinearGradient
            colors={COLORS.cardBg}
            style={styles.medicationCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.alarmLabel}>💊 RAPPEL MÉDICAMENT</Text>
            <Text style={styles.medicationName}>{medicationName}</Text>
            {dosage && <Text style={styles.dosageText}>{dosage}</Text>}
            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionsLabel}>📋 Instructions:</Text>
              <Text style={styles.instructionsText}>
                {instructions || 'Prenez votre médicament selon les instructions de votre médecin'}
              </Text>
            </View>
          </LinearGradient>

          {/* Action buttons */}
          <View style={styles.buttonsContainer}>
            {/* Confirm button with gradient */}
            <TouchableOpacity
              style={styles.buttonContainer}
              onPress={handleConfirm}
              disabled={isProcessing}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={COLORS.success}
                style={styles.button}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="checkmark-circle" size={32} color="white" />
                <Text style={styles.buttonText}>J'ai pris</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Snooze button with gradient */}
            <TouchableOpacity
              style={styles.buttonContainer}
              onPress={handleSnooze}
              disabled={isProcessing}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={COLORS.warning}
                style={styles.button}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="time" size={32} color="white" />
                <Text style={styles.buttonText}>5 min</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Doctor's message indicator - only show if audio is playing */}
          {params.audioPath && sound && (
            <Animated.View 
              style={[
                styles.audioIndicator,
                {
                  opacity: fadeAnim,
                },
              ]}
            >
              <Ionicons name="volume-high" size={20} color={COLORS.primary} />
              <Text style={styles.audioText}>Message du médecin en cours...</Text>
            </Animated.View>
          )}
        </Animated.View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  contentContainer: {
    width: '100%',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 32,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 160,
    height: 160,
  },
  pulseRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
  timeText: {
    fontSize: 52,
    fontWeight: '300',
    color: 'white',
    marginBottom: 40,
    letterSpacing: 3,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  medicationCard: {
    borderRadius: 24,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    marginBottom: 48,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  alarmLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 16,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  medicationName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  dosageText: {
    fontSize: 22,
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '600',
  },
  instructionsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(16, 185, 129, 0.3)',
    width: '100%',
  },
  instructionsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  instructionsText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 16,
    marginBottom: 32,
    gap: 16,
  },
  buttonContainer: {
    flex: 1,
    maxWidth: 160,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 20,
    minHeight: 64,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  audioIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  audioText: {
    color: COLORS.primary,
    fontSize: 14,
    marginLeft: 10,
    fontWeight: '600',
  },
});

