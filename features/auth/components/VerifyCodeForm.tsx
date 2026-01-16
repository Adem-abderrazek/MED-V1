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

interface VerifyCodeFormProps {
  code: string[];
  setCode: (code: string[]) => void;
  onCodeChange: (value: string, index: number) => void;
  onKeyPress: (key: string, index: number) => void;
  inputRefs: React.MutableRefObject<any[]>;
  onSubmit: () => void;
  onResend: () => void;
  isLoading: boolean;
  resendCooldown: number;
  emailOrPhone: string;
  maskEmailOrPhone: (input: string) => string;
}

export default function VerifyCodeForm({
  code,
  onCodeChange,
  onKeyPress,
  inputRefs,
  onSubmit,
  onResend,
  isLoading,
  resendCooldown,
  emailOrPhone,
  maskEmailOrPhone,
}: VerifyCodeFormProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>
        {t('auth.enterCode')}{"\n"}
        <Text style={styles.highlight}>{maskEmailOrPhone(emailOrPhone || '')}</Text>
      </Text>

      <View style={styles.codeContainer}>
        {code.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => {
              if (ref) inputRefs.current[index] = ref;
            }}
            style={[
              styles.codeInput,
              digit ? styles.codeInputFilled : styles.codeInputEmpty
            ]}
            value={digit}
            onChangeText={(value) => onCodeChange(value, index)}
            onKeyPress={({ nativeEvent }) => onKeyPress(nativeEvent.key, index)}
            keyboardType="numeric"
            maxLength={1}
            selectTextOnFocus
            textAlign="center"
            editable={!isLoading}
          />
        ))}
      </View>

      <TouchableOpacity
        style={[styles.verifyButton, isLoading && styles.verifyButtonDisabled]}
        onPress={onSubmit}
        disabled={isLoading || code.some(digit => digit === '')}
      >
        <LinearGradient
          colors={[COLORS.doctor.primary, COLORS.doctor.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.verifyButtonGradient}
        >
          <Text style={styles.verifyButtonText}>
            {isLoading ? t('auth.verifying') : t('auth.verifyCode')}
          </Text>
          {!isLoading && <Ionicons name="checkmark" size={20} color={COLORS.text} style={styles.buttonIcon} />}
        </LinearGradient>
      </TouchableOpacity>

      <View style={styles.resendContainer}>
        <Text style={styles.resendText}>{t('auth.didntReceiveCode') || "Didn't receive the code?"} </Text>
        <TouchableOpacity
          onPress={onResend}
          disabled={resendCooldown > 0}
          style={styles.resendButton}
        >
          <Text style={[
            styles.resendLink,
            resendCooldown > 0 && styles.resendLinkDisabled
          ]}>
            {resendCooldown > 0 ? t('auth.resendWithCooldown', { seconds: resendCooldown }) : t('auth.resend')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  highlight: {
    color: COLORS.doctor.primary,
    fontWeight: "600",
  },
  codeContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 40,
    width: "100%",
    paddingHorizontal: 20,
    gap: 12,
  },
  codeInput: {
    width: 45,
    height: 55,
    borderRadius: 12,
    borderWidth: 2,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text,
  },
  codeInputEmpty: {
    backgroundColor: `${COLORS.doctor.primary}10`,
    borderColor: `${COLORS.doctor.primary}20`,
  },
  codeInputFilled: {
    backgroundColor: `${COLORS.doctor.primary}20`,
    borderColor: COLORS.doctor.primary,
  },
  verifyButton: {
    marginBottom: 30,
    width: "100%",
  },
  verifyButtonDisabled: {
    opacity: 0.6,
  },
  verifyButtonGradient: {
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
  verifyButtonText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "700",
  },
  buttonIcon: {
    marginLeft: 8,
  },
  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 30,
  },
  resendText: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  resendButton: {
    marginLeft: 4,
  },
  resendLink: {
    color: COLORS.doctor.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  resendLinkDisabled: {
    color: COLORS.textTertiary,
  },
});

