import { LinearGradient } from "expo-linear-gradient";
import { ColorValue } from 'react-native';
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect, useRef } from "react";
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
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import VerificationModal from "../components/VerificationModal";
import apiService from '../services/api';

export default function VerifyCodeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { emailOrPhone, method } = params as { emailOrPhone: string; method: string };
  
  const [code, setCode] = useState(['', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalData, setModalData] = useState({
    type: 'success' as 'success' | 'error' | 'warning',
    title: '',
    message: '',
  });
  const [resendCooldown, setResendCooldown] = useState(0);
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

  const inputRefs = useRef<TextInput[]>([]);

  const showModal = (type: 'success' | 'error' | 'warning', title: string, message: string) => {
    setModalData({ type, title, message });
    setModalVisible(true);
  };

  const startResendCooldown = () => {
    setResendCooldown(60);
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleCodeChange = (value: string, index: number) => {
    if (value.length > 1) return; // Prevent multiple characters

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if all fields are filled
    if (newCode.every(digit => digit !== '')) {
      handleVerifyCode(newCode.join(''));
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = async (verificationCode?: string) => {
    const codeToVerify = verificationCode || code.join('');
    
    console.log('═══════════════════════════════════════════════════');
    console.log('🔍 VERIFYING CODE (Frontend)');
    console.log('═══════════════════════════════════════════════════');
    console.log('📱 Phone/Email:', emailOrPhone);
    console.log('🔢 Code:', codeToVerify);
    
    if (codeToVerify.length !== 4) {
      showModal("error", "Code incomplet", "Veuillez saisir le code de 4 chiffres");
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('📤 Calling verifyCode API...');
      // Call verification API
      const result = await apiService.verifyCode(emailOrPhone, codeToVerify);
      console.log('📥 Verification result:', result);
      
      setIsLoading(false);
      
      if (result.success) {
        showModal("success", "Code vérifié!", "Votre code de vérification est correct.");
        // Navigate to reset password screen
        setTimeout(() => {
          setModalVisible(false);
          router.push({
            pathname: '/reset-password',
            params: { emailOrPhone, verificationCode: codeToVerify }
          });
        }, 1500);
      } else {
        showModal("error", "Code invalide", "Le code de vérification est incorrect. Veuillez réessayer.");
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error: any) {
      setIsLoading(false);
      console.error('Verification error:', error);
      
      let errorMessage = "Une erreur est survenue lors de la vérification du code.";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showModal("error", "Erreur", errorMessage);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;

    try {
      // Call resend code API
      const result = await apiService.sendVerificationCode(emailOrPhone);

      if (result.success) {
        showModal("success", "Code renvoyé!", "Un nouveau code de vérification a été envoyé.");
        startResendCooldown();
      } else {
        showModal("error", "Erreur", result.message || "Impossible de renvoyer le code.");
      }
    } catch (error: any) {
      console.error('Resend code error:', error);
      showModal("error", "Erreur", "Impossible de renvoyer le code. Veuillez réessayer.");
    }
  };

  useEffect(() => {
    // Focus first input when component mounts
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
  }, []);

  const maskEmailOrPhone = (input: string) => {
    if (input.includes('@')) {
      const [username, domain] = input.split('@');
      return `${username.substring(0, 2)}***@${domain}`;
    } else {
      return input.replace(/(\d{2})\d+(\d{2})/, '$1***$2');
    }
  };

  const colors = getThemeColors(userType || 'medecin');
  const gradientColors = (colors.background || ['#1a1a2e', '#16213e', '#0f3460']) as [string, string, string];
  const primaryGradient = (colors.gradient || ['#4facfe', '#00f2fe']) as [string, string];

  return (
    <SafeAreaView style={styles(colors).container}>
      <LinearGradient
        colors={gradientColors}
        style={styles(colors).background}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles(colors).keyboardAvoidingView}
        >
          {/* Header */}
          <View style={styles(colors).header}>
            <TouchableOpacity
              style={styles(colors).backButton}
              onPress={() => router.replace('/forgot-password')}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles(colors).headerTitle}>Vérification</Text>
          </View>

          {/* Form */}
          <View style={styles(colors).formContainer}>
            <View style={styles(colors).iconContainer}>
              <LinearGradient
                colors={primaryGradient}
                style={styles(colors).iconGradient}
              >
                <Ionicons name="shield-checkmark-outline" size={40} color={colors.text} />
              </LinearGradient>
            </View>

            <Text style={styles(colors).title}>Vérifiez votre code</Text>
            <Text style={styles(colors).subtitle}>
              Nous avons envoyé un code de vérification à{"\n"}
              <Text style={styles(colors).highlight}>{maskEmailOrPhone(emailOrPhone)}</Text>
            </Text>

            {/* Code Input Fields */}
            <View style={styles(colors).codeContainer}>
              {code.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    if (ref) inputRefs.current[index] = ref;
                  }}
                  style={[
                    styles(colors).codeInput,
                    digit ? styles(colors).codeInputFilled : styles(colors).codeInputEmpty
                  ]}
                  value={digit}
                  onChangeText={(value) => handleCodeChange(value, index)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                  keyboardType="numeric"
                  maxLength={1}
                  selectTextOnFocus
                  textAlign="center"
                  editable={!isLoading}
                />
              ))}
            </View>

            {/* Verify Button */}
            <TouchableOpacity
              style={[styles(colors).verifyButton, isLoading && styles(colors).verifyButtonDisabled]}
              onPress={() => handleVerifyCode()}
              disabled={isLoading || code.some(digit => digit === '')}
            >
              <LinearGradient
                colors={primaryGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles(colors).verifyButtonGradient}
              >
                <Text style={styles(colors).verifyButtonText}>
                  {isLoading ? "Vérification..." : "Vérifier le code"}
                </Text>
                {!isLoading && <Ionicons name="checkmark" size={20} color={colors.text} style={styles(colors).buttonIcon} />}
              </LinearGradient>
            </TouchableOpacity>

            {/* Resend Code */}
            <View style={styles(colors).resendContainer}>
              <Text style={styles(colors).resendText}>Vous n'avez pas reçu le code ? </Text>
              <TouchableOpacity
                onPress={handleResendCode}
                disabled={resendCooldown > 0}
                style={styles(colors).resendButton}
              >
                <Text style={[
                  styles(colors).resendLink,
                  resendCooldown > 0 && styles(colors).resendLinkDisabled
                ]}>
                  {resendCooldown > 0 ? `Renvoyer (${resendCooldown}s)` : "Renvoyer"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Back to Forgot Password */}
            <TouchableOpacity
              style={styles(colors).backContainer}
              onPress={() => router.replace('/forgot-password')}
            >
              <Ionicons name="arrow-back" size={16} color={colors.textTertiary} />
              <Text style={styles(colors).backText}>Modifier l'email/téléphone</Text>
            </TouchableOpacity>
          </View>
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
  highlight: {
    color: colors.primary,
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
    color: colors.text,
  },
  codeInputEmpty: {
    backgroundColor: `${colors.primary}10`,
    borderColor: `${colors.primary}20`,
  },
  codeInputFilled: {
    backgroundColor: `${colors.primary}20`,
    borderColor: colors.primary,
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
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  verifyButtonText: {
    color: colors.text,
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
    color: colors.textSecondary,
    fontSize: 16,
  },
  resendButton: {
    marginLeft: 4,
  },
  resendLink: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  resendLinkDisabled: {
    color: colors.textTertiary,
  },
  backContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: "auto",
    marginBottom: 40,
  },
  backText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginLeft: 8,
  },
});