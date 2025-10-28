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
import apiService from '../services/api';

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

  const validateTunisianPhone = (phone: string): boolean => {
    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Tunisian phone number patterns:
    // Mobile: +216 XX XXX XXX or 216 XX XXX XXX or 0X XXX XXX
    // Landline: +216 XX XXX XXX or 216 XX XXX XXX or 0X XXX XXX
    const mobilePattern = /^(?:\+216|216|0)?[2-5]\d{7}$/;
    const landlinePattern = /^(?:\+216|216|0)?[7-9]\d{7}$/;
    
    return mobilePattern.test(cleanPhone) || landlinePattern.test(cleanPhone);
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

    if (!validateTunisianPhone(phoneNumber)) {
      showModal("error", "Numéro invalide", "Veuillez saisir un numéro de téléphone tunisien valide (ex: +216 XX XXX XXX)");
      return;
    }

    if (password !== confirmPassword) {
      showModal("error", "Mots de passe différents", "Les mots de passe ne correspondent pas");
      return;
    }

    if (password.length < 6) {
      showModal("error", "Mot de passe faible", "Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    if (!validateAge(dateNaissance)) {
      showModal("error", "Âge invalide", "Vous devez avoir au moins 13 ans pour créer un compte");
      return;
    }

    setIsLoading(true);
    
    try {
      // Call real API
      const result = await apiService.register({
        firstName,
        lastName,
        phoneNumber,
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
              <View style={styles.inputContainer}>
                <View style={styles.inputIcon}>
                  <Ionicons name="call-outline" size={20} color="rgba(255, 255, 255, 0.6)" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Numéro de téléphone tunisien"
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                  value={formData.phoneNumber}
                  onChangeText={(value) => handleInputChange("phoneNumber", value)}
                  keyboardType="phone-pad"
                  autoCorrect={false}
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
});
