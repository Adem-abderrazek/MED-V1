import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getThemeColors } from '../../config/theme';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [userType, setUserType] = useState<'medecin' | 'tuteur' | 'patient' | null>(null);

  useEffect(() => {
    const loadUserType = async () => {
      try {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ef6884b6-78e4-4a25-87fa-c5f8fa77e982',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'privacy-policy.tsx:17',message:'Loading user type for privacy page',data:{hasUserData:false,hasToken:false},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        const token = await AsyncStorage.getItem('userToken');
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ef6884b6-78e4-4a25-87fa-c5f8fa77e982',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'privacy-policy.tsx:20',message:'Token check result',data:{hasToken:!!token,tokenLength:token?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        const userData = await AsyncStorage.getItem('userData');
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ef6884b6-78e4-4a25-87fa-c5f8fa77e982',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'privacy-policy.tsx:22',message:'UserData check result',data:{hasUserData:!!userData,userDataLength:userData?.length||0,hasToken:!!token},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        if (userData && token) {
          const user = JSON.parse(userData);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/ef6884b6-78e4-4a25-87fa-c5f8fa77e982',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'privacy-policy.tsx:25',message:'Setting userType from userData',data:{userType:user.userType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
          setUserType(user.userType);
        } else {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/ef6884b6-78e4-4a25-87fa-c5f8fa77e982',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'privacy-policy.tsx:28',message:'No userType set - user not logged in',data:{hasUserData:!!userData,hasToken:!!token},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
          // #endregion
          setUserType(null);
        }
      } catch (error) {
        console.error('Error loading user type:', error);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ef6884b6-78e4-4a25-87fa-c5f8fa77e982',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'privacy-policy.tsx:31',message:'Error loading user type',data:{error:error.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
      }
    };
    loadUserType();
  }, []);

  const { colors, gradientColors, primaryGradient } = useMemo(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ef6884b6-78e4-4a25-87fa-c5f8fa77e982',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'privacy-policy.tsx:32',message:'Computing theme colors',data:{userType,willUseDefault:!userType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
    // #endregion
    // Use null theme (default) when user is not logged in
    const themeColors = getThemeColors(userType || null);
    const bgColors = (themeColors.background || ['#1a1a2e', '#16213e', '#0f3460']) as [string, string, string];
    const primGradient = (themeColors.gradient || ['#4facfe', '#00f2fe']) as [string, string];
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ef6884b6-78e4-4a25-87fa-c5f8fa77e982',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'privacy-policy.tsx:37',message:'Theme colors computed',data:{primaryColor:themeColors.primary,userType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
    // #endregion
    return {
      colors: themeColors,
      gradientColors: bgColors,
      primaryGradient: primGradient,
    };
  }, [userType]);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={gradientColors} style={styles.background}>
        {/* Header */}
        <LinearGradient
          colors={primaryGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/');
              }
            }}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('privacy.title')}</Text>
          <View style={styles.headerSpacer} />
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
              style={styles.cardGradient}
            >
              <View style={styles.iconContainer}>
                <Ionicons name="shield-checkmark" size={48} color={colors.primary} />
              </View>

              <Text style={styles.lastUpdated}>{t('privacy.lastUpdated')}</Text>

              <View style={styles.textSection}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t('privacy.introduction.title')}</Text>
                <Text style={styles.paragraph}>
                  {t('privacy.introduction.content')}
                </Text>
              </View>

              <View style={styles.textSection}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t('privacy.section1.title')}</Text>
                <Text style={styles.paragraph}>
                  {t('privacy.section1.content')}
                </Text>
                <Text style={styles.bulletPoint}>• {t('privacy.section1.bullet1')}</Text>
                <Text style={styles.bulletPoint}>• {t('privacy.section1.bullet2')}</Text>
                <Text style={styles.bulletPoint}>• {t('privacy.section1.bullet3')}</Text>
                <Text style={styles.bulletPoint}>• {t('privacy.section1.bullet4')}</Text>
              </View>

              <View style={styles.textSection}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t('privacy.section2.title')}</Text>
                <Text style={styles.paragraph}>
                  {t('privacy.section2.content')}
                </Text>
                <Text style={styles.bulletPoint}>• {t('privacy.section2.bullet1')}</Text>
                <Text style={styles.bulletPoint}>• {t('privacy.section2.bullet2')}</Text>
                <Text style={styles.bulletPoint}>• {t('privacy.section2.bullet3')}</Text>
                <Text style={styles.bulletPoint}>• {t('privacy.section2.bullet4')}</Text>
              </View>

              <View style={styles.textSection}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t('privacy.section3.title')}</Text>
                <Text style={styles.paragraph}>
                  {t('privacy.section3.content')}
                </Text>
                <Text style={styles.bulletPoint}>• {t('privacy.section3.bullet1')}</Text>
                <Text style={styles.bulletPoint}>• {t('privacy.section3.bullet2')}</Text>
                <Text style={styles.bulletPoint}>• {t('privacy.section3.bullet3')}</Text>
                <Text style={styles.bulletPoint}>• {t('privacy.section3.bullet4')}</Text>
              </View>

              <View style={styles.textSection}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t('privacy.section4.title')}</Text>
                <Text style={styles.paragraph}>
                  {t('privacy.section4.content')}
                </Text>
                <Text style={styles.bulletPoint}>• {t('privacy.section4.bullet1')}</Text>
                <Text style={styles.bulletPoint}>• {t('privacy.section4.bullet2')}</Text>
                <Text style={[styles.paragraph, { marginTop: 12 }]}>
                  {t('privacy.section4.noSale')}
                </Text>
              </View>

              <View style={styles.textSection}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t('privacy.section5.title')}</Text>
                <Text style={styles.paragraph}>
                  {t('privacy.section5.content')}
                </Text>
                <Text style={styles.bulletPoint}>• {t('privacy.section5.bullet1')}</Text>
                <Text style={styles.bulletPoint}>• {t('privacy.section5.bullet2')}</Text>
                <Text style={styles.bulletPoint}>• {t('privacy.section5.bullet3')}</Text>
                <Text style={styles.bulletPoint}>• {t('privacy.section5.bullet4')}</Text>
                <Text style={styles.bulletPoint}>• {t('privacy.section5.bullet5')}</Text>
              </View>

              <View style={styles.textSection}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t('privacy.section6.title')}</Text>
                <Text style={styles.paragraph}>
                  {t('privacy.section6.content')}
                </Text>
                <Text style={styles.bulletPoint}>• {t('privacy.section6.bullet1')}</Text>
                <Text style={styles.bulletPoint}>• {t('privacy.section6.bullet2')}</Text>
                <Text style={styles.bulletPoint}>• {t('privacy.section6.bullet3')}</Text>
              </View>

              <View style={styles.textSection}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t('privacy.section7.title')}</Text>
                <Text style={styles.paragraph}>
                  {t('privacy.section7.content')}
                </Text>
                <Text style={styles.bulletPoint}>• {t('privacy.section7.bullet1')}</Text>
                <Text style={styles.bulletPoint}>• {t('privacy.section7.bullet2')}</Text>
                <Text style={styles.bulletPoint}>• {t('privacy.section7.bullet3')}</Text>
              </View>

              <View style={styles.textSection}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t('privacy.section8.title')}</Text>
                <Text style={styles.paragraph}>
                  {t('privacy.section8.content')}
                </Text>
              </View>

              <View style={styles.textSection}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t('privacy.section9.title')}</Text>
                <Text style={styles.paragraph}>
                  {t('privacy.section9.content')}
                </Text>
                <Text style={styles.bulletPoint}>• {t('privacy.section9.bullet1')}</Text>
                <Text style={styles.bulletPoint}>• {t('privacy.section9.bullet2')}</Text>
                <Text style={styles.bulletPoint}>• {t('privacy.section9.bullet3')}</Text>
              </View>

              <View style={[styles.certificationBanner, { backgroundColor: `${colors.primary}26`, borderColor: `${colors.primary}4D` }]}>
                <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
                <Text style={[styles.certificationText, { color: colors.primary }]}>
                  {t('privacy.certification')}
                </Text>
              </View>
            </LinearGradient>
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
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  card: {
    marginTop: 20,
    marginBottom: 40,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  lastUpdated: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginBottom: 32,
    fontStyle: 'italic',
  },
  textSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 24,
    marginBottom: 8,
  },
  bulletPoint: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: 24,
    marginLeft: 12,
    marginBottom: 6,
  },
  certificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  certificationText: {
    flex: 1,
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
    lineHeight: 20,
  },
});


