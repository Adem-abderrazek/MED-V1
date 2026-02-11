import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Vibration, Platform } from 'react-native';
import { Audio } from 'expo-av';
import notifee from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import localReminderService from '../../../shared/services/localReminderService';
import apiService from '../../../shared/services/api';
import { offlineQueueService } from '../../../shared/services/offlineQueueService';
import { networkMonitor } from '../../../shared/services/networkMonitor';

const MEDS_CACHE_PREFIX = '@patient_medications_by_date:';
const STATS_CACHE_PREFIX = '@patient_medication_stats_by_date:';

interface UseMedicationAlarmParams {
  reminderId: string;
  audioPath?: string;
}

const updateCachedMedicationStatus = async (reminderIds: string[]) => {
  try {
    const reminderSet = new Set(reminderIds);
    const keys = await AsyncStorage.getAllKeys();
    const medsKeys = keys.filter(key => key.startsWith(MEDS_CACHE_PREFIX));

    for (const medsKey of medsKeys) {
      const medsJson = await AsyncStorage.getItem(medsKey);
      if (!medsJson) continue;

      const meds = JSON.parse(medsJson) as Array<{ reminderId: string; status: string }>;
      let updated = false;
      const updatedMeds = meds.map(med => {
        if (reminderSet.has(med.reminderId) && med.status !== 'taken') {
          updated = true;
          return { ...med, status: 'taken' };
        }
        return med;
      });

      if (!updated) continue;

      await AsyncStorage.setItem(medsKey, JSON.stringify(updatedMeds));

      const dateKey = medsKey.replace(MEDS_CACHE_PREFIX, '');
      const total = updatedMeds.length;
      const taken = updatedMeds.filter(med => med.status === 'taken').length;
      const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 0;
      const statsKey = `${STATS_CACHE_PREFIX}${dateKey}`;
      await AsyncStorage.setItem(
        statsKey,
        JSON.stringify({ totalMedicationsToday: total, takenToday: taken, adherenceRate })
      );
    }
  } catch (error) {
    console.error('Error updating cached medication status:', error);
  }
};

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
      await updateCachedMedicationStatus([reminderId]);
      await AsyncStorage.setItem('@patient_dashboard_refresh', new Date().toISOString());

      const token = await AsyncStorage.getItem('userToken');
      if (token && reminderId) {
        const isOnline = await networkMonitor.isOnline();
        if (isOnline) {
          try {
            await apiService.confirmMedicationTaken(token, [reminderId]);
            console.log('✅ Medication confirmed with backend');
          } catch (error) {
            console.error('Failed to sync with backend, will retry later:', error);
            await offlineQueueService.addAction('confirm', reminderId);
          }
        } else {
          await offlineQueueService.addAction('confirm', reminderId);
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

