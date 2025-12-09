import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
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
import VerificationModal from "../components/VerificationModal";
import RolePicker from "../components/RolePicker";
import DatePicker from "../components/DatePicker";
import InternationalPhoneInput, { PhoneInputValue } from "../components/InternationalPhoneInput";
import { register } from '../services/api/common';
import { getThemeColors } from '../config/theme';

export default function RegisterScreen() {
  const router = useRouter();
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
  const [modalVisible, setModalVisible] = useState(false);
  const [modalData, setModalData] = useState({
    type: 'success' as 'success' | 'error' | 'warning',
    title: '',
    message: '',
  });

  const handleInputChange = (field: string, value: string | Date) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const showModal = (type: 'success' | 'error' | 'warning', title: string, message: string) => {
    setModalData({ type, title, message });
    setModalVisible(true);
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

  // Get theme colors based on user type
  const colors = getThemeColors(formData.userType as 'patient' | 'medecin' | 'tuteur' || 'patient');
  
  // Password strength calculator
  const getPasswordStrength = () => {
    const password = formData.password;
    if (!password) return { strength: 0, text: "", color: "" };

    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

    if (score <= 2) return { strength: score, text: "Faible", color: "#EF4444" };
    if (score <= 4) return { strength: score, text: "Moyen", color: "#F59E0B" };
    return { strength: score, text: "Fort", color: "#10B981" };
  };

  const passwordStrength = getPasswordStrength();

  const handleRegister = async () => {
    const { firstName, lastName, phoneNumber, email, password, confirmPassword, userType, dateNaissance } = formData;

    // Validation
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phoneNumber.trim() || !password || !confirmPassword) {
      showModal("error", "Champs manquants", "Veuillez remplir tous les champs obligatoires");
      return;
    }

    // Check if date of birth has been changed from today (user must select a past date)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(dateNaissance);
    selectedDate.setHours(0, 0, 0, 0);
    
    if (selectedDate.getTime() >= today.getTime()) {
      showModal("error", "Date de naissance invalide", "Veuillez sélectionner votre date de naissance");
      return;
    }

    if (!validateEmail(email)) {
      showModal("error", "Email invalide", "Veuillez saisir une adresse email valide");
      return;
    }

    // Validate phone number using the phone input component
    if (!phoneValidation || !phoneValidation.isValid) {
      setPhoneError("Veuillez saisir un numéro de téléphone valide");
      showModal("error", "Numéro invalide", "Veuillez saisir un numéro de téléphone valide");
      return;
    }

    // Use E.164 format for API
    const phoneNumberE164 = phoneValidation.e164;

    if (password !== confirmPassword) {
      showModal("error", "Mots de passe différents", "Les mots de passe ne correspondent pas");
      return;
    }

    // Password strength validation
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);

    if (password.length < 6) {
      showModal("error", "Mot de passe faible", "Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      showModal("warning", "Mot de passe faible", "Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre");
      return;
    }

    if (!validateAge(dateNaissance)) {
      showModal("error", "Âge invalide", "Vous devez avoir au moins 13 ans pour créer un compte");
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
        showModal("success", "Compte créé!", "Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter.");
      } else {
        showModal("error", "Erreur d'inscription", result.message || "Une erreur est survenue lors de la création du compte.");
      }
    } catch (error: any) {
      setIsLoading(false);
      console.error('Registration error:', error);
      
      let errorMessage = "Une erreur est survenue lors de la création du compte.";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showModal("error", "Erreur d'inscription", errorMessage);
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
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.replace('/')}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Inscription</Text>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Form */}
            <View style={styles.formContainer}>
              <Text style={styles.title}>Créer un compte</Text>
              <Text style={styles.subtitle}>
                Rejoignez MediCare+ et prenez le contrôle de votre santé
              </Text>

            {/* Name Inputs */}
            <View style={styles.nameRow}>
              <View style={[styles.inputContainer, styles.halfInput]}>
                <View style={styles.inputIcon}>
                  <Ionicons name="person-outline" size={20} color="rgba(255, 255, 255, 0.6)" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Prénom"
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
                  placeholder="Nom"
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
                  placeholder="Adresse e-mail"
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
                  placeholder="Numéro de téléphone"
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
                placeholder="Date de naissance"
              />

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <View style={styles.inputIcon}>
                  <Ionicons name="lock-closed-outline" size={20} color="rgba(255, 255, 255, 0.6)" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Mot de passe"
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

              {/* Password Strength Indicator */}
              {formData.password && (
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

              {/* Password Requirements */}
              <View style={styles.requirementsContainer}>
                <Text style={styles.requirementsTitle}>Le mot de passe doit contenir :</Text>
                <View style={styles.requirement}>
                  <Ionicons 
                    name={formData.password.length >= 6 ? "checkmark-circle" : "ellipse-outline"} 
                    size={16} 
                    color={formData.password.length >= 6 ? "#10B981" : "rgba(255, 255, 255, 0.6)"} 
                  />
                  <Text style={[
                    styles.requirementText,
                    formData.password.length >= 6 && styles.requirementTextMet
                  ]}>
                    Au moins 6 caractères
                  </Text>
                </View>
                <View style={styles.requirement}>
                  <Ionicons 
                    name={/[A-Z]/.test(formData.password) ? "checkmark-circle" : "ellipse-outline"} 
                    size={16} 
                    color={/[A-Z]/.test(formData.password) ? "#10B981" : "rgba(255, 255, 255, 0.6)"} 
                  />
                  <Text style={[
                    styles.requirementText,
                    /[A-Z]/.test(formData.password) && styles.requirementTextMet
                  ]}>
                    Une majuscule
                  </Text>
                </View>
                <View style={styles.requirement}>
                  <Ionicons 
                    name={/[a-z]/.test(formData.password) ? "checkmark-circle" : "ellipse-outline"} 
                    size={16} 
                    color={/[a-z]/.test(formData.password) ? "#10B981" : "rgba(255, 255, 255, 0.6)"} 
                  />
                  <Text style={[
                    styles.requirementText,
                    /[a-z]/.test(formData.password) && styles.requirementTextMet
                  ]}>
                    Une minuscule
                  </Text>
                </View>
                <View style={styles.requirement}>
                  <Ionicons 
                    name={/\d/.test(formData.password) ? "checkmark-circle" : "ellipse-outline"} 
                    size={16} 
                    color={/\d/.test(formData.password) ? "#10B981" : "rgba(255, 255, 255, 0.6)"} 
                  />
                  <Text style={[
                    styles.requirementText,
                    /\d/.test(formData.password) && styles.requirementTextMet
                  ]}>
                    Un chiffre
                  </Text>
                </View>
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputContainer}>
                <View style={styles.inputIcon}>
                  <Ionicons name="lock-closed-outline" size={20} color="rgba(255, 255, 255, 0.6)" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Confirmer le mot de passe"
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
                  En créant un compte, vous acceptez nos{" "}
                  <Text style={styles.termsLink}>Conditions d'utilisation</Text>
                  {" "}et notre{" "}
                  <Text style={styles.termsLink}>Politique de confidentialité</Text>
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
                    {isLoading ? "Création du compte..." : "Créer mon compte"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Login Link */}
              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Déjà un compte ? </Text>
                <TouchableOpacity onPress={() => router.push("/login")}>
                  <Text style={styles.loginLink}>Se connecter</Text>
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
          onClose={() => {
            setModalVisible(false);
            if (modalData.type === 'success') {
              router.push('/login');
            }
          }}
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
  strengthContainer: {
    width: "100%",
    marginBottom: 16,
  },
  strengthBar: {
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
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
    backgroundColor: "rgba(79, 172, 254, 0.05)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
    marginBottom: 12,
  },
  requirement: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    marginLeft: 8,
  },
  requirementTextMet: {
    color: "#10B981",
  },
});
