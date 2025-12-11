import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
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
import RolePicker from "../../components/forms/RolePicker";
import DatePicker from "../../components/forms/DatePicker";
import InternationalPhoneInput, { PhoneInputValue } from "../../components/forms/InternationalPhoneInput";
import { register } from '../../services/api/common';
import { useTranslation } from 'react-i18next';
import LanguagePickerModal from '../../components/modals/LanguagePickerModal';
import { extractErrorMessage } from '../../utils/errorHandling';
import { useLanguageChange } from '../../hooks/useLanguageChange';
import { useModal } from '../../hooks/useModal';

export default function RegisterScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    email: "",
    password: "",
    confirmPassword: "",
    userType: "patient",
    dateNaissance: new Date(), // Default to today
  });
  const [phoneValidation, setPhoneValidation] = useState<PhoneInputValue | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Use custom hooks for modal and language
  const { visible, modalData, showModal, hideModal } = useModal();
  const {
    currentLanguage,
    showLanguagePicker,
    setShowLanguagePicker,
    handleLanguageChange,
  } = useLanguageChange();

  const handleInputChange = (field: string, value: string | Date) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhoneChange = (value: PhoneInputValue) => {
    setPhoneValidation(value);
    setFormData(prev => ({ ...prev, phoneNumber: value.e164 }));
    setPhoneError(null);
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateAge = (date: Date): boolean => {
    const today = new Date();
    const age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
      return age - 1 >= 13; // Minimum age 13
    }
    return age >= 13;
  };

  const handleRegister = async () => {
    const { firstName, lastName, phoneNumber, email, password, confirmPassword, userType, dateNaissance } = formData;

    // Validation
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phoneNumber.trim() || !password || !confirmPassword) {
      showModal("error", t('auth.missingFields'), t('auth.fillAllFields'));
      return;
    }

    // Check if date of birth has been changed from today (user must select a past date)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(dateNaissance);
    selectedDate.setHours(0, 0, 0, 0);
    
    if (selectedDate.getTime() >= today.getTime()) {
      showModal("error", t('auth.invalidDateOfBirth'), t('auth.selectDateOfBirth'));
      return;
    }

    if (!validateEmail(email)) {
      showModal("error", t('auth.invalidEmail'), t('auth.invalidEmailMessage'));
      return;
    }

    // Validate phone number using the phone input component
    if (!phoneValidation || !phoneValidation.isValid) {
      setPhoneError(t('auth.invalidPhoneMessage'));
      showModal("error", t('auth.invalidPhone'), t('auth.invalidPhoneMessage'));
      return;
    }

    // Use E.164 format for API
    const phoneNumberE164 = phoneValidation.e164;

    if (password !== confirmPassword) {
      showModal("error", t('auth.passwordsDontMatch'), t('auth.passwordsDontMatchMessage'));
      return;
    }

    if (password.length < 6) {
      showModal("error", t('auth.weakPassword'), t('auth.weakPasswordMessage'));
      return;
    }

    if (!validateAge(dateNaissance)) {
      showModal("error", t('auth.invalidAge'), t('auth.invalidAgeMessage'));
      return;
    }

    setIsLoading(true);
    
    try {
      // Call real API with E.164 format
      const result = await register({
        firstName,
        lastName,
        phoneNumber: phoneNumberE164,
        email,
        password,
        userType: userType as 'patient' | 'tuteur' | 'medecin'
      });

      setIsLoading(false);
      
      if (result.success) {
        showModal("success", t('auth.accountCreated'), t('auth.accountCreatedMessage'));
      } else {
        showModal("error", t('auth.registrationError'), result.message || t('auth.accountCreationError'));
      }
    } catch (error: any) {
      setIsLoading(false);
      console.error('Registration error:', error);
      
      const errorMessage = extractErrorMessage(error, t('auth.accountCreationError'));
      showModal("error", t('auth.registrationError'), errorMessage);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#1a1a2e", "#16213e", "#0f3460"]}
        style={styles.background}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingView}
        >
          {/* Language Button - Top Right */}
          <View style={styles.languageButtonContainer}>
            <TouchableOpacity
              style={styles.languageButton}
              onPress={() => setShowLanguagePicker(true)}
            >
              <Ionicons name="language" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.replace('/')}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('auth.registerTitle')}</Text>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Form */}
            <View style={styles.formContainer}>
              <Text style={styles.title}>{t('auth.registerTitle')}</Text>
              <Text style={styles.subtitle}>
                {t('auth.registerSubtitle')}
              </Text>

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
                  onChangeText={(value) => handleInputChange("firstName", value)}
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
                  onChangeText={(value) => handleInputChange("lastName", value)}
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
                  onChangeText={(value) => handleInputChange("email", value)}
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
                      setPhoneError("Veuillez saisir un numéro de téléphone valide");
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
                onRoleSelect={(role) => handleInputChange("userType", role)}
              />

              {/* Date of Birth Picker */}
              <DatePicker
                selectedDate={formData.dateNaissance}
                onDateChange={(date) => handleInputChange("dateNaissance", date)}
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
                  onChangeText={(value) => handleInputChange("password", value)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <Ionicons name="eye-off-outline" size={20} color="rgba(255, 255, 255, 0.6)" />
                  ) : (
                    <Ionicons name="eye-outline" size={20} color="rgba(255, 255, 255, 0.6)" />
                  )}
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
                  onChangeText={(value) => handleInputChange("confirmPassword", value)}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <Ionicons name="eye-off-outline" size={20} color="rgba(255, 255, 255, 0.6)" />
                  ) : (
                    <Ionicons name="eye-outline" size={20} color="rgba(255, 255, 255, 0.6)" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Terms */}
              <View style={styles.termsContainer}>
                <Text style={styles.termsText}>
                  {t('auth.termsAcceptance')}{" "}
                  <Text style={styles.termsLink}>{t('auth.termsOfUse')}</Text>
                  {" "}{t('auth.and')}{" "}
                  <Text style={styles.termsLink}>{t('auth.privacyPolicy')}</Text>
                </Text>
              </View>

              {/* Register Button */}
              <TouchableOpacity
                style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
                onPress={handleRegister}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={["#4facfe", "#00f2fe"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.registerButtonGradient}
                >
                  <Text style={styles.registerButtonText}>
                    {isLoading ? t('auth.creatingAccount') : t('auth.createAccount')}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Login Link */}
              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>{t('auth.alreadyHaveAccount')} </Text>
                <TouchableOpacity onPress={() => router.push("/auth/login" as any)}>
                  <Text style={styles.loginLink}>{t('auth.signIn')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Verification Modal */}
        <VerificationModal
          visible={visible}
          type={modalData.type}
          title={modalData.title}
          message={modalData.message}
          onClose={() => {
            hideModal();
            if (modalData.type === 'success') {
              router.push('/auth/login' as any);
            }
          }}
        />
        <LanguagePickerModal
          visible={showLanguagePicker}
          currentLanguage={currentLanguage}
          onSelect={handleLanguageChange}
          onClose={() => setShowLanguagePicker(false)}
          theme="doctor"
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
  languageButtonContainer: {
    position: 'absolute',
    top: 10,
    right: 20,
    zIndex: 1000,
  },
  languageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
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
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "white",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 32,
    lineHeight: 22,
  },
  nameRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  halfInput: {
    flex: 1,
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
  passwordToggle: {
    padding: 4,
  },
  termsContainer: {
    marginBottom: 24,
  },
  termsText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    lineHeight: 20,
    textAlign: "center",
  },
  termsLink: {
    color: "#4facfe",
    fontWeight: "500",
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
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#4facfe",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  registerButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
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
  phoneInputWrapper: {
    marginBottom: 16,
  },
});
