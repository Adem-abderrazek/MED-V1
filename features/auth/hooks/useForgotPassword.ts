import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestPasswordReset } from '../../../shared/services/api/auth';
import { extractErrorMessage } from '../../../shared/utils/errorHandling';

export function useForgotPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [userType, setUserType] = useState<'medecin' | 'tuteur' | null>(null);

  useEffect(() => {
    const loadUserType = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const user = JSON.parse(userData);
          setUserType(user.userType);
        }
      } catch (error) {
        console.error('Error loading user type:', error);
      }
    };
    loadUserType();
  }, []);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateTunisianPhone = (phone: string): boolean => {
    const cleanPhone = phone.replace(/\D/g, '');
    const mobilePattern = /^(?:\+216|216|0)?[2-5]\d{7}$/;
    const landlinePattern = /^(?:\+216|216|0)?[7-9]\d{7}$/;
    return mobilePattern.test(cleanPhone) || landlinePattern.test(cleanPhone);
  };

  const isEmail = (input: string): boolean => {
    return input.includes('@');
  };

  const handleSendVerification = async (
    emailOrPhone: string,
    onSuccess: (emailOrPhone: string, method: string) => void,
    onError: (error: string) => void
  ) => {
    if (!emailOrPhone.trim()) {
      onError('Missing fields');
      return;
    }

    if (isEmail(emailOrPhone)) {
      if (!validateEmail(emailOrPhone)) {
        onError('Invalid email');
        return;
      }
    } else {
      if (!validateTunisianPhone(emailOrPhone)) {
        onError('Invalid phone number');
        return;
      }
    }

    setIsLoading(true);
    
    try {
      const result = await requestPasswordReset(emailOrPhone);
      setIsLoading(false);
      
      if (result.success) {
        onSuccess(emailOrPhone, isEmail(emailOrPhone) ? 'email' : 'sms');
      } else {
        onError(result.message || 'An error occurred while sending the code.');
      }
    } catch (error: any) {
      setIsLoading(false);
      console.error('Forgot password error:', error);
      const errorMessage = extractErrorMessage(error, 'An error occurred while sending the code.');
      onError(errorMessage);
    }
  };

  return {
    isLoading,
    userType,
    handleSendVerification,
    validateEmail,
    validateTunisianPhone,
    isEmail,
  };
}

