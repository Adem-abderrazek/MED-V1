import React, { useState } from 'react';
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
import { LoginCredentials } from '../../../shared/types/auth.types';

interface LoginFormProps {
  initialEmail?: string;
  initialPassword?: string;
  initialRememberMe?: boolean;
  onSubmit: (credentials: LoginCredentials) => void;
  isLoading: boolean;
  onForgotPassword?: () => void;
}

export default function LoginForm({
  initialEmail = '',
  initialPassword = '',
  initialRememberMe = false,
  onSubmit,
  isLoading,
  onForgotPassword,
}: LoginFormProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState(initialPassword);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(initialRememberMe);

  const handleSubmit = () => {
    onSubmit({
      emailOrPhone: email,
      password,
      rememberMe,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <Ionicons name="mail-outline" size={20} color="rgba(255, 255, 255, 0.6)" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder={t('auth.emailOrPhone')}
          placeholderTextColor="rgba(255, 255, 255, 0.6)"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
      </View>

      <View style={styles.inputContainer}>
        <Ionicons name="lock-closed-outline" size={20} color="rgba(255, 255, 255, 0.6)" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder={t('auth.password')}
          placeholderTextColor="rgba(255, 255, 255, 0.6)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoComplete="password"
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={styles.eyeIcon}
        >
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color="rgba(255, 255, 255, 0.6)"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.optionsRow}>
        <TouchableOpacity
          style={styles.rememberMeContainer}
          onPress={() => setRememberMe(!rememberMe)}
        >
          <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
            {rememberMe && <Ionicons name="checkmark" size={16} color="white" />}
          </View>
          <Text style={styles.rememberMeText}>{t('auth.rememberMe')}</Text>
        </TouchableOpacity>

        {onForgotPassword && (
          <TouchableOpacity onPress={onForgotPassword}>
            <Text style={styles.forgotPasswordText}>{t('auth.forgotPassword')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={styles.loginButton}
        onPress={handleSubmit}
        disabled={isLoading}
      >
        <LinearGradient
          colors={['#4facfe', '#00f2fe']}
          style={styles.loginButtonGradient}
        >
          <Text style={styles.loginButtonText}>
            {isLoading ? t('common.loading') : t('auth.login')}
          </Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    height: 50,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: 'white',
    fontSize: 16,
  },
  eyeIcon: {
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
  checkboxChecked: {
    backgroundColor: '#4facfe',
    borderColor: '#4facfe',
  },
  rememberMeText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4facfe',
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
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
});


