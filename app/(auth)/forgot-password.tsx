import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
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
import { useForgotPassword } from '../../features/auth/hooks/useForgotPassword';
import ForgotPasswordForm from '../../features/auth/components/ForgotPasswordForm';
import VerificationModal from "../../shared/components/modals/VerificationModal";
import { useModal } from '../../shared/hooks/useModal';
import { COLORS } from '../../shared/constants/colors';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const { visible, modalData, showModal, hideModal } = useModal();
  const { isLoading, userType, handleSendVerification, isEmail } = useForgotPassword();

  const gradientColors = COLORS.doctor.background;
  const primaryGradient = [COLORS.doctor.primary, COLORS.doctor.primaryLight] as [string, string];

  const onSuccess = (emailOrPhone: string, method: string) => {
    showModal("success", t('common.success'), t('auth.codeSentMessage') || "A verification code has been sent to your phone. Please check your messages.");
    setTimeout(() => {
      hideModal();
      router.push({
        pathname: '/(auth)/verify-code' as any,
        params: { emailOrPhone, method }
      });
    }, 2000);
  };

  const onError = (error: string) => {
    showModal("error", t('common.error'), error);
  };

  const handleSubmit = () => {
    handleSendVerification(emailOrPhone, onSuccess, onError);
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
                onPress={() => router.replace('/(auth)/login' as any)}
              >
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{t('auth.forgotPasswordTitle')}</Text>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={primaryGradient}
                  style={styles.iconGradient}
                >
                  <Ionicons name="lock-closed-outline" size={40} color="white" />
                </LinearGradient>
              </View>

              <Text style={styles.title}>{t('auth.resetPassword')}</Text>
              <Text style={styles.subtitle}>
                {t('auth.forgotPasswordDesc')}
              </Text>

              <ForgotPasswordForm
                emailOrPhone={emailOrPhone}
                setEmailOrPhone={setEmailOrPhone}
                onSubmit={handleSubmit}
                isLoading={isLoading}
                isEmail={isEmail}
              />

              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>{t('auth.rememberPassword') || "Remember your password?"} </Text>
                <TouchableOpacity onPress={() => router.push("/(auth)/login" as any)}>
                  <Text style={styles.loginLink}>{t('auth.signIn')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        <VerificationModal
          visible={visible}
          type={modalData.type === 'info' ? 'warning' : modalData.type}
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
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
  },
  loginText: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  loginLink: {
    color: COLORS.doctor.primary,
    fontSize: 16,
    fontWeight: "600",
  },
});
