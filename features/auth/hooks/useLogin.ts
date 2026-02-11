import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login, registerPushToken } from '../../../shared/services/api/auth';
import { extractErrorMessage } from '../../../shared/utils/errorHandling';
import { LoginCredentials } from '../../../shared/types/auth.types';
import { notificationService } from '../../../shared/services/notificationService';
import { getNotificationPermissionStatus } from '../../../shared/services/permissionService';

const STORAGE_KEYS = {
  REMEMBER_ME: '@medicare_remember_me',
  SAVED_EMAIL: '@medicare_saved_email',
  SAVED_PASSWORD: '@medicare_saved_password',
};

export function useLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [savedCredentials, setSavedCredentials] = useState<{
    email: string;
    password: string;
    rememberMe: boolean;
  } | null>(null);

  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        const savedRememberMe = await AsyncStorage.getItem(STORAGE_KEYS.REMEMBER_ME);
        if (savedRememberMe === 'true') {
          const savedEmail = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_EMAIL);
          const savedPassword = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_PASSWORD);
          
          if (savedEmail && savedPassword) {
            setSavedCredentials({
              email: savedEmail,
              password: savedPassword,
              rememberMe: true,
            });
          }
        }
      } catch (error) {
        console.error('Error loading saved credentials:', error);
      } finally {
        setIsInitialLoad(false);
      }
    };

    loadSavedCredentials();
  }, []);

  const formatEmailOrPhone = (email: string): string => {
    let emailOrPhone = email.trim();
    
    const isEmail = emailOrPhone.includes('@');
    
    if (!isEmail) {
      let cleanPhone = emailOrPhone.replace(/\D/g, '');
      
      if (cleanPhone.startsWith('216')) {
        emailOrPhone = '+' + cleanPhone;
      } else if (cleanPhone.startsWith('0')) {
        emailOrPhone = '+216' + cleanPhone.substring(1);
      } else {
        emailOrPhone = '+216' + cleanPhone;
      }
    }
    
    return emailOrPhone;
  };

  const handleLogin = async (
    credentials: LoginCredentials,
    onSuccess: (userType: string, user?: any) => void,
    onError: (error: string) => void
  ) => {
    if (!credentials.emailOrPhone || !credentials.password) {
      onError('Missing fields');
      return;
    }

    setIsLoading(true);
    
    try {
      const emailOrPhone = formatEmailOrPhone(credentials.emailOrPhone);
      
      const result = await login({
        emailOrPhone,
        password: credentials.password,
        rememberMe: credentials.rememberMe,
      });

      setIsLoading(false);
      
      // Handle different API response structures
      const token = result.token || result.data?.token;
      const user = result.user || result.data?.user;
      
      if (result.success && token) {
        // Save credentials if remember me is checked
        if (credentials.rememberMe) {
          await AsyncStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
          await AsyncStorage.setItem(STORAGE_KEYS.SAVED_EMAIL, emailOrPhone);
          await AsyncStorage.setItem(STORAGE_KEYS.SAVED_PASSWORD, credentials.password);
        } else {
          await AsyncStorage.multiRemove([
            STORAGE_KEYS.REMEMBER_ME,
            STORAGE_KEYS.SAVED_EMAIL,
            STORAGE_KEYS.SAVED_PASSWORD
          ]);
        }

        await AsyncStorage.setItem('userToken', token);
        if (user) {
          await AsyncStorage.setItem('userData', JSON.stringify(user));
        }

        try {
          const hasNotificationPermission = await getNotificationPermissionStatus();
          if (!hasNotificationPermission) {
            console.log('Skipping push token registration until notification permission is granted');
            onSuccess(user?.userType || '', user);
            return;
          }

          let pushToken = notificationService.getPushToken();
          if (!pushToken) {
            pushToken = await notificationService.initialize();
          }
          if (pushToken) {
            await registerPushToken(token, pushToken);
          } else {
            console.log('WARN No push token available after login');
          }
        } catch (tokenError) {
          console.error('Error registering push token after login:', tokenError);
        }
        
        onSuccess(user?.userType || '', user);
      } else {
        onError(result.message || 'Login failed');
      }
    } catch (error: any) {
      setIsLoading(false);
      console.error('Login error:', error);
      const errorMessage = extractErrorMessage(error, 'Login error');
      onError(errorMessage);
    }
  };

  return {
    isLoading,
    isInitialLoad,
    savedCredentials,
    handleLogin,
  };
}


