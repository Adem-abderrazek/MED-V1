import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';

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

  return { token, isLoading };
}

