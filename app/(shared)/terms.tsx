import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getThemeColors } from '../../config/theme';

export default function TermsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [userType, setUserType] = useState<'medecin' | 'tuteur' | 'patient' | null>(null);

  useEffect(() => {
    const loadUserType = async () => {
      try {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ef6884b6-78e4-4a25-87fa-c5f8fa77e982',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'terms.tsx:17',message:'Loading user type for terms page',data:{hasUserData:false,hasToken:false},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        const token = await AsyncStorage.getItem('userToken');
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ef6884b6-78e4-4a25-87fa-c5f8fa77e982',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'terms.tsx:20',message:'Token check result',data:{hasToken:!!token,tokenLength:token?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        const userData = await AsyncStorage.getItem('userData');
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ef6884b6-78e4-4a25-87fa-c5f8fa77e982',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'terms.tsx:22',message:'UserData check result',data:{hasUserData:!!userData,userDataLength:userData?.length||0,hasToken:!!token},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        if (userData && token) {
          const user = JSON.parse(userData);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/ef6884b6-78e4-4a25-87fa-c5f8fa77e982',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'terms.tsx:25',message:'Setting userType from userData',data:{userType:user.userType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
          setUserType(user.userType);
        } else {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/ef6884b6-78e4-4a25-87fa-c5f8fa77e982',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'terms.tsx:28',message:'No userType set - user not logged in',data:{hasUserData:!!userData,hasToken:!!token},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
          // #endregion
          setUserType(null);
        }
      } catch (error) {
        console.error('Error loading user type:', error);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ef6884b6-78e4-4a25-87fa-c5f8fa77e982',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'terms.tsx:31',message:'Error loading user type',data:{error:error.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
      }
    };
    loadUserType();
  }, []);

  const { colors, gradientColors, primaryGradient } = useMemo(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ef6884b6-78e4-4a25-87fa-c5f8fa77e982',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'terms.tsx:32',message:'Computing theme colors',data:{userType,willUseDefault:!userType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
    // #endregion
    // Use null theme (default) when user is not logged in
    const themeColors = getThemeColors(userType || null);
    const bgColors = (themeColors.background || ['#1a1a2e', '#16213e', '#0f3460']) as [string, string, string];
    const primGradient = (themeColors.gradient || ['#4facfe', '#00f2fe']) as [string, string];
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ef6884b6-78e4-4a25-87fa-c5f8fa77e982',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'terms.tsx:37',message:'Theme colors computed',data:{primaryColor:themeColors.primary,userType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
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
          <Text style={styles.headerTitle}>{t('terms.title')}</Text>
          <View style={styles.headerSpacer} />
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
              style={styles.cardGradient}
            >
              <View style={styles.iconContainer}>
                <Ionicons name="document-text" size={48} color={colors.primary} />
              </View>

              <Text style={styles.lastUpdated}>{t('terms.lastUpdated')}</Text>

              <View style={styles.textSection}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t('terms.section1.title')}</Text>
                <Text style={styles.paragraph}>
                  {t('terms.section1.content')}
                </Text>
              </View>

              <View style={styles.textSection}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t('terms.section2.title')}</Text>
                <Text style={styles.paragraph}>
                  {t('terms.section2.content')}
                </Text>
                <Text style={styles.bulletPoint}>• {t('terms.section2.bullet1')}</Text>
                <Text style={styles.bulletPoint}>• {t('terms.section2.bullet2')}</Text>
                <Text style={styles.bulletPoint}>• {t('terms.section2.bullet3')}</Text>
                <Text style={styles.bulletPoint}>• {t('terms.section2.bullet4')}</Text>
              </View>

              <View style={styles.textSection}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t('terms.section3.title')}</Text>
                <Text style={styles.paragraph}>
                  {t('terms.section3.content')}
                </Text>
                <Text style={styles.bulletPoint}>• {t('terms.section3.bullet1')}</Text>
                <Text style={styles.bulletPoint}>• {t('terms.section3.bullet2')}</Text>
                <Text style={styles.bulletPoint}>• {t('terms.section3.bullet3')}</Text>
                <Text style={styles.bulletPoint}>• {t('terms.section3.bullet4')}</Text>
              </View>

              <View style={styles.textSection}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t('terms.section4.title')}</Text>
                <Text style={styles.paragraph}>
                  {t('terms.section4.content')}
                </Text>
                <Text style={styles.bulletPoint}>• {t('terms.section4.bullet1')}</Text>
                <Text style={styles.bulletPoint}>• {t('terms.section4.bullet2')}</Text>
                <Text style={styles.bulletPoint}>• {t('terms.section4.bullet3')}</Text>
                <Text style={styles.bulletPoint}>• {t('terms.section4.bullet4')}</Text>
              </View>

              <View style={styles.textSection}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t('terms.section5.title')}</Text>
                <Text style={styles.paragraph}>
                  {t('terms.section5.content')}
                </Text>
                <Text style={styles.bulletPoint}>• {t('terms.section5.bullet1')}</Text>
                <Text style={styles.bulletPoint}>• {t('terms.section5.bullet2')}</Text>
                <Text style={styles.bulletPoint}>• {t('terms.section5.bullet3')}</Text>
                <Text style={[styles.paragraph, { marginTop: 12 }]}>
                  {t('terms.section5.emergency')}
                </Text>
              </View>

              <View style={styles.textSection}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t('terms.section6.title')}</Text>
                <Text style={styles.paragraph}>
                  {t('terms.section6.content')}
                </Text>
              </View>

              <View style={styles.textSection}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t('terms.section7.title')}</Text>
                <Text style={styles.paragraph}>
                  {t('terms.section7.content')}
                </Text>
                <Text style={styles.bulletPoint}>• {t('terms.section7.bullet1')}</Text>
                <Text style={styles.bulletPoint}>• {t('terms.section7.bullet2')}</Text>
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
    fontSize: 20,
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
    marginBottom: 20,
  },
  lastUpdated: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginBottom: 24,
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
});


