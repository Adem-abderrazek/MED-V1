import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import LanguagePickerModal from '../components/modals/LanguagePickerModal';
import { useLanguageChange } from '../hooks/useLanguageChange';

const { width, height } = Dimensions.get('window');

interface FeatureCard {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  gradient: [string, string];
}

const features: FeatureCard[] = [
  {
    icon: "time-outline",
    title: "Rappels automatiques",
    description: "Recevez des notifications pour vos médicaments",
    gradient: ["#667eea", "#764ba2"]
  },
  {
    icon: "chatbubble-outline",
    title: "Communication sécurisée",
    description: "Échangez avec votre médecin en toute confidentialité",
    gradient: ["#f093fb", "#f5576c"]
  },
  {
    icon: "shield-checkmark-outline",
    title: "Données protégées",
    description: "Vos informations médicales sont sécurisées",
    gradient: ["#4facfe", "#00f2fe"]
  },
  {
    icon: "phone-portrait-outline",
    title: "Interface intuitive",
    description: "Une app simple et accessible pour tous",
    gradient: ["#43e97b", "#38f9d7"]
  }
];

const testimonials = [
  {
    name: "Marie Dubois",
    role: "Patient",
    text: "MediCare+ a transformé ma gestion des médicaments. Je ne rate plus jamais un traitement !",
    rating: 5
  },
  {
    name: "Dr. Pierre Martin",
    role: "Médecin",
    text: "Une plateforme exceptionnelle pour suivre mes patients et leurs traitements.",
    rating: 5
  },
  {
    name: "Sophie Laurent",
    role: "Tutrice",
    text: "Parfait pour gérer les médicaments de ma mère âgée. Interface très simple.",
    rating: 5
  }
];

export default function LandingScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [isChecking, setIsChecking] = useState(true);
  
  // Use custom hook for language
  const {
    currentLanguage,
    showLanguagePicker,
    setShowLanguagePicker,
    handleLanguageChange,
  } = useLanguageChange();

  // Check if user is already logged in and redirect immediately
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const userData = await AsyncStorage.getItem('userData');
        
        if (token && userData) {
          const user = JSON.parse(userData);
          
          // Immediate redirect without showing landing page
          if (user.userType === 'patient') {
            router.replace('/patient/patient-dashboard' as any);
          } else if (user.userType === 'medecin' || user.userType === 'tuteur') {
            router.replace('/doctor/doctor-dashboard' as any);
          } else {
            setIsChecking(false);
          }
        } else {
          setIsChecking(false);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        setIsChecking(false);
      }
    };
    
    checkAuth();
  }, []);
  
  const renderStars = (rating: number) => {
    return Array.from({ length: rating }, (_, i) => (
      <Ionicons key={i} name="star" size={16} color="#FFD700" />
    ));
  };
  
  // Show loading while checking auth
  if (isChecking) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={["#1a1a2e", "#16213e", "#0f3460"]} style={styles.background}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4facfe" />
            <Text style={styles.loadingText}>{t('common.loading')}</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#1a1a2e", "#16213e", "#0f3460"]}
        style={styles.background}
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

        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            {/* Logo */}
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={["#4facfe", "#00f2fe"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoCircle}
              >
                <Ionicons name="heart" size={50} color="white" />
              </LinearGradient>
            </View>

            <Text style={styles.appName}>{t('landing.appName')}</Text>
            <Text style={styles.slogan}>{t('landing.slogan')}</Text>
            <Text style={styles.subSlogan}>
              {t('landing.subSlogan')}
            </Text>

            {/* CTA Buttons */}
            <View style={styles.ctaContainer}>
              <TouchableOpacity
                style={styles.primaryButtonContainer}
                onPress={() => router.push("/auth/login" as any)}
              >
                <LinearGradient
                  colors={["#4facfe", "#00f2fe"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryButtonText}>{t('landing.login')}</Text>
                  <Ionicons name="arrow-forward" size={20} color="white" style={styles.buttonIcon} />
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => router.push("/auth/register" as any)}
              >
                <Text style={styles.secondaryButtonText}>{t('landing.register')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Language Picker Modal */}
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
  scrollContainer: {
    paddingBottom: 40,
  },
  
  // Hero Section
  heroSection: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  logoContainer: {
    marginBottom: 20,
    shadowColor: "#4facfe",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 16,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  appName: {
    fontSize: 36,
    fontWeight: "800",
    color: "white",
    textAlign: "center",
    marginBottom: 10,
  },
  slogan: {
    fontSize: 20,
    fontWeight: "600",
    color: "white",
    textAlign: "center",
    marginBottom: 15,
  },
  subSlogan: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
    paddingHorizontal: 10,
  },

  // CTA Buttons
  ctaContainer: {
    width: "100%",
    gap: 12,
  },
  primaryButtonContainer: {
    width: "100%",
  },
  primaryButton: {
    flexDirection: "row",
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
  primaryButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  buttonIcon: {
    marginLeft: 8,
  },
  secondaryButton: {
    height: 55,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  secondaryButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  // Language Button
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
  
  // Loading Container
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
});
