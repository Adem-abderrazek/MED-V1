import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useVerifyCode } from '../../features/auth/hooks/useVerifyCode';
import VerifyCodeForm from '../../features/auth/components/VerifyCodeForm';
import VerificationModal from "../../shared/components/modals/VerificationModal";
import { useModal } from '../../shared/hooks/useModal';
import { COLORS } from '../../shared/constants/colors';

export default function VerifyCodeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams();
  const { emailOrPhone, method } = params as { emailOrPhone: string; method: string };
  
  const [code, setCode] = useState(['', '', '', '']);
  const { visible, modalData, showModal, hideModal } = useModal();
  const { isLoading, resendCooldown, inputRefs, handleVerifyCode, handleResendCode } = useVerifyCode();

  const gradientColors = COLORS.doctor.background;
  const primaryGradient = [COLORS.doctor.primary, COLORS.doctor.primaryLight] as [string, string];

  useEffect(() => {
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
  }, []);

  const handleCodeChange = (value: string, index: number) => {
    if (value.length > 1) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newCode.every(digit => digit !== '')) {
      handleVerifyCode(newCode.join(''), emailOrPhone || '', onVerifySuccess, onVerifyError);
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const onVerifySuccess = (verificationCode: string) => {
    showModal("success", t('auth.codeVerified'), t('auth.codeVerifiedMessage'));
    setTimeout(() => {
      hideModal();
      router.push({
        pathname: '/(auth)/reset-password' as any,
        params: { emailOrPhone, verificationCode }
      });
    }, 1500);
  };

  const onVerifyError = (error: string) => {
    showModal("error", t('common.error'), error);
    setCode(['', '', '', '']);
    inputRefs.current[0]?.focus();
  };

  const onResendSuccess = () => {
    showModal("success", t('auth.codeResent'), t('auth.codeResentMessage'));
  };

  const onResendError = (error: string) => {
    showModal("error", t('common.error'), error);
  };

  const handleResend = () => {
    handleResendCode(emailOrPhone || '', onResendSuccess, onResendError);
  };

  const maskEmailOrPhone = (input: string | undefined) => {
    if (!input) return '';
    if (input.includes('@')) {
      const [username, domain] = input.split('@');
      return `${username.substring(0, 2)}***@${domain}`;
    } else {
      return input.replace(/(\d{2})\d+(\d{2})/, '$1***$2');
    }
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
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.replace('/(auth)/forgot-password' as any)}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('auth.verifyCode')}</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={primaryGradient}
                style={styles.iconGradient}
              >
                <Ionicons name="shield-checkmark-outline" size={40} color={COLORS.text} />
              </LinearGradient>
            </View>

            <Text style={styles.title}>{t('auth.verifyCode')}</Text>

            <VerifyCodeForm
              code={code}
              setCode={setCode}
              onCodeChange={handleCodeChange}
              onKeyPress={handleKeyPress}
              inputRefs={inputRefs}
              onSubmit={() => handleVerifyCode(code.join(''), emailOrPhone || '', onVerifySuccess, onVerifyError)}
              onResend={handleResend}
              isLoading={isLoading}
              resendCooldown={resendCooldown}
              emailOrPhone={emailOrPhone || ''}
              maskEmailOrPhone={maskEmailOrPhone}
            />

            <TouchableOpacity
              style={styles.backContainer}
              onPress={() => router.replace('/(auth)/forgot-password' as any)}
            >
              <Ionicons name="arrow-back" size={16} color={COLORS.textTertiary} />
              <Text style={styles.backText}>Modifier l'email/téléphone</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        <VerificationModal
          visible={visible}
          type={modalData.type}
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
  backContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: "auto",
    marginBottom: 40,
  },
  backText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginLeft: 8,
  },
});
