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
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import VerificationModal from "../components/VerificationModal";
import InternationalPhoneInput, { PhoneInputValue } from "../components/InternationalPhoneInput";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login } from '../services/api/common';
import { useLanguage } from '../contexts/LanguageContext';

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
  const { t, isRTL } = useLanguage();
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneValidation, setPhoneValidation] = useState<PhoneInputValue | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalData, setModalData] = useState({
    type: 'success' as 'success' | 'error' | 'warning',
    title: '',
    message: '',
  });

  // Load saved credentials on mount
  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        const savedRememberMe = await AsyncStorage.getItem(STORAGE_KEYS.REMEMBER_ME);
        if (savedRememberMe === 'true') {
          const savedEmail = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_EMAIL);
          const savedPassword = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_PASSWORD);
          
          if (savedEmail && savedPassword) {
            // Detect if saved value is email or phone
            if (savedEmail.includes('@')) {
              setLoginMethod('email');
              setEmail(savedEmail);
            } else {
              setLoginMethod('phone');
              setPhoneNumber(savedEmail);
            }
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

  const handlePhoneChange = (value: PhoneInputValue) => {
    setPhoneValidation(value);
    setPhoneNumber(value.e164);
    setPhoneError(null);
  };

  const showModal = (type: 'success' | 'error' | 'warning', title: string, message: string) => {
    setModalData({ type, title, message });
    setModalVisible(true);
  };

  const handleLogin = async () => {
    // Validate based on login method
    if (loginMethod === 'email') {
      if (!email.trim() || !password) {
        showModal("error", t("auth.login.errors.missingFields"), t("auth.login.errors.missingFieldsMessage"));
        return;
      }
    } else {
      if (!phoneValidation || !phoneValidation.isValid || !password) {
        setPhoneError(t("components.phoneInput.error"));
        showModal("error", t("auth.login.errors.missingFields"), t("auth.login.errors.missingFieldsMessage"));
        return;
      }
    }

    setIsLoading(true);
    
    try {
      // Use the appropriate identifier based on login method
      const emailOrPhone = loginMethod === 'email' 
        ? email.trim() 
        : phoneValidation?.e164 || phoneNumber;
      
      const result = await login(emailOrPhone, password);

      setIsLoading(false);
      
      if (result.success && result.token) {
        // Save credentials if remember me is checked
        if (rememberMe) {
          await AsyncStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
          // Save the identifier used (email or phone)
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
          t("auth.login.success.title"), 
          t("auth.login.success.message", { firstName: result.user?.firstName })
        );
        
        setTimeout(() => {
          setModalVisible(false);
          switch (result.user?.userType) {
            case 'medecin':
            case 'tuteur':
              // Both doctors and tutors use the same dashboard
              router.replace('/doctor-dashboard');
              break;
            case 'patient':
              router.replace('/patient-dashboard');
              break;
            default:
              showModal(
                "error",
                t("auth.login.errors.unsupportedUserType"),
                t("auth.login.errors.unsupportedUserTypeMessage")
              );
          }
        }, 2000);
      } else {
        showModal("error", t("auth.login.errors.loginError"), result.message || t("auth.login.errors.invalidCredentials"));
      }
    } catch (error: any) {
      setIsLoading(false);
      console.error('Login error:', error);
      
      let errorMessage = t("auth.login.errors.connectionError");
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showModal("error", t("auth.login.errors.loginError"), errorMessage);
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
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.keyboardDismissArea}>
              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => router.replace('/')}
                >
                  <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t("auth.login.headerTitle")}</Text>
              </View>

              {/* Form */}
              <View style={styles.formContainer}>
            <Text style={styles.title}>{t("auth.login.title")}</Text>
            <Text style={styles.subtitle}>
              {t("auth.login.subtitle")}
            </Text>

            {/* Login Method Selector */}
            <View style={styles.loginMethodSelector}>
              <TouchableOpacity
                style={[
                  styles.methodButton,
                  loginMethod === 'email' && styles.methodButtonActive
                ]}
                onPress={() => {
                  setLoginMethod('email');
                  setPhoneError(null);
                }}
              >
                <Ionicons 
                  name="mail-outline" 
                  size={18} 
                  color={loginMethod === 'email' ? 'white' : 'rgba(255, 255, 255, 0.6)'} 
                />
                <Text style={[
                  styles.methodButtonText,
                  loginMethod === 'email' && styles.methodButtonTextActive
                ]}>
                  {t("common.labels.email")}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.methodButton,
                  loginMethod === 'phone' && styles.methodButtonActive
                ]}
                onPress={() => {
                  setLoginMethod('phone');
                  setPhoneError(null);
                }}
              >
                <Ionicons 
                  name="call-outline" 
                  size={18} 
                  color={loginMethod === 'phone' ? 'white' : 'rgba(255, 255, 255, 0.6)'} 
                />
                <Text style={[
                  styles.methodButtonText,
                  loginMethod === 'phone' && styles.methodButtonTextActive
                ]}>
                  {t("common.labels.phone")}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Email or Phone Input */}
            {loginMethod === 'email' ? (
              <View style={styles.inputContainer}>
                <View style={styles.inputIcon}>
                  <Ionicons name="mail-outline" size={20} color="rgba(255, 255, 255, 0.6)" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder={t("auth.login.emailPlaceholder")}
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            ) : (
              <View style={styles.phoneInputWrapper}>
                <InternationalPhoneInput
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  onBlur={() => {
                    if (phoneValidation && !phoneValidation.isValid) {
                      setPhoneError(t("components.phoneInput.error"));
                    }
                  }}
                  defaultCountry="TN"
                  required={true}
                  error={phoneError || undefined}
                  theme="patient"
                  placeholder={t("auth.login.phonePlaceholder")}
                  accessibilityLabel="Phone number"
                  testID="login-phone-input"
                />
              </View>
            )}

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <View style={styles.inputIcon}>
                <Ionicons name="lock-closed-outline" size={20} color="rgba(255, 255, 255, 0.6)" />
              </View>
              <TextInput
                style={styles.input}
                  placeholder={t("auth.login.passwordPlaceholder")}
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
                <Text style={styles.rememberMeText}>{t("auth.login.rememberMe")}</Text>
              </TouchableOpacity>

              {/* Forgot Password */}
              <TouchableOpacity 
                style={styles.forgotPassword}
                onPress={() => router.push("/forgot-password")}
              >
                <Text style={[styles.forgotPasswordText, { color: themeColors.primary }]}>
                  {t("auth.login.forgotPassword")}
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
                  {isLoading ? t("auth.login.loggingIn") : t("auth.login.loginButton")}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Register Link */}
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>{t("auth.login.noAccount")}</Text>
              <TouchableOpacity onPress={() => router.push("/register")}>
                <Text style={[styles.registerLink, { color: themeColors.primary }]}>
                  {t("auth.login.createAccount")}
                </Text>
              </TouchableOpacity>
            </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>

        {/* Verification Modal */}
        <VerificationModal
          visible={modalVisible}
          type={modalData.type}
          title={modalData.title}
          message={modalData.message}
          onClose={() => {
            setModalVisible(false);
            // Don't navigate on success - login already handles redirect
          }}
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
  keyboardDismissArea: {
    flex: 1,
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
  loginMethodSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  methodButtonActive: {
    backgroundColor: 'rgba(79, 172, 254, 0.3)',
  },
  methodButtonText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
  methodButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  phoneInputWrapper: {
    marginBottom: 16,
  },
});