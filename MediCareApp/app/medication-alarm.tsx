import React, { useEffect, useState, useCallback } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import notifee from '@notifee/react-native';
import localReminderService from '../services/localReminderService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../services/api';

const { width, height } = Dimensions.get('window');

interface AlarmParams {
  medicationName?: string;
  dosage?: string;
  instructions?: string;
  reminderId?: string;
  patientId?: string;
  audioPath?: string;
}

export default function MedicationAlarmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<AlarmParams>();
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isProcessing, setIsProcessing] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  
  const medicationName = params.medicationName || 'Médicament';
  const dosage = params.dosage || '';
  const instructions = params.instructions || '';
  const reminderId = params.reminderId || '';
  
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
        if (params.audioPath) {
          console.log('🎵 Playing doctor voice message:', params.audioPath);
          const { sound: voiceSound } = await Audio.Sound.createAsync(
            { uri: params.audioPath },
            { shouldPlay: true, isLooping: true, volume: 1.0 }
          );
          setSound(voiceSound);
        } else {
          console.log('🔔 No voice message, using default alarm');
        }
      } catch (error) {
        console.error('Error playing audio:', error);
      }
    };

    playSound();

    return () => {
      Vibration.cancel();
      if (sound) {
        sound.unloadAsync();
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
      second: '2-digit'
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.gradient}
      >
        {/* Pulsing medication icon */}
        <View style={styles.iconContainer}>
          <View style={styles.pulseRing} />
          <View style={styles.iconCircle}>
            <Ionicons name="medical" size={64} color="white" />
          </View>
        </View>

        {/* Current time */}
        <Text style={styles.timeText}>{formatTime(currentTime)}</Text>

        {/* Medication info */}
        <View style={styles.medicationCard}>
          <Text style={styles.alarmLabel}>💊 RAPPEL MÉDICAMENT</Text>
          <Text style={styles.medicationName}>{medicationName}</Text>
          {dosage && <Text style={styles.dosageText}>{dosage}</Text>}
          {instructions && (
            <Text style={styles.instructionsText}>{instructions}</Text>
          )}
        </View>

        {/* Action buttons */}
        <View style={styles.buttonsContainer}>
          {/* Confirm button */}
          <TouchableOpacity
            style={[styles.button, styles.confirmButton]}
            onPress={handleConfirm}
            disabled={isProcessing}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={32} color="white" />
            <Text style={styles.buttonText}>J'ai pris</Text>
          </TouchableOpacity>

          {/* Snooze button */}
          <TouchableOpacity
            style={[styles.button, styles.snoozeButton]}
            onPress={handleSnooze}
            disabled={isProcessing}
            activeOpacity={0.8}
          >
            <Ionicons name="time" size={32} color="white" />
            <Text style={styles.buttonText}>5 min</Text>
          </TouchableOpacity>
        </View>

        {/* Doctor's message indicator */}
        <View style={styles.audioIndicator}>
          <Ionicons name="volume-high" size={20} color="#4facfe" />
          <Text style={styles.audioText}>Message du médecin en cours...</Text>
        </View>
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
  iconContainer: {
    marginBottom: 24,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(79, 172, 254, 0.3)',
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#4facfe',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#4facfe',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  timeText: {
    fontSize: 48,
    fontWeight: '300',
    color: 'white',
    marginBottom: 32,
    letterSpacing: 2,
  },
  medicationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    marginBottom: 48,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  alarmLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4facfe',
    marginBottom: 12,
    letterSpacing: 1,
  },
  medicationName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  dosageText: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 32,
    borderRadius: 16,
    minWidth: 140,
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  confirmButton: {
    backgroundColor: '#00c853',
    shadowColor: '#00c853',
  },
  snoozeButton: {
    backgroundColor: '#ff9800',
    shadowColor: '#ff9800',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  audioIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(79, 172, 254, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
  },
  audioText: {
    color: '#4facfe',
    fontSize: 14,
    marginLeft: 8,
  },
});

