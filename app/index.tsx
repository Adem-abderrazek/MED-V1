import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import LanguagePickerModal from '../shared/components/modals/LanguagePickerModal';
import { useLanguageChange } from '../shared/hooks/useLanguageChange';
import { getThemeColors } from '../config/theme';

export default function LandingScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [isChecking, setIsChecking] = useState(true);
  const [userType, setUserType] = useState<'medecin' | 'tuteur' | 'patient' | null>(null);
  const { currentLanguage, showLanguagePicker, setShowLanguagePicker, handleLanguageChange } = useLanguageChange();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const userData = await AsyncStorage.getItem('userData');
        
        if (token && userData) {
          const user = JSON.parse(userData);
          setUserType(user.userType);
          
          // Immediate redirect without showing landing page
          if (user.userType === 'patient') {
            router.replace('/(patient)/dashboard' as any);
          } else if (user.userType === 'medecin' || user.userType === 'tuteur') {
            router.replace('/(doctor)/dashboard' as any);
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

  const colors = useMemo(() => {
    // If we have a user type, use it; otherwise default to doctor theme for landing page
    return getThemeColors(userType || 'medecin');
  }, [userType]);

  if (isChecking) {
    const loadingGradient = (colors.background || ['#1a1a2e', '#16213e', '#0f3460']) as [string, string, string];
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={loadingGradient} style={styles.background}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>{t('common.loading')}</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const landingGradient = (colors.background || ['#1a1a2e', '#16213e', '#0f3460']) as [string, string, string];
  const buttonGradient = (colors.gradient || ['#4facfe', '#00f2fe']) as [string, string];

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={landingGradient}
        style={styles.background}
      >
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
            <View style={[styles.logoContainer, { shadowColor: colors.primary }]}>
              <LinearGradient
                colors={buttonGradient}
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
                style={[styles.primaryButtonContainer, { shadowColor: colors.primary }]}
                onPress={() => router.push('/(auth)/login' as any)}
              >
                <LinearGradient
                  colors={buttonGradient}
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
                onPress={() => router.push('/(auth)/register' as any)}
              >
                <Text style={styles.secondaryButtonText}>{t('landing.register')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>

      {/* Language Picker Modal */}
      <LanguagePickerModal
        visible={showLanguagePicker}
        currentLanguage={currentLanguage}
        onSelect={handleLanguageChange}
        onClose={() => setShowLanguagePicker(false)}
        theme="doctor"
      />
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
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  logoContainer: {
    marginBottom: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 16,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
  },
  slogan: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    marginBottom: 15,
  },
  subSlogan: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
    paddingHorizontal: 10,
  },

  // CTA Buttons
  ctaContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButtonContainer: {
    width: '100%',
  },
  primaryButton: {
    flexDirection: 'row',
    height: 55,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  buttonIcon: {
    marginLeft: 8,
  },
  secondaryButton: {
    height: 55,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  secondaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
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


