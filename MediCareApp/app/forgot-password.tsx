import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import VerificationModal from "../components/VerificationModal";
import InternationalPhoneInput, { PhoneInputValue } from "../components/InternationalPhoneInput";
import { requestPasswordReset } from '../services/api/common';
import { useLanguage } from '../contexts/LanguageContext';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('phone');
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneValidation, setPhoneValidation] = useState<PhoneInputValue | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const [modalData, setModalData] = useState({
    type: 'success' as 'success' | 'error' | 'warning',
    title: '',
    message: '',
  });

  const showModal = (type: 'success' | 'error' | 'warning', title: string, message: string) => {
    setModalData({ type, title, message });
    setModalVisible(true);
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handlePhoneChange = (value: PhoneInputValue) => {
    setPhoneValidation(value);
    setPhoneNumber(value.e164);
    setPhoneError(null);
  };

  const handleSendVerification = async () => {
    // Validate based on login method
    if (loginMethod === 'email') {
      if (!email.trim()) {
        showModal("error", t("auth.forgotPassword.errors.missingField"), t("auth.forgotPassword.errors.missingEmail"));
        return;
      }
      if (!validateEmail(email)) {
        showModal("error", t("auth.forgotPassword.errors.invalidEmail"), t("auth.forgotPassword.errors.invalidEmailMessage"));
        return;
      }
    } else {
      if (!phoneValidation || !phoneValidation.isValid) {
        setPhoneError(t("components.phoneInput.error"));
        showModal("error", t("auth.forgotPassword.errors.invalidPhone"), t("auth.forgotPassword.errors.invalidPhoneMessage"));
        return;
      }
    }

    setIsLoading(true);
    
    try {
      // Use the appropriate identifier based on login method
      const emailOrPhone = loginMethod === 'email' 
        ? email.trim() 
        : phoneValidation?.e164 || phoneNumber;
      
      // Call send verification code API
      const result = await requestPasswordReset(emailOrPhone);

      setIsLoading(false);
      
      if (result.success) {
        showModal("success", t("auth.forgotPassword.success.title"), t("auth.forgotPassword.success.message"));
        // Navigate to verification screen after successful modal
        setTimeout(() => {
          setModalVisible(false);
          router.push({
            pathname: '/verify-code',
            params: { emailOrPhone, method: loginMethod === 'email' ? 'email' : 'sms' }
          });
        }, 2000);
      } else {
        showModal("error", t("auth.forgotPassword.errors.error"), result.message || t("auth.forgotPassword.errors.errorMessage"));
      }
    } catch (error: any) {
      setIsLoading(false);
      console.error('Forgot password error:', error);
      
      let errorMessage = t("auth.forgotPassword.errors.errorMessage");
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showModal("error", t("auth.forgotPassword.errors.error"), errorMessage);
    }
  };

  const gradientColors = ['#1a1a2e', '#16213e', '#0f3460'] as [string, string, string];
  const primaryGradient = ['#4facfe', '#00f2fe'] as [string, string];

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={gradientColors}
        style={styles.background}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingView}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.replace('/login')}
              >
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{t("auth.forgotPassword.headerTitle")}</Text>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={primaryGradient}
                  style={styles.iconGradient}
                >
                  <Ionicons name="lock-closed-outline" size={40} color="white" />
                </LinearGradient>
              </View>

              <Text style={styles.title}>{t("auth.forgotPassword.title")}</Text>
              <Text style={styles.subtitle}>
                {t("auth.forgotPassword.subtitle")}
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
                    placeholder={t("auth.forgotPassword.emailPlaceholder")}
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
                    placeholder={t("auth.forgotPassword.phonePlaceholder")}
                    accessibilityLabel="Phone number"
                    testID="forgot-password-phone-input"
                  />
                </View>
              )}

              {/* Info Text */}
              <View style={styles.infoContainer}>
                <Ionicons name="information-circle-outline" size={16} color="rgba(255, 255, 255, 0.7)" />
                <Text style={styles.infoText}>
                  {t("auth.forgotPassword.infoText")}
                </Text>
              </View>

              {/* Send Button */}
              <TouchableOpacity
                style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
                onPress={handleSendVerification}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={primaryGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.sendButtonGradient}
                >
                  <Text style={styles.sendButtonText}>
                    {isLoading ? t("auth.forgotPassword.sending") : t("auth.forgotPassword.sendButton")}
                  </Text>
                  {!isLoading && <Ionicons name="arrow-forward" size={20} color="white" style={styles.buttonIcon} />}
                </LinearGradient>
              </TouchableOpacity>

              {/* Back to Login */}
              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>{t("auth.forgotPassword.rememberPassword")}</Text>
                <TouchableOpacity onPress={() => router.push("/login")}>
                  <Text style={styles.loginLink}>{t("auth.forgotPassword.signIn")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Verification Modal */}
        <VerificationModal
          visible={modalVisible}
          type={modalData.type}
          title={modalData.title}
          message={modalData.message}
          onClose={() => setModalVisible(false)}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
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
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: 30,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#4facfe",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "white",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    marginBottom: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    width: "100%",
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
  infoContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(79, 172, 254, 0.05)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 30,
    width: "100%",
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    marginLeft: 8,
    lineHeight: 18,
  },
  sendButton: {
    marginBottom: 24,
    width: "100%",
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonGradient: {
    height: 55,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    shadowColor: "#4facfe",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  sendButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
  buttonIcon: {
    marginLeft: 8,
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
  },
  loginText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 16,
  },
  loginLink: {
    color: "#4facfe",
    fontSize: 16,
    fontWeight: "600",
  },
  loginMethodSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
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
    marginBottom: 20,
  },
});
