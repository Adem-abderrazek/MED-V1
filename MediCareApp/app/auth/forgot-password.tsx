import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getThemeColors } from '../../config/theme';
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
import VerificationModal from "../../components/modals/VerificationModal";
import { requestPasswordReset } from '../../services/api/common';
import { useTranslation } from 'react-i18next';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [userType, setUserType] = useState<'medecin' | 'tuteur' | null>(null);
  
  // Load user type from storage
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

  const validateTunisianPhone = (phone: string): boolean => {
    const cleanPhone = phone.replace(/\D/g, '');
    const mobilePattern = /^(?:\+216|216|0)?[2-5]\d{7}$/;
    const landlinePattern = /^(?:\+216|216|0)?[7-9]\d{7}$/;
    return mobilePattern.test(cleanPhone) || landlinePattern.test(cleanPhone);
  };

  const isEmail = (input: string): boolean => {
    return input.includes('@');
  };

  const handleSendVerification = async () => {
    if (!emailOrPhone.trim()) {
      showModal("error", t('auth.missingFields'), t('auth.forgotPasswordDesc'));
      return;
    }

    if (isEmail(emailOrPhone)) {
      if (!validateEmail(emailOrPhone)) {
        showModal("error", t('auth.invalidEmail'), t('auth.invalidEmailMessage'));
        return;
      }
    } else {
      if (!validateTunisianPhone(emailOrPhone)) {
        showModal("error", t('auth.invalidPhone'), t('auth.invalidPhoneMessage'));
        return;
      }
    }

    setIsLoading(true);
    
    try {
      // Call send verification code API
      const result = await requestPasswordReset(emailOrPhone);

      setIsLoading(false);
      
      if (result.success) {
        showModal("success", t('common.success'), t('auth.codeSentMessage') || "A verification code has been sent to your phone. Please check your messages.");
        // Navigate to verification screen after successful modal
        setTimeout(() => {
          setModalVisible(false);
          router.push({
            pathname: '/auth/verify-code' as any,
            params: { emailOrPhone, method: isEmail(emailOrPhone) ? 'email' : 'sms' }
          });
        }, 2000);
      } else {
        showModal("error", t('common.error'), result.message || t('auth.codeSendError') || "An error occurred while sending the code.");
      }
    } catch (error: any) {
      setIsLoading(false);
      console.error('Forgot password error:', error);
      
      let errorMessage = t('auth.codeSendError') || "An error occurred while sending the code.";
      
      // Extract validation errors if available
      const validationErrors = error.errors || error.response?.data?.errors || [];
      if (Array.isArray(validationErrors) && validationErrors.length > 0) {
        const errorDetails = validationErrors
          .map((err: any) => err?.msg || (typeof err === 'string' ? err : err?.message))
          .filter(Boolean);
        if (errorDetails.length > 0) {
          errorMessage = errorDetails[0];
        }
      } else if (error.message && error.message !== 'Validation failed') {
        errorMessage = error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      showModal("error", t('common.error'), errorMessage);
    }
  };

  const colors = getThemeColors(userType || 'medecin');
  const gradientColors = (colors.background || ['#1a1a2e', '#16213e', '#0f3460']) as [string, string, string];
  const primaryGradient = (colors.gradient || ['#4facfe', '#00f2fe']) as [string, string];
  const themedStyles = styles(colors);

  return (
    <SafeAreaView style={themedStyles.container}>
      <LinearGradient
        colors={gradientColors}
        style={themedStyles.background}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={themedStyles.keyboardAvoidingView}
        >
          <ScrollView
            style={themedStyles.scrollView}
            contentContainerStyle={themedStyles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={themedStyles.header}>
              <TouchableOpacity
                style={themedStyles.backButton}
                onPress={() => router.replace('/auth/login' as any)}
              >
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <Text style={themedStyles.headerTitle}>{t('auth.forgotPasswordTitle')}</Text>
            </View>

            {/* Form */}
            <View style={themedStyles.formContainer}>
              <View style={themedStyles.iconContainer}>
                <LinearGradient
                  colors={primaryGradient}
                  style={themedStyles.iconGradient}
                >
                  <Ionicons name="lock-closed-outline" size={40} color="white" />
                </LinearGradient>
              </View>

              <Text style={themedStyles.title}>{t('auth.resetPassword')}</Text>
              <Text style={themedStyles.subtitle}>
                {t('auth.forgotPasswordDesc')}
              </Text>

              {/* Email/Phone Input */}
              <View style={themedStyles.inputContainer}>
                <View style={themedStyles.inputIcon}>
                  <Ionicons 
                    name={isEmail(emailOrPhone) ? "mail-outline" : "call-outline"} 
                    size={20} 
                    color={colors.textTertiary} 
                  />
                </View>
                <TextInput
                  style={themedStyles.input}
                  placeholder={t('auth.emailOrPhone')}
                  placeholderTextColor={colors.textTertiary}
                  value={emailOrPhone}
                  onChangeText={setEmailOrPhone}
                  keyboardType={isEmail(emailOrPhone) ? "email-address" : "phone-pad"}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Info Text */}
              <View style={themedStyles.infoContainer}>
                <Ionicons name="information-circle-outline" size={16} color="rgba(255, 255, 255, 0.7)" />
                <Text style={themedStyles.infoText}>
                  {t('auth.codeSentInfo') || "The verification code will be sent by SMS to your phone number"}
                </Text>
              </View>

              {/* Send Button */}
              <TouchableOpacity
                style={[themedStyles.sendButton, isLoading && themedStyles.sendButtonDisabled]}
                onPress={handleSendVerification}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={primaryGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={themedStyles.sendButtonGradient}
                >
                  <Text style={themedStyles.sendButtonText}>
                    {isLoading ? t('common.loading') : t('auth.sendCode')}
                  </Text>
                  {!isLoading && <Ionicons name="arrow-forward" size={20} color="white" style={themedStyles.buttonIcon} />}
                </LinearGradient>
              </TouchableOpacity>

              {/* Back to Login */}
              <View style={themedStyles.loginContainer}>
                <Text style={themedStyles.loginText}>{t('auth.rememberPassword') || "Remember your password?"} </Text>
                <TouchableOpacity onPress={() => router.push("/auth/login" as any)}>
                  <Text style={themedStyles.loginLink}>{t('auth.signIn')}</Text>
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

const styles = (colors: ReturnType<typeof getThemeColors>) => StyleSheet.create({
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
    color: colors.text,
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
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${colors.primary}10`,
    borderRadius: 12,
    marginBottom: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: `${colors.primary}20`,
    width: "100%",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    color: colors.text,
    fontSize: 16,
  },
  infoContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: `${colors.primary}05`,
    borderRadius: 8,
    padding: 12,
    marginBottom: 30,
    width: "100%",
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.textTertiary,
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
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  sendButtonText: {
    color: colors.text,
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
    color: colors.textSecondary,
    fontSize: 16,
  },
  loginLink: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "600",
  },
});
