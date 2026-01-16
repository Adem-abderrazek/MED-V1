import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import RolePicker from '../../../shared/components/forms/RolePicker';
import DatePicker from '../../../shared/components/forms/DatePicker';
import InternationalPhoneInput, { PhoneInputValue } from '../../../shared/components/forms/InternationalPhoneInput';
import { RegisterData } from '../../../shared/types/auth.types';

export interface RegisterFormData extends RegisterData {
  dateNaissance: Date;
  acceptedTerms: boolean;
}

interface RegisterFormProps {
  onSubmit: (formData: RegisterFormData, phoneValidation: PhoneInputValue | null) => void;
  isLoading: boolean;
  onTermsPress?: () => void;
  onPrivacyPress?: () => void;
}

export default function RegisterForm({
  onSubmit,
  isLoading,
  onTermsPress,
  onPrivacyPress,
}: RegisterFormProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<RegisterFormData>({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'patient',
    dateNaissance: new Date(),
    acceptedTerms: false,
  });
  const [phoneValidation, setPhoneValidation] = useState<PhoneInputValue | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleInputChange = (field: string, value: string | Date) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhoneChange = (value: PhoneInputValue) => {
    setPhoneValidation(value);
    setFormData(prev => ({ ...prev, phoneNumber: value.e164 }));
    setPhoneError(null);
  };

  const handleSubmit = () => {
    onSubmit(formData, phoneValidation);
  };

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.formContainer}>
        {/* Name Inputs */}
        <View style={styles.nameRow}>
          <View style={[styles.inputContainer, styles.halfInput]}>
            <View style={styles.inputIcon}>
              <Ionicons name="person-outline" size={20} color="rgba(255, 255, 255, 0.6)" />
            </View>
            <TextInput
              style={styles.input}
              placeholder={t('auth.firstName')}
              placeholderTextColor="rgba(255, 255, 255, 0.6)"
              value={formData.firstName}
              onChangeText={(value) => handleInputChange('firstName', value)}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          <View style={[styles.inputContainer, styles.halfInput]}>
            <View style={styles.inputIcon}>
              <Ionicons name="person-outline" size={20} color="rgba(255, 255, 255, 0.6)" />
            </View>
            <TextInput
              style={styles.input}
              placeholder={t('auth.lastName')}
              placeholderTextColor="rgba(255, 255, 255, 0.6)"
              value={formData.lastName}
              onChangeText={(value) => handleInputChange('lastName', value)}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Email Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputIcon}>
            <Ionicons name="mail-outline" size={20} color="rgba(255, 255, 255, 0.6)" />
          </View>
          <TextInput
            style={styles.input}
            placeholder={t('auth.emailPlaceholder')}
            placeholderTextColor="rgba(255, 255, 255, 0.6)"
            value={formData.email}
            onChangeText={(value) => handleInputChange('email', value)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Phone Input */}
        <View style={styles.phoneInputWrapper}>
          <InternationalPhoneInput
            value={formData.phoneNumber}
            onChange={handlePhoneChange}
            onBlur={() => {
              if (phoneValidation && !phoneValidation.isValid) {
                setPhoneError(t('auth.invalidPhoneMessage'));
              }
            }}
            defaultCountry="TN"
            required={true}
            error={phoneError || undefined}
            theme="patient"
            placeholder={t('auth.phonePlaceholder')}
            accessibilityLabel="Phone number"
            testID="register-phone-input"
          />
        </View>

        {/* Role Picker */}
        <RolePicker
          selectedRole={formData.userType}
          onRoleSelect={(role) => handleInputChange('userType', role)}
        />

        {/* Date of Birth Picker */}
        <DatePicker
          selectedDate={formData.dateNaissance}
          onDateChange={(date) => handleInputChange('dateNaissance', date)}
          placeholder={t('auth.dateOfBirth')}
        />

        {/* Password Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputIcon}>
            <Ionicons name="lock-closed-outline" size={20} color="rgba(255, 255, 255, 0.6)" />
          </View>
          <TextInput
            style={styles.input}
            placeholder={t('auth.password')}
            placeholderTextColor="rgba(255, 255, 255, 0.6)"
            value={formData.password}
            onChangeText={(value) => handleInputChange('password', value)}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.passwordToggle}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="rgba(255, 255, 255, 0.6)"
            />
          </TouchableOpacity>
        </View>

        {/* Confirm Password Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputIcon}>
            <Ionicons name="lock-closed-outline" size={20} color="rgba(255, 255, 255, 0.6)" />
          </View>
          <TextInput
            style={styles.input}
            placeholder={t('auth.confirmPassword')}
            placeholderTextColor="rgba(255, 255, 255, 0.6)"
            value={formData.confirmPassword}
            onChangeText={(value) => handleInputChange('confirmPassword', value)}
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.passwordToggle}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            <Ionicons
              name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="rgba(255, 255, 255, 0.6)"
            />
          </TouchableOpacity>
        </View>

        {/* Terms Acceptance Checkbox */}
        <View style={styles.termsContainer}>
          <View style={styles.checkboxContainer}>
            <TouchableOpacity
              onPress={() => setFormData(prev => ({ ...prev, acceptedTerms: !prev.acceptedTerms }))}
              activeOpacity={0.7}
              style={styles.checkboxWrapper}
            >
              <View style={[styles.checkbox, formData.acceptedTerms && styles.checkboxChecked]}>
                {formData.acceptedTerms && (
                  <Ionicons name="checkmark" size={16} color="white" />
                )}
              </View>
            </TouchableOpacity>
            <View style={styles.termsTextContainer}>
              <Text style={styles.termsText}>
                {t('auth.iAccept') || 'I accept the'}{' '}
                <Text
                  style={styles.termsLink}
                  onPress={onTermsPress}
                >
                  {t('auth.termsOfUse')}
                </Text>
                {' '}{t('auth.and') || 'and'}{' '}
                <Text
                  style={styles.termsLink}
                  onPress={onPrivacyPress}
                >
                  {t('auth.privacyPolicy')}
                </Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Register Button */}
        <TouchableOpacity
          style={[styles.registerButton, (isLoading || !formData.acceptedTerms) && styles.registerButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading || !formData.acceptedTerms}
        >
          <LinearGradient
            colors={['#4facfe', '#00f2fe']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.registerButtonGradient}
          >
            <Text style={styles.registerButtonText}>
              {isLoading ? t('auth.creatingAccount') : t('auth.createAccount')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
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
    height: 56,
  },
  halfInput: {
    flex: 1,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: 'white',
    fontSize: 16,
  },
  passwordToggle: {
    padding: 4,
  },
  phoneInputWrapper: {
    marginBottom: 16,
  },
  termsContainer: {
    marginBottom: 24,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  checkboxWrapper: {
    marginRight: 12,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4facfe',
    borderColor: '#4facfe',
  },
  termsTextContainer: {
    flex: 1,
  },
  termsText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
  },
  termsLink: {
    color: '#4facfe',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  registerButton: {
    marginBottom: 24,
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerButtonGradient: {
    height: 55,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4facfe',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  registerButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
});


