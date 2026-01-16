import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useResetPassword } from '../../features/auth/hooks/useResetPassword';
import ResetPasswordForm from '../../features/auth/components/ResetPasswordForm';
import VerificationModal from "../../shared/components/modals/VerificationModal";
import { useModal } from '../../shared/hooks/useModal';
import { COLORS } from '../../shared/constants/colors';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams();
  const { emailOrPhone, verificationCode } = params as { emailOrPhone: string; verificationCode: string };
  
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { visible, modalData, showModal, hideModal } = useModal();
  const { isLoading, getPasswordStrength, handleResetPassword } = useResetPassword();

  const gradientColors = COLORS.doctor.background;
  const primaryGradient = [COLORS.doctor.primary, COLORS.doctor.primaryLight] as [string, string];

  const passwordStrengthData = getPasswordStrength(formData.newPassword);
  const passwordStrength = {
    strength: passwordStrengthData.strength,
    text: passwordStrengthData.strength <= 2 
      ? (t('auth.passwordWeak') || "Weak")
      : passwordStrengthData.strength <= 4
      ? (t('auth.passwordMedium') || "Medium")
      : (t('auth.passwordStrong') || "Strong"),
    color: passwordStrengthData.strength <= 2 
      ? COLORS.error[0]
      : passwordStrengthData.strength <= 4
      ? COLORS.warning[0]
      : COLORS.success[0],
  };

  const onSuccess = () => {
    showModal("success", t('auth.passwordResetSuccess'), t('auth.passwordResetSuccessMessage'));
    setTimeout(() => {
      hideModal();
      router.push("/(auth)/login" as any);
    }, 2000);
  };

  const onError = (error: string) => {
    showModal("error", t('common.error'), error);
  };

  const handleSubmit = () => {
    handleResetPassword(emailOrPhone, verificationCode, formData.newPassword, formData.confirmPassword, onSuccess, onError);
  };

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
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.replace('/(auth)/verify-code' as any)}
              >
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{t('auth.resetPassword')}</Text>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={primaryGradient}
                  style={styles.iconGradient}
                >
                  <Ionicons name="key-outline" size={40} color={COLORS.text} />
                </LinearGradient>
              </View>

              <Text style={styles.title}>{t('auth.resetPassword')}</Text>
              <Text style={styles.subtitle}>
                {t('auth.passwordSecureMessage') || "Your password must be secure and unique"}
              </Text>

              <ResetPasswordForm
                formData={formData}
                setFormData={setFormData}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                showConfirmPassword={showConfirmPassword}
                setShowConfirmPassword={setShowConfirmPassword}
                onSubmit={handleSubmit}
                isLoading={isLoading}
                passwordStrength={passwordStrength}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        <VerificationModal
          visible={visible}
          type={modalData.type === 'info' || modalData.type === 'warning' ? 'warning' : modalData.type}
          title={modalData.title}
          message={modalData.message}
          onClose={hideModal}
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
    color: COLORS.text,
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
    shadowColor: COLORS.doctor.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
});
