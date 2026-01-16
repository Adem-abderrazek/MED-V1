import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetPassword } from '../../../shared/services/api/auth';
import { extractErrorMessage } from '../../../shared/utils/errorHandling';

export function useResetPassword() {
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

  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, text: "", color: "" };

    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

    return { strength: score };
  };

  const validatePassword = (newPassword: string, confirmPassword: string): string | null => {
    if (!newPassword || !confirmPassword) {
      return 'Missing fields';
    }

    if (newPassword !== confirmPassword) {
      return 'Passwords do not match';
    }

    if (newPassword.length < 6) {
      return 'Password must be at least 6 characters';
    }

    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      return 'Password must contain uppercase, lowercase, and numbers';
    }

    return null;
  };

  const handleResetPassword = async (
    emailOrPhone: string,
    verificationCode: string,
    newPassword: string,
    confirmPassword: string,
    onSuccess: () => void,
    onError: (error: string) => void
  ) => {
    const validationError = validatePassword(newPassword, confirmPassword);
    if (validationError) {
      onError(validationError);
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await resetPassword(emailOrPhone, verificationCode, newPassword);
      setIsLoading(false);
      
      if (result.success) {
        onSuccess();
      } else {
        onError(result.message || 'Password reset failed');
      }
    } catch (error: any) {
      setIsLoading(false);
      console.error('Reset password error:', error);
      const errorMessage = extractErrorMessage(error, 'Password reset failed');
      onError(errorMessage);
    }
  };

  return {
    isLoading,
    userType,
    handleResetPassword,
    getPasswordStrength,
    validatePassword,
  };
}

