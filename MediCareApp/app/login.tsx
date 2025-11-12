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
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import VerificationModal from "../components/VerificationModal";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login } from '../services/api/common';

// Theme colors for different user types
const THEME_COLORS = {
  medecin: {
    primary: '#4facfe',
    gradient: ['#4facfe', '#00f2fe'] as [string, string],
  },
  tuteur: {
    primary: '#F97316',
    gradient: ['#F97316', '#FB923C'] as [string, string],
  },
  patient: {
    primary: '#10B981',
    gradient: ['#10B981', '#34D399'] as [string, string],
  },
  default: {
    primary: '#4facfe',
    gradient: ['#4facfe', '#00f2fe'] as [string, string],
  }
};

// Storage keys
const STORAGE_KEYS = {
  REMEMBER_ME: '@medicare_remember_me',
  SAVED_EMAIL: '@medicare_saved_email',
  SAVED_PASSWORD: '@medicare_saved_password',
};

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalData, setModalData] = useState({
    type: 'success' as 'success' | 'error' | 'warning',
    title: '',
    message: '',
  });

  // Load saved credentials on mount
  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        const savedRememberMe = await AsyncStorage.getItem(STORAGE_KEYS.REMEMBER_ME);
        if (savedRememberMe === 'true') {
          const savedEmail = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_EMAIL);
          const savedPassword = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_PASSWORD);
          
          if (savedEmail && savedPassword) {
            setEmail(savedEmail);
            setPassword(savedPassword);
            setRememberMe(true);
          }
        }
      } catch (error) {
        console.error('Error loading saved credentials:', error);
      } finally {
        setIsInitialLoad(false);
      }
    };

    loadSavedCredentials();
  }, []);

  const showModal = (type: 'success' | 'error' | 'warning', title: string, message: string) => {
    setModalData({ type, title, message });
    setModalVisible(true);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showModal("error", "Champs manquants", "Veuillez remplir tous les champs");
      return;
    }

    setIsLoading(true);
    
    try {
      // Format phone number if it's not an email
      let emailOrPhone = email.trim();
      
      // Check if it's an email
      const isEmail = emailOrPhone.includes('@');
      
      if (!isEmail) {
        // It's a phone number - format it with Tunisia country code
        let cleanPhone = emailOrPhone.replace(/\D/g, '');
        
        // Add Tunisia country code if not present
        if (cleanPhone.startsWith('216')) {
          emailOrPhone = '+' + cleanPhone;
        } else if (cleanPhone.startsWith('0')) {
          emailOrPhone = '+216' + cleanPhone.substring(1);
        } else {
          emailOrPhone = '+216' + cleanPhone;
        }
      }
      
      const result = await login(emailOrPhone, password);

      setIsLoading(false);
      
      if (result.success && result.token) {
        // Save credentials if remember me is checked
        if (rememberMe) {
          await AsyncStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
          await AsyncStorage.setItem(STORAGE_KEYS.SAVED_EMAIL, emailOrPhone);
          await AsyncStorage.setItem(STORAGE_KEYS.SAVED_PASSWORD, password);
        } else {
          // Clear saved credentials if remember me is unchecked
          await AsyncStorage.multiRemove([
            STORAGE_KEYS.REMEMBER_ME,
            STORAGE_KEYS.SAVED_EMAIL,
            STORAGE_KEYS.SAVED_PASSWORD
          ]);
        }

        await AsyncStorage.setItem('userToken', result.token);
        await AsyncStorage.setItem('userData', JSON.stringify(result.user));
        
        showModal(
          "success", 
          "Connexion réussie!", 
          `Bienvenue ${result.user?.firstName}! Vous êtes maintenant connecté à votre compte MediCare+.`
        );
        
        setTimeout(() => {
          setModalVisible(false);
          switch (result.user?.userType) {
            case 'medecin':
            case 'tuteur':
              // Both doctors and tutors use the same dashboard
              router.replace('/doctor-dashboard');
              break;
            case 'patient':
              router.replace('/patient-dashboard');
              break;
            default:
              showModal(
                "error",
                "Type d'utilisateur non supporté",
                "Cette version de l'application ne supporte pas encore votre type de compte."
              );
          }
        }, 2000);
      } else {
        showModal("error", "Erreur de connexion", result.message || "Email ou mot de passe incorrect.");
      }
    } catch (error: any) {
      setIsLoading(false);
      console.error('Login error:', error);
      
      let errorMessage = "Une erreur est survenue lors de la connexion.";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showModal("error", "Erreur de connexion", errorMessage);
    }
  };

  // Always use default blue theme for login screen
  const themeColors = THEME_COLORS.default;

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
            <Text style={styles.headerTitle}>Connexion</Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            <Text style={styles.title}>Bon retour !</Text>
            <Text style={styles.subtitle}>
              Connectez-vous à votre compte MediCare+
            </Text>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <View style={styles.inputIcon}>
                <Ionicons name="mail-outline" size={20} color="rgba(255, 255, 255, 0.6)" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Adresse e-mail"
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <View style={styles.inputIcon}>
                <Ionicons name="lock-closed-outline" size={20} color="rgba(255, 255, 255, 0.6)" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Mot de passe"
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                value={password}
                onChangeText={setPassword}
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

            {/* Remember Me & Forgot Password Row */}
            <View style={styles.optionsRow}>
              {/* Remember Me */}
              <TouchableOpacity 
                style={styles.rememberMeContainer}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View style={[
                  styles.checkbox,
                  rememberMe && { backgroundColor: themeColors.primary }
                ]}>
                  {rememberMe && (
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                </View>
                <Text style={styles.rememberMeText}>Se souvenir de moi</Text>
              </TouchableOpacity>

              {/* Forgot Password */}
              <TouchableOpacity 
                style={styles.forgotPassword}
                onPress={() => router.push("/forgot-password")}
              >
                <Text style={[styles.forgotPasswordText, { color: themeColors.primary }]}>
                  Mot de passe oublié ?
                </Text>
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <LinearGradient
                colors={themeColors.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginButtonGradient}
              >
                <Text style={styles.loginButtonText}>
                  {isLoading ? "Connexion..." : "Se connecter"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Register Link */}
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>Pas encore de compte ? </Text>
              <TouchableOpacity onPress={() => router.push("/register")}>
                <Text style={[styles.registerLink, { color: themeColors.primary }]}>
                  Créer un compte
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>

        {/* Verification Modal */}
        <VerificationModal
          visible={modalVisible}
          type={modalData.type}
          title={modalData.title}
          message={modalData.message}
          onClose={() => {
            setModalVisible(false);
            // Don't navigate on success - login already handles redirect
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
    flex: 1,
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
    marginBottom: 40,
    lineHeight: 22,
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
  rememberMeText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  forgotPassword: {
    alignSelf: "flex-end",
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: "500",
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
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  loginButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  registerText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 16,
  },
  registerLink: {
    fontSize: 16,
    fontWeight: "600",
  },
});