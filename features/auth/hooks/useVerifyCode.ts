import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { verifyResetCode, requestPasswordReset } from '../../../shared/services/api/auth';
import { extractErrorMessage } from '../../../shared/utils/errorHandling';

export function useVerifyCode() {
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [userType, setUserType] = useState<'medecin' | 'tuteur' | null>(null);
  const inputRefs = useRef<any[]>([]);

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

  const startResendCooldown = () => {
    setResendCooldown(60);
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleVerifyCode = async (
    code: string,
    emailOrPhone: string,
    onSuccess: (code: string) => void,
    onError: (error: string) => void
  ) => {
    if (!emailOrPhone) {
      onError('Email or phone number is required');
      return;
    }
    
    if (code.length !== 4) {
      onError('Please enter 4-digit code');
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await verifyResetCode(emailOrPhone, code);
      setIsLoading(false);
      
      if (result.success) {
        onSuccess(code);
      } else {
        onError('Invalid verification code');
      }
    } catch (error: any) {
      setIsLoading(false);
      console.error('Verification error:', error);
      const errorMessage = extractErrorMessage(error, 'Code verification failed');
      onError(errorMessage);
    }
  };

  const handleResendCode = async (
    emailOrPhone: string,
    onSuccess: () => void,
    onError: (error: string) => void
  ) => {
    if (resendCooldown > 0) return;

    if (!emailOrPhone) {
      onError('Email or phone number is required');
      return;
    }

    try {
      const result = await requestPasswordReset(emailOrPhone);

      if (result.success) {
        onSuccess();
        startResendCooldown();
      } else {
        onError(result.message || 'Failed to resend code');
      }
    } catch (error: any) {
      console.error('Resend code error:', error);
      onError('Failed to resend code');
    }
  };

  return {
    isLoading,
    resendCooldown,
    userType,
    inputRefs,
    handleVerifyCode,
    handleResendCode,
  };
}

