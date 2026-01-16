import React from 'react';
import { useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRegister } from '../../features/auth/hooks/useRegister';
import RegisterForm, { RegisterFormData } from '../../features/auth/components/RegisterForm';
import { PhoneInputValue } from '../../shared/components/forms/InternationalPhoneInput';
import CustomModal from '../../shared/components/ui/Modal';
import LanguagePickerModal from '../../shared/components/modals/LanguagePickerModal';
import { useLanguageChange } from '../../shared/hooks/useLanguageChange';
import { useModal } from '../../shared/hooks/useModal';

export default function RegisterScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { visible, modalData, showModal, hideModal } = useModal();
  const { currentLanguage, showLanguagePicker, setShowLanguagePicker, handleLanguageChange } = useLanguageChange();
  const { isLoading, handleRegister } = useRegister();

  const onRegisterSuccess = () => {
    showModal('success', t('auth.accountCreated'), t('auth.accountCreatedMessage'));
    
    setTimeout(() => {
      hideModal();
      router.push('/(auth)/login' as any);
    }, 2000);
  };

  const onRegisterError = (errorKey: string, errorMessage: string) => {
    const title = t(`auth.${errorKey}`) || t('auth.registrationError');
    showModal('error', title, errorMessage);
  };

  const onSubmit = (formData: RegisterFormData, phoneValidation: PhoneInputValue | null) => {
    handleRegister(formData, phoneValidation, onRegisterSuccess, onRegisterError);
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.background}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          {/* Language Button */}
          <View style={styles.languageButtonContainer}>
            <TouchableOpacity
              style={styles.languageButton}
              onPress={() => setShowLanguagePicker(true)}
            >
              <Ionicons name="language" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('auth.registerTitle')}</Text>
          </View>

          {/* Form */}
          <View style={styles.content}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{t('auth.registerTitle')}</Text>
              <Text style={styles.subtitle}>{t('auth.registerSubtitle')}</Text>
            </View>

            <RegisterForm
              onSubmit={onSubmit}
              isLoading={isLoading}
              onTermsPress={() => router.push('/(shared)/terms' as any)}
              onPrivacyPress={() => router.push('/(shared)/privacy-policy' as any)}
            />

            {/* Login Link */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>{t('auth.alreadyHaveAccount')} </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login' as any)}>
                <Text style={styles.loginLink}>{t('auth.signIn')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>

        {/* Modals */}
        <CustomModal
          visible={visible}
          title={modalData.title}
          message={modalData.message}
          type={modalData.type}
          onClose={hideModal}
        />

        <LanguagePickerModal
          visible={showLanguagePicker}
          currentLanguage={currentLanguage}
          onSelect={handleLanguageChange}
          onClose={() => setShowLanguagePicker(false)}
          theme="patient"
        />
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  languageButtonContainer: {
    position: 'absolute',
    top: 10,
    right: 20,
    zIndex: 1000,
  },
  languageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  titleContainer: {
    marginBottom: 24,
    paddingTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 22,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  loginText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
  },
  loginLink: {
    color: '#4facfe',
    fontSize: 16,
    fontWeight: '600',
  },
});


