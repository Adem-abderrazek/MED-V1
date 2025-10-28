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
  const [isChecking, setIsChecking] = useState(true);
  
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
            router.replace('/patient-dashboard');
          } else if (user.userType === 'medecin' || user.userType === 'tuteur') {
            router.replace('/doctor-dashboard');
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
            <Text style={styles.loadingText}>Chargement...</Text>
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

            <Text style={styles.appName}>MediCare+</Text>
            <Text style={styles.slogan}>Votre santé, notre priorité</Text>
            <Text style={styles.subSlogan}>
              La plateforme qui connecte patients, tuteurs et médecins
              pour un suivi médical moderne et sécurisé
            </Text>

            {/* CTA Buttons */}
            <View style={styles.ctaContainer}>
              <TouchableOpacity
                style={styles.primaryButtonContainer}
                onPress={() => router.push("/login")}
              >
                <LinearGradient
                  colors={["#4facfe", "#00f2fe"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryButtonText}>Se connecter</Text>
                  <Ionicons name="arrow-forward" size={20} color="white" style={styles.buttonIcon} />
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => router.push("/register")}
              >
                <Text style={styles.secondaryButtonText}>Créer un compte</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Final CTA Section */}
          <View style={styles.finalCtaSection}>
            <Text style={styles.finalCtaTitle}>Prêt à commencer ?</Text>
            <Text style={styles.finalCtaText}>
              Rejoignez des milliers d'utilisateurs qui font confiance à MediCare+
            </Text>
            <TouchableOpacity
              style={styles.finalCtaButtonContainer}
              onPress={() => router.push("/register")}
            >
              <LinearGradient
                colors={["#4facfe", "#00f2fe"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.finalCtaButton}
              >
                <Text style={styles.finalCtaButtonText}>Commencer maintenant</Text>
                <Ionicons name="arrow-forward" size={20} color="white" style={styles.buttonIcon} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  // Final CTA Section
  finalCtaSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: "center",
  },
  finalCtaTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 15,
  },
  finalCtaText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 22,
  },
  finalCtaButtonContainer: {
    width: "100%",
  },
  finalCtaButton: {
    height: 55,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    shadowColor: "#4facfe",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  finalCtaButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
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
