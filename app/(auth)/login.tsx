import React from 'react';
import { useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useLogin } from '../../features/auth/hooks/useLogin';
import LoginForm from '../../features/auth/components/LoginForm';
import CustomModal from '../../shared/components/ui/Modal';
import LanguagePickerModal from '../../shared/components/modals/LanguagePickerModal';
import { useLanguageChange } from '../../shared/hooks/useLanguageChange';
import { useModal } from '../../shared/hooks/useModal';

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { visible, modalData, showModal, hideModal } = useModal();
  const { currentLanguage, showLanguagePicker, setShowLanguagePicker, handleLanguageChange } = useLanguageChange();
  const { isLoading, isInitialLoad, savedCredentials, handleLogin } = useLogin();

  const onLoginSuccess = (userType: string, user?: any) => {
    // Show success modal with welcome message (like v1)
    if (user?.firstName) {
      showModal(
        'success',
        t('auth.loginSuccess'),
        `${user.firstName}! ${t('auth.welcomeMessage')}`
      );
      
      setTimeout(() => {
        hideModal();
        // Redirect to dashboard based on user type
        switch (userType) {
          case 'medecin':
          case 'tuteur':
            router.replace('/(doctor)/dashboard' as any);
            break;
          case 'patient':
            router.replace('/(patient)/dashboard' as any);
            break;
          default:
            showModal('error', t('common.error'), t('auth.loginError'));
        }
      }, 2000);
    } else {
      // If no user data, redirect immediately
      switch (userType) {
        case 'medecin':
        case 'tuteur':
          router.replace('/(doctor)/dashboard' as any);
          break;
        case 'patient':
          router.replace('/(patient)/dashboard' as any);
          break;
        default:
          showModal('error', t('common.error'), t('auth.loginError'));
      }
    }
  };

  const onLoginError = (error: string) => {
    showModal('error', t('auth.loginError'), error);
  };

  if (isInitialLoad) {
    return null; // Or a loading spinner
  }

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
              onPress={() => router.replace('/')}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('auth.login')}</Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            <Text style={styles.title}>{t('auth.login')}</Text>
            <Text style={styles.subtitle}>
              {t('landing.subSlogan')}
            </Text>

            <LoginForm
              initialEmail={savedCredentials?.email}
              initialPassword={savedCredentials?.password}
              initialRememberMe={savedCredentials?.rememberMe}
              onSubmit={(credentials) => handleLogin(credentials, onLoginSuccess, onLoginError)}
              isLoading={isLoading}
              onForgotPassword={() => router.push('/(auth)/forgot-password' as any)}
            />

            {/* Register Link */}
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>{t('auth.noAccount')} </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/register' as any)}>
                <Text style={styles.registerLink}>{t('auth.register')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>

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
      />
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
  formContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
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
    marginBottom: 40,
    lineHeight: 22,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
  },
  registerLink: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4facfe',
  },
});

