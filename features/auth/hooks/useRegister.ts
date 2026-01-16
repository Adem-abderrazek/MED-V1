import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { register } from '../../../shared/services/api/auth';
import { extractErrorMessage } from '../../../shared/utils/errorHandling';
import { RegisterData } from '../../../shared/types/auth.types';
import { RegisterFormData } from '../components/RegisterForm';

export function useRegister() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateAge = (date: Date): boolean => {
    const today = new Date();
    const age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
      return age - 1 >= 13;
    }
    return age >= 13;
  };

  const validateForm = (formData: RegisterFormData, phoneValidation: { isValid: boolean } | null): { valid: boolean; errorKey?: string; errorMessage?: string } => {
    const { firstName, lastName, phoneNumber, email, password, confirmPassword, dateNaissance } = formData;

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phoneNumber.trim() || !password || !confirmPassword) {
      return { valid: false, errorKey: 'missingFields', errorMessage: t('auth.fillAllFields') };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(dateNaissance);
    selectedDate.setHours(0, 0, 0, 0);
    
    if (selectedDate.getTime() >= today.getTime()) {
      return { valid: false, errorKey: 'invalidDateOfBirth', errorMessage: t('auth.selectDateOfBirth') };
    }

    if (!validateAge(dateNaissance)) {
      return { valid: false, errorKey: 'invalidAge', errorMessage: t('auth.invalidAgeMessage') };
    }

    if (!validateEmail(email)) {
      return { valid: false, errorKey: 'invalidEmail', errorMessage: t('auth.invalidEmailMessage') };
    }

    if (!phoneValidation || !phoneValidation.isValid) {
      return { valid: false, errorKey: 'invalidPhone', errorMessage: t('auth.invalidPhoneMessage') };
    }

    if (password !== confirmPassword) {
      return { valid: false, errorKey: 'passwordsDontMatch', errorMessage: t('auth.passwordsDontMatchMessage') };
    }

    if (password.length < 6) {
      return { valid: false, errorKey: 'weakPassword', errorMessage: t('auth.weakPasswordMessage') };
    }

    if (!formData.acceptedTerms) {
      return { valid: false, errorKey: 'termsRequired', errorMessage: t('auth.acceptTermsMessage') || 'You must accept the terms of use and privacy policy to continue.' };
    }

    return { valid: true };
  };

  const handleRegister = async (
    formData: RegisterFormData,
    phoneValidation: { isValid: boolean; e164: string } | null,
    onSuccess: () => void,
    onError: (errorKey: string, errorMessage: string) => void
  ) => {
    const validation = validateForm(formData, phoneValidation);
    if (!validation.valid) {
      onError(
        validation.errorKey || 'registrationError',
        validation.errorMessage || t('auth.accountCreationError')
      );
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: phoneValidation!.e164,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        userType: formData.userType,
      });

      setIsLoading(false);
      
      if (result.success) {
        onSuccess();
      } else {
        onError('registrationError', result.message || t('auth.accountCreationError'));
      }
    } catch (error: any) {
      setIsLoading(false);
      console.error('Registration error:', error);
      const errorMessage = extractErrorMessage(error, t('auth.accountCreationError'));
      onError('registrationError', errorMessage);
    }
  };

  return {
    isLoading,
    handleRegister,
  };
}


