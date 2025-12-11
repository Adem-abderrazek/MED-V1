import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import VerificationModal from "../../components/modals/VerificationModal";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login } from '../../services/api/common';
import { useTranslation } from 'react-i18next';
import LanguagePickerModal from '../../components/modals/LanguagePickerModal';
import { extractErrorMessage } from '../../utils/errorHandling';
import { useLanguageChange } from '../../hooks/useLanguageChange';
import { useModal } from '../../hooks/useModal';

// Theme colors for different user types
const THEME_COLORS = {
  medecin: {
    primary: '#4facfe',
    gradient: ['#4facfe', '#00f2fe'] as [string, string],
  },
  tuteur: {
    primary: '#F97316',
    gradient: ['#F97316', '#FB923C'] as [string, string],
  },
  patient: {
    primary: '#10B981',
    gradient: ['#10B981', '#34D399'] as [string, string],
  },
  default: {
    primary: '#4facfe',
    gradient: ['#4facfe', '#00f2fe'] as [string, string],
  }
};

// Storage keys
const STORAGE_KEYS = {
  REMEMBER_ME: '@medicare_remember_me',
  SAVED_EMAIL: '@medicare_saved_email',
  SAVED_PASSWORD: '@medicare_saved_password',
};

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Use custom hooks for modal and language
  const { visible, modalData, showModal, hideModal } = useModal();
  const {
    currentLanguage,
    showLanguagePicker,
    setShowLanguagePicker,
    handleLanguageChange,
  } = useLanguageChange();

  // Load saved credentials on mount
  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        const savedRememberMe = await AsyncStorage.getItem(STORAGE_KEYS.REMEMBER_ME);
        if (savedRememberMe === 'true') {
          const savedEmail = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_EMAIL);
          const savedPassword = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_PASSWORD);
          
          if (savedEmail && savedPassword) {
            setEmail(savedEmail);
            setPassword(savedPassword);
            setRememberMe(true);
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


  const handleLogin = async () => {
    if (!email || !password) {
      showModal("error", t('auth.missingFields'), t('auth.fillAllFields'));
      return;
    }

    setIsLoading(true);
    
    try {
      // Format phone number if it's not an email
      let emailOrPhone = email.trim();
      
      // Check if it's an email
      const isEmail = emailOrPhone.includes('@');
      
      if (!isEmail) {
        // It's a phone number - format it with Tunisia country code
        let cleanPhone = emailOrPhone.replace(/\D/g, '');
        
        // Add Tunisia country code if not present
        if (cleanPhone.startsWith('216')) {
          emailOrPhone = '+' + cleanPhone;
        } else if (cleanPhone.startsWith('0')) {
          emailOrPhone = '+216' + cleanPhone.substring(1);
        } else {
          emailOrPhone = '+216' + cleanPhone;
        }
      }
      
      const result = await login(emailOrPhone, password);

      setIsLoading(false);
      
      if (result.success && result.token) {
        // Save credentials if remember me is checked
        if (rememberMe) {
          await AsyncStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
          await AsyncStorage.setItem(STORAGE_KEYS.SAVED_EMAIL, emailOrPhone);
          await AsyncStorage.setItem(STORAGE_KEYS.SAVED_PASSWORD, password);
        } else {
          // Clear saved credentials if remember me is unchecked
          await AsyncStorage.multiRemove([
            STORAGE_KEYS.REMEMBER_ME,
            STORAGE_KEYS.SAVED_EMAIL,
            STORAGE_KEYS.SAVED_PASSWORD
          ]);
        }

        await AsyncStorage.setItem('userToken', result.token);
        await AsyncStorage.setItem('userData', JSON.stringify(result.user));
        
        showModal(
          "success", 
          t('auth.loginSuccess'), 
          `${result.user?.firstName}! ${t('auth.welcomeMessage')}`
        );
        
        setTimeout(() => {
          hideModal();
          switch (result.user?.userType) {
            case 'medecin':
            case 'tuteur':
              // Both doctors and tutors use the same dashboard
              router.replace('/doctor/doctor-dashboard' as any);
              break;
            case 'patient':
              router.replace('/patient/patient-dashboard' as any);
              break;
            default:
              showModal(
                "error",
                t('common.error'),
                t('auth.loginError')
              );
          }
        }, 2000);
      } else {
        showModal("error", t('auth.loginError'), result.message || t('auth.invalidCredentials'));
      }
    } catch (error: any) {
      setIsLoading(false);
      console.error('Login error:', error);
      
      const errorMessage = extractErrorMessage(error, t('auth.loginError'));
      showModal("error", t('auth.loginError'), errorMessage);
    }
  };

  // Always use default blue theme for login screen
  const themeColors = THEME_COLORS.default;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#1a1a2e", "#16213e", "#0f3460"]}
        style={styles.background}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingView}
        >
          {/* Language Button - Top Right */}
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

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <View style={styles.inputIcon}>
                <Ionicons name="mail-outline" size={20} color="rgba(255, 255, 255, 0.6)" />
              </View>
              <TextInput
                style={styles.input}
                placeholder={t('auth.emailOrPhone')}
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <View style={styles.inputIcon}>
                <Ionicons name="lock-closed-outline" size={20} color="rgba(255, 255, 255, 0.6)" />
              </View>
              <TextInput
                style={styles.input}
                placeholder={t('auth.password')}
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <Ionicons name="eye-off-outline" size={20} color="rgba(255, 255, 255, 0.6)" />
                ) : (
                  <Ionicons name="eye-outline" size={20} color="rgba(255, 255, 255, 0.6)" />
                )}
              </TouchableOpacity>
            </View>

            {/* Remember Me & Forgot Password Row */}
            <View style={styles.optionsRow}>
              {/* Remember Me */}
              <TouchableOpacity 
                style={styles.rememberMeContainer}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View style={[
                  styles.checkbox,
                  rememberMe && { backgroundColor: themeColors.primary }
                ]}>
                  {rememberMe && (
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                </View>
                <Text style={styles.rememberMeText}>{t('auth.rememberMe')}</Text>
              </TouchableOpacity>

              {/* Forgot Password */}
              <TouchableOpacity 
                style={styles.forgotPassword}
                onPress={() => router.push("/auth/forgot-password" as any)}
              >
                <Text style={[styles.forgotPasswordText, { color: themeColors.primary }]}>
                  {t('auth.forgotPassword')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <LinearGradient
                colors={themeColors.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginButtonGradient}
              >
                <Text style={styles.loginButtonText}>
                  {isLoading ? t('common.loading') : t('auth.login')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Register Link */}
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>{t('auth.noAccount')} </Text>
              <TouchableOpacity onPress={() => router.push("/auth/register" as any)}>
                <Text style={[styles.registerLink, { color: themeColors.primary }]}>
                  {t('auth.register')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>

        {/* Verification Modal */}
        <VerificationModal
          visible={visible}
          type={modalData.type === 'info' ? 'warning' : modalData.type}
          title={modalData.title}
          message={modalData.message}
          onClose={() => {
            hideModal();
            // Don't navigate on success - login already handles redirect
          }}
        />
        <LanguagePickerModal
          visible={showLanguagePicker}
          currentLanguage={currentLanguage}
          onSelect={handleLanguageChange}
          onClose={() => setShowLanguagePicker(false)}
          theme="doctor"
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
    flexDirection: "row",
    alignItems: "center",
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
    fontWeight: "600",
    color: "white",
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "white",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 40,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    color: "white",
    fontSize: 16,
  },
  passwordToggle: {
    padding: 4,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rememberMeText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  forgotPassword: {
    alignSelf: "flex-end",
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: "500",
  },
  loginButton: {
    marginBottom: 24,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonGradient: {
    height: 55,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  loginButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  registerText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 16,
  },
  registerLink: {
    fontSize: 16,
    fontWeight: "600",
  },
});