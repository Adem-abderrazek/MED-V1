import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getThemeColors } from '../config/theme';
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
import apiService from '../services/api';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { emailOrPhone, verificationCode } = params as { emailOrPhone: string; verificationCode: string };
  
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
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
  const [userType, setUserType] = useState<'medecin' | 'tuteur' | null>(null);

  // Load user type from storage
  useEffect(() => {
    const loadUserType = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const user = JSON.parse(userData);
          setUserType(user.userType);
        }
      } catch (error) {
        console.error('Error loading user type:', error);
      }
    };
    loadUserType();
  }, []);

  const showModal = (type: 'success' | 'error' | 'warning', title: string, message: string) => {
    setModalData({ type, title, message });
    setModalVisible(true);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleResetPassword = async () => {
    const { newPassword, confirmPassword } = formData;

    console.log('═══════════════════════════════════════════════════');
    console.log('🔑 RESETTING PASSWORD');
    console.log('═══════════════════════════════════════════════════');
    console.log('📱 Phone/Email:', emailOrPhone);
    console.log('🔢 Verification code:', verificationCode);

    // Validation
    if (!newPassword || !confirmPassword) {
      showModal("error", "Champs manquants", "Veuillez remplir tous les champs");
      return;
    }

    if (newPassword !== confirmPassword) {
      showModal("error", "Mots de passe différents", "Les mots de passe ne correspondent pas");
      return;
    }

    if (newPassword.length < 6) {
      showModal("error", "Mot de passe faible", "Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    // Password strength validation
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      showModal("warning", "Mot de passe faible", "Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre");
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('📤 Calling resetPasswordWithCode API...');
      // Call reset password API
      const result = await apiService.resetPasswordWithCode(emailOrPhone, verificationCode, newPassword);
      console.log('📥 Reset password result:', result);

      setIsLoading(false);
      
      if (result.success) {
        showModal("success", "Mot de passe réinitialisé!", "Votre mot de passe a été mis à jour avec succès.");
        // Navigate to login screen after successful modal
        setTimeout(() => {
          setModalVisible(false);
          router.push("/login");
        }, 2000);
      } else {
        showModal("error", "Erreur", result.message || "Une erreur est survenue lors de la réinitialisation.");
      }
    } catch (error: any) {
      setIsLoading(false);
      console.error('Reset password error:', error);
      
      let errorMessage = "Une erreur est survenue lors de la réinitialisation.";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showModal("error", "Erreur", errorMessage);
    }
  };

  // Initialize colors first
  const colors = getThemeColors(userType || 'medecin');
  const gradientColors = (colors.background || ['#1a1a2e', '#16213e', '#0f3460']) as [string, string, string];
  const primaryGradient = (colors.gradient || ['#4facfe', '#00f2fe']) as [string, string];
  const themedStyles = styles(colors);

  const getPasswordStrength = () => {
    const password = formData.newPassword;
    if (!password) return { strength: 0, text: "", color: "" };

    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

    if (score <= 2) return { strength: score, text: "Faible", color: colors.error[0] };
    if (score <= 4) return { strength: score, text: "Moyen", color: colors.warning[0] };
    return { strength: score, text: "Fort", color: colors.success[0] };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <SafeAreaView style={themedStyles.container}>
      <LinearGradient
        colors={gradientColors}
        style={themedStyles.background}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={themedStyles.keyboardAvoidingView}
        >
          <ScrollView
            style={themedStyles.scrollView}
            contentContainerStyle={themedStyles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={themedStyles.header}>
              <TouchableOpacity
                style={themedStyles.backButton}
                onPress={() => router.replace('/verify-code')}
              >
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <Text style={themedStyles.headerTitle}>Nouveau mot de passe</Text>
            </View>

            {/* Form */}
            <View style={themedStyles.formContainer}>
              <View style={themedStyles.iconContainer}>
                <LinearGradient
                  colors={primaryGradient}
                  style={themedStyles.iconGradient}
                >
                  <Ionicons name="key-outline" size={40} color={colors.text} />
                </LinearGradient>
              </View>

              <Text style={themedStyles.title}>Choisissez un nouveau mot de passe</Text>
              <Text style={themedStyles.subtitle}>
                Votre mot de passe doit être sécurisé et unique
              </Text>

              {/* New Password Input */}
              <View style={themedStyles.inputContainer}>
                <View style={themedStyles.inputIcon}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.textTertiary} />
                </View>
                <TextInput
                  style={themedStyles.input}
                  placeholder="Nouveau mot de passe"
                  placeholderTextColor={colors.textTertiary}
                  value={formData.newPassword}
                  onChangeText={(value) => handleInputChange("newPassword", value)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={themedStyles.passwordToggle}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <Ionicons name="eye-off-outline" size={20} color={colors.textTertiary} />
                  ) : (
                    <Ionicons name="eye-outline" size={20} color={colors.textTertiary} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Password Strength Indicator */}
              {formData.newPassword && (
                <View style={themedStyles.strengthContainer}>
                  <View style={themedStyles.strengthBar}>
                    <View style={[
                      themedStyles.strengthFill,
                      {
                        width: `${(passwordStrength.strength / 6) * 100}%`,
                        backgroundColor: passwordStrength.color
                      }
                    ]} />
                  </View>
                  <Text style={[themedStyles.strengthText, { color: passwordStrength.color }]}>
                    {passwordStrength.text}
                  </Text>
                </View>
              )}

              {/* Password Requirements */}
              <View style={themedStyles.requirementsContainer}>
                <Text style={themedStyles.requirementsTitle}>Le mot de passe doit contenir :</Text>
                <View style={themedStyles.requirement}>
                  <Ionicons 
                    name={formData.newPassword.length >= 6 ? "checkmark-circle" : "ellipse-outline"} 
                    size={16} 
                    color={formData.newPassword.length >= 6 ? colors.success[0] : colors.textTertiary} 
                  />
                  <Text style={[
                    themedStyles.requirementText,
                    formData.newPassword.length >= 6 && themedStyles.requirementTextMet
                  ]}>
                    Au moins 6 caractères
                  </Text>
                </View>
                <View style={themedStyles.requirement}>
                  <Ionicons 
                    name={/[A-Z]/.test(formData.newPassword) ? "checkmark-circle" : "ellipse-outline"} 
                    size={16} 
                    color={/[A-Z]/.test(formData.newPassword) ? colors.success[0] : colors.textTertiary} 
                  />
                  <Text style={[
                    themedStyles.requirementText,
                    /[A-Z]/.test(formData.newPassword) && themedStyles.requirementTextMet
                  ]}>
                    Une majuscule
                  </Text>
                </View>
                <View style={themedStyles.requirement}>
                  <Ionicons 
                    name={/[a-z]/.test(formData.newPassword) ? "checkmark-circle" : "ellipse-outline"} 
                    size={16} 
                    color={/[a-z]/.test(formData.newPassword) ? colors.success[0] : colors.textTertiary} 
                  />
                  <Text style={[
                    themedStyles.requirementText,
                    /[a-z]/.test(formData.newPassword) && themedStyles.requirementTextMet
                  ]}>
                    Une minuscule
                  </Text>
                </View>
                <View style={themedStyles.requirement}>
                  <Ionicons 
                    name={/\d/.test(formData.newPassword) ? "checkmark-circle" : "ellipse-outline"} 
                    size={16} 
                    color={/\d/.test(formData.newPassword) ? colors.success[0] : colors.textTertiary} 
                  />
                  <Text style={[
                    themedStyles.requirementText,
                    /\d/.test(formData.newPassword) && themedStyles.requirementTextMet
                  ]}>
                    Un chiffre
                  </Text>
                </View>
              </View>

              {/* Confirm Password Input */}
              <View style={themedStyles.inputContainer}>
                <View style={themedStyles.inputIcon}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.textTertiary} />
                </View>
                <TextInput
                  style={themedStyles.input}
                  placeholder="Confirmer le nouveau mot de passe"
                  placeholderTextColor={colors.textTertiary}
                  value={formData.confirmPassword}
                  onChangeText={(value) => handleInputChange("confirmPassword", value)}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={themedStyles.passwordToggle}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <Ionicons name="eye-off-outline" size={20} color={colors.textTertiary} />
                  ) : (
                    <Ionicons name="eye-outline" size={20} color={colors.textTertiary} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Reset Button */}
              <TouchableOpacity
                style={[themedStyles.resetButton, isLoading && themedStyles.resetButtonDisabled]}
                onPress={handleResetPassword}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={primaryGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={themedStyles.resetButtonGradient}
                >
                  <Text style={themedStyles.resetButtonText}>
                    {isLoading ? "Réinitialisation..." : "Réinitialiser le mot de passe"}
                  </Text>
                  {!isLoading && <Ionicons name="checkmark" size={20} color="white" style={themedStyles.buttonIcon} />}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Verification Modal */}
        <VerificationModal
          visible={modalVisible}
          type={modalData.type}
          title={modalData.title}
          message={modalData.message}
          onClose={() => setModalVisible(false)}
        />
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = (colors: ReturnType<typeof getThemeColors>) => StyleSheet.create({
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
    color: colors.text,
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
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${colors.primary}10`,
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: `${colors.primary}20`,
    width: "100%",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    color: colors.text,
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
    backgroundColor: `${colors.primary}20`,
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
    backgroundColor: `${colors.primary}05`,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 12,
  },
  requirement: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  requirementTextMet: {
    color: colors.success[0],
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
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  resetButtonText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  buttonIcon: {
    marginLeft: 8,
  },
});
