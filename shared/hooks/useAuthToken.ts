import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { networkMonitor } from '../services/networkMonitor';
import { offlineQueueService } from '../services/offlineQueueService';
import localReminderService from '../services/localReminderService';

/**
 * Custom hook for managing authentication token
 * Automatically loads token from AsyncStorage on mount and when screen comes into focus
 * This ensures the token is always up-to-date after login
 * 
 * @returns Object with token and isLoading state
 */
export function useAuthToken(): { token: string | null; isLoading: boolean } {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadToken = useCallback(async () => {
    try {
      const storedToken = await AsyncStorage.getItem('userToken');
      setToken(storedToken);
    } catch (error) {
      console.error('Error loading token:', error);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load token on mount
  useEffect(() => {
    loadToken();
  }, [loadToken]);

  // Reload token when screen comes into focus (e.g., after login)
  useFocusEffect(
    useCallback(() => {
      loadToken();
    }, [loadToken])
  );

  useEffect(() => {
    const syncWhenTokenAvailable = async () => {
      if (!token) return;

      try {
        const online = await networkMonitor.isOnline();
        if (online) {
          await offlineQueueService.syncQueue(token);
        }

        const userData = await AsyncStorage.getItem('userData');
        const user = userData ? JSON.parse(userData) : null;
        const isPatient = user?.userType === 'patient';

        if (online && isPatient) {
          try {
            console.log('Starting reminder reconcile (token-load)');
            await localReminderService.reconcileReminders(token);
          } catch (error) {
            console.error('Error reconciling reminders after token load:', error);
          }
        }

      } catch (error) {
        console.error('Error syncing after token load:', error);
      }
    };

    syncWhenTokenAvailable();
  }, [token]);

  return { token, isLoading };
}





