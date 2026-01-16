import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../../shared/constants/colors';

interface ForgotPasswordFormProps {
  emailOrPhone: string;
  setEmailOrPhone: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  isEmail: (input: string) => boolean;
}

export default function ForgotPasswordForm({
  emailOrPhone,
  setEmailOrPhone,
  onSubmit,
  isLoading,
  isEmail,
}: ForgotPasswordFormProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <View style={styles.inputIcon}>
          <Ionicons 
            name={isEmail(emailOrPhone) ? "mail-outline" : "call-outline"} 
            size={20} 
            color={COLORS.textTertiary} 
          />
        </View>
        <TextInput
          style={styles.input}
          placeholder={t('auth.emailOrPhone')}
          placeholderTextColor={COLORS.textTertiary}
          value={emailOrPhone}
          onChangeText={setEmailOrPhone}
          keyboardType={isEmail(emailOrPhone) ? "email-address" : "phone-pad"}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.infoContainer}>
        <Ionicons name="information-circle-outline" size={16} color="rgba(255, 255, 255, 0.7)" />
        <Text style={styles.infoText}>
          {t('auth.codeSentInfo') || "The verification code will be sent by SMS to your phone number"}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
        onPress={onSubmit}
        disabled={isLoading}
      >
        <LinearGradient
          colors={[COLORS.doctor.primary, COLORS.doctor.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.sendButtonGradient}
        >
          <Text style={styles.sendButtonText}>
            {isLoading ? t('common.loading') : t('auth.sendCode')}
          </Text>
          {!isLoading && <Ionicons name="arrow-forward" size={20} color="white" style={styles.buttonIcon} />}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${COLORS.doctor.primary}10`,
    borderRadius: 12,
    marginBottom: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: `${COLORS.doctor.primary}20`,
    height: 50,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 16,
  },
  infoContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: `${COLORS.doctor.primary}05`,
    borderRadius: 8,
    padding: 12,
    marginBottom: 30,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textTertiary,
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
    shadowColor: COLORS.doctor.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  sendButtonText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "700",
  },
  buttonIcon: {
    marginLeft: 8,
  },
});

