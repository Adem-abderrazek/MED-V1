import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Vibration, Platform } from 'react-native';
import { Audio } from 'expo-av';
import notifee from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import localReminderService from '../../../shared/services/localReminderService';
import apiService from '../../../shared/services/api';

interface UseMedicationAlarmParams {
  reminderId: string;
  audioPath?: string;
}

export function useMedicationAlarm({ reminderId, audioPath }: UseMedicationAlarmParams) {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isProcessing, setIsProcessing] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const vibrationPattern = [0, 1000, 500, 1000, 500, 1000, 500, 1000];
    Vibration.vibrate(vibrationPattern, true);

    const playSound = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: false,
          playThroughEarpieceAndroid: false,
        });

        if (audioPath) {
          console.log('🎵 Playing doctor voice message:', audioPath);
          const { sound: voiceSound } = await Audio.Sound.createAsync(
            { uri: audioPath },
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
  }, [audioPath]);

  const handleConfirm = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      Vibration.cancel();

      if (sound) {
        await sound.stopAsync();
      }

      if (Platform.OS === 'android' && reminderId) {
        try {
          await notifee.cancelNotification(reminderId);
        } catch (e) {
          console.log('Could not cancel notifee notification:', e);
        }
      }

      await localReminderService.confirmReminderLocally(reminderId);

      const token = await AsyncStorage.getItem('userToken');
      if (token && reminderId) {
        try {
          await apiService.confirmMedicationTaken(token, [reminderId]);
          console.log('✅ Medication confirmed with backend');
        } catch (error) {
          console.error('Failed to sync with backend, will retry later:', error);
          const pending = await AsyncStorage.getItem('@pending_confirmations');
          const list = pending ? JSON.parse(pending) : [];
          list.push({ reminderId, timestamp: new Date().toISOString() });
          await AsyncStorage.setItem('@pending_confirmations', JSON.stringify(list));
        }
      }

      router.replace('/(patient)/dashboard');
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
      Vibration.cancel();

      if (sound) {
        await sound.stopAsync();
      }

      if (Platform.OS === 'android' && reminderId) {
        try {
          await notifee.cancelNotification(reminderId);
        } catch (e) {
          console.log('Could not cancel notifee notification:', e);
        }
      }

      await localReminderService.snoozeReminderLocally(reminderId);

      router.replace('/(patient)/dashboard');
    } catch (error) {
      console.error('Error snoozing alarm:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [router, isProcessing, reminderId, sound]);

  return {
    currentTime,
    isProcessing,
    handleConfirm,
    handleSnooze,
  };
}

