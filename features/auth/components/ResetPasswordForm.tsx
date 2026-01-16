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

interface ResetPasswordFormProps {
  formData: {
    newPassword: string;
    confirmPassword: string;
  };
  setFormData: (data: { newPassword: string; confirmPassword: string }) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (show: boolean) => void;
  onSubmit: () => void;
  isLoading: boolean;
  passwordStrength: { strength: number; text: string; color: string };
}

export default function ResetPasswordForm({
  formData,
  setFormData,
  showPassword,
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  onSubmit,
  isLoading,
  passwordStrength,
}: ResetPasswordFormProps) {
  const { t } = useTranslation();

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <View style={styles.inputIcon}>
          <Ionicons name="lock-closed-outline" size={20} color={COLORS.textTertiary} />
        </View>
        <TextInput
          style={styles.input}
          placeholder={t('auth.newPassword')}
          placeholderTextColor={COLORS.textTertiary}
          value={formData.newPassword}
          onChangeText={(value) => handleInputChange("newPassword", value)}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={styles.passwordToggle}
          onPress={() => setShowPassword(!showPassword)}
        >
          {showPassword ? (
            <Ionicons name="eye-off-outline" size={20} color={COLORS.textTertiary} />
          ) : (
            <Ionicons name="eye-outline" size={20} color={COLORS.textTertiary} />
          )}
        </TouchableOpacity>
      </View>

      {formData.newPassword && (
        <View style={styles.strengthContainer}>
          <View style={styles.strengthBar}>
            <View style={[
              styles.strengthFill,
              {
                width: `${(passwordStrength.strength / 6) * 100}%`,
                backgroundColor: passwordStrength.color
              }
            ]} />
          </View>
          <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
            {passwordStrength.text}
          </Text>
        </View>
      )}

      <View style={styles.requirementsContainer}>
        <Text style={styles.requirementsTitle}>{t('auth.passwordRequirements')}</Text>
        <View style={styles.requirement}>
          <Ionicons 
            name={formData.newPassword.length >= 6 ? "checkmark-circle" : "ellipse-outline"} 
            size={16} 
            color={formData.newPassword.length >= 6 ? COLORS.success[0] : COLORS.textTertiary} 
          />
          <Text style={[
            styles.requirementText,
            formData.newPassword.length >= 6 && styles.requirementTextMet
          ]}>
            {t('auth.atLeast6Chars')}
          </Text>
        </View>
        <View style={styles.requirement}>
          <Ionicons 
            name={/[A-Z]/.test(formData.newPassword) ? "checkmark-circle" : "ellipse-outline"} 
            size={16} 
            color={/[A-Z]/.test(formData.newPassword) ? COLORS.success[0] : COLORS.textTertiary} 
          />
          <Text style={[
            styles.requirementText,
            /[A-Z]/.test(formData.newPassword) && styles.requirementTextMet
          ]}>
            {t('auth.oneUppercase')}
          </Text>
        </View>
        <View style={styles.requirement}>
          <Ionicons 
            name={/[a-z]/.test(formData.newPassword) ? "checkmark-circle" : "ellipse-outline"} 
            size={16} 
            color={/[a-z]/.test(formData.newPassword) ? COLORS.success[0] : COLORS.textTertiary} 
          />
          <Text style={[
            styles.requirementText,
            /[a-z]/.test(formData.newPassword) && styles.requirementTextMet
          ]}>
            {t('auth.oneLowercase')}
          </Text>
        </View>
        <View style={styles.requirement}>
          <Ionicons 
            name={/\d/.test(formData.newPassword) ? "checkmark-circle" : "ellipse-outline"} 
            size={16} 
            color={/\d/.test(formData.newPassword) ? COLORS.success[0] : COLORS.textTertiary} 
          />
          <Text style={[
            styles.requirementText,
            /\d/.test(formData.newPassword) && styles.requirementTextMet
          ]}>
            {t('auth.oneNumber')}
          </Text>
        </View>
      </View>

      <View style={styles.inputContainer}>
        <View style={styles.inputIcon}>
          <Ionicons name="lock-closed-outline" size={20} color={COLORS.textTertiary} />
        </View>
        <TextInput
          style={styles.input}
          placeholder={t('auth.confirmPassword')}
          placeholderTextColor={COLORS.textTertiary}
          value={formData.confirmPassword}
          onChangeText={(value) => handleInputChange("confirmPassword", value)}
          secureTextEntry={!showConfirmPassword}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={styles.passwordToggle}
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
        >
          {showConfirmPassword ? (
            <Ionicons name="eye-off-outline" size={20} color={COLORS.textTertiary} />
          ) : (
            <Ionicons name="eye-outline" size={20} color={COLORS.textTertiary} />
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.resetButton, isLoading && styles.resetButtonDisabled]}
        onPress={onSubmit}
        disabled={isLoading}
      >
        <LinearGradient
          colors={[COLORS.doctor.primary, COLORS.doctor.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.resetButtonGradient}
        >
          <Text style={styles.resetButtonText}>
            {isLoading ? t('auth.resetting') : t('auth.resetPasswordButton')}
          </Text>
          {!isLoading && <Ionicons name="checkmark" size={20} color="white" style={styles.buttonIcon} />}
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
    marginBottom: 16,
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
  passwordToggle: {
    padding: 4,
  },
  strengthContainer: {
    width: "100%",
    marginBottom: 20,
  },
  strengthBar: {
    height: 4,
    backgroundColor: `${COLORS.doctor.primary}20`,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 8,
  },
  strengthFill: {
    height: "100%",
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  requirementsContainer: {
    width: "100%",
    backgroundColor: `${COLORS.doctor.primary}05`,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 12,
  },
  requirement: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  requirementTextMet: {
    color: COLORS.success[0],
  },
  resetButton: {
    marginBottom: 24,
    width: "100%",
  },
  resetButtonDisabled: {
    opacity: 0.6,
  },
  resetButtonGradient: {
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
  resetButtonText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "700",
  },
  buttonIcon: {
    marginLeft: 8,
  },
});

