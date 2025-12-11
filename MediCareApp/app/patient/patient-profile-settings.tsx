import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getUserProfile, updateUserProfile } from '../../services/api/common';
import FeedbackModal from '../../components/modals/FeedbackModal';
import LanguagePickerModal from '../../components/modals/LanguagePickerModal';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../../i18n';
import { useLanguageChange } from '../../hooks/useLanguageChange';
import { useAuthToken } from '../../hooks/useAuthToken';

// Green theme colors for patients
const COLORS = {
  primary: '#10B981',
  primaryLight: '#34D399',
  primaryDark: '#059669',
  background: ['#1a1a2e', '#1B2E1F', '#1D3020'] as const,
  cardBg: ['rgba(16, 185, 129, 0.1)', 'rgba(16, 185, 129, 0.05)'] as const,
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.8)',
  textTertiary: 'rgba(255, 255, 255, 0.6)',
  success: ['#10B981', '#059669'] as const,
  error: ['#EF4444', '#DC2626'] as const,
};

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  userType: string;
  notificationsEnabled: boolean;
  lastLogin?: string;
  createdAt: string;
  timezone?: string;
  language?: string;
}

export default function PatientProfileSettingsScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { token } = useAuthToken();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [hasSyncedLanguage, setHasSyncedLanguage] = useState(false);
  
  // Use language hook for state management
  const {
    currentLanguage,
    showLanguagePicker,
    setShowLanguagePicker,
  } = useLanguageChange();
  
  const [feedbackModal, setFeedbackModal] = useState({
    visible: false,
    type: 'success' as 'success' | 'error' | 'confirm',
    title: '',
    message: '',
    onConfirm: () => {},
  });


  useEffect(() => {
    if (profile && !hasSyncedLanguage) {
      setNotificationsEnabled(profile.notificationsEnabled);
      // Sync language from profile only on initial load
      if (profile.language && (profile.language === 'en' || profile.language === 'fr' || profile.language === 'ar')) {
        changeLanguage(profile.language).then(() => {
          setHasSyncedLanguage(true);
        });
      } else {
        setHasSyncedLanguage(true);
      }
    }
  }, [profile, hasSyncedLanguage]);

  const handleNotificationToggle = async (value: boolean) => {
    setNotificationsEnabled(value);
    
    if (!token) return;

    try {
      const result = await updateUserProfile(token, {
        notificationsEnabled: value,
      } as any);
      console.log('✅ Notification preference updated');
    } catch (error) {
      console.error('Error updating notification preference:', error);
      setNotificationsEnabled(!value);
    }
  };

  // Custom handler that extends the hook's functionality with API update
  const handleLanguageChangeWithAPI = async (language: 'en' | 'fr' | 'ar') => {
    if (!token) return;

    try {
      console.log(`🔄 Starting language change to: ${language}`);
      
      // Use the hook's handler to update i18n and state
      await changeLanguage(language);
      i18n.emit('languageChanged', language);
      
      // Update language in user profile via API
      const result = await updateUserProfile(token, {
        language: language,
      } as any);
      
      // Update local profile state
      if (profile) {
        setProfile({ ...profile, language });
      }
      
      console.log('✅ Language preference updated successfully');
    } catch (error) {
      console.error('❌ Error updating language preference:', error);
      setFeedbackModal({
        visible: true,
        type: 'error',
        title: t('common.error') || 'Erreur',
        message: t('common.errorMessage') || 'Impossible de mettre à jour la langue. Veuillez réessayer.',
        onConfirm: () => setFeedbackModal(prev => ({ ...prev, visible: false })),
      });
    }
  };


  const loadProfile = useCallback(async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      const result = await getUserProfile(token);
      
      if (result.success && result.data) {
        setProfile(result.data as UserProfile);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadProfile();
  }, [loadProfile]);

  const handleLogout = () => {
    setFeedbackModal({
      visible: true,
      type: 'confirm',
      title: t('profile.logout'),
      message: t('profile.logoutConfirm'),
      onConfirm: async () => {
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userData');
        setFeedbackModal(prev => ({ ...prev, visible: false }));
        router.replace('/auth/login');
      },
    });
  };

  const getInitials = () => {
    if (!profile) return '?';
    return `${profile.firstName?.charAt(0) || 'P'}${profile.lastName?.charAt(0) || 'I'}`.toUpperCase();
  };

  const renderSettingItem = (
    icon: string,
    title: string,
    subtitle?: string,
    onPress?: () => void,
    showArrow: boolean = true,
    rightElement?: React.ReactNode
  ) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingIcon}>
        <Ionicons name={icon as any} size={22} color={COLORS.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle} numberOfLines={1} ellipsizeMode="tail">{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle} numberOfLines={1} ellipsizeMode="tail">{subtitle}</Text>}
      </View>
      {rightElement || (showArrow && (
        <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
      ))}
    </TouchableOpacity>
  );

  if (isLoading && !profile) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={COLORS.background} style={styles.background}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>{t('common.loading')}</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={COLORS.background} style={styles.background}>
          {/* Header */}
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.header}
          >
            <TouchableOpacity style={styles.backButton} onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/patient/patient-dashboard');
              }
            }}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('profile.title')}</Text>
            <View style={styles.headerSpacer} />
          </LinearGradient>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                tintColor="white"
                colors={[COLORS.primary] as const}
              />
            }
          >
            {/* Profile Card */}
            <View style={styles.profileCard}>
              <LinearGradient
                colors={COLORS.cardBg}
                style={styles.profileCardGradient}
              >
                <View style={styles.avatarContainer}>
                  <LinearGradient
                    colors={[COLORS.primary, COLORS.primaryLight] as const}
                    style={styles.avatar}
                  >
                    <Text style={styles.avatarText}>{getInitials()}</Text>
                  </LinearGradient>
                </View>
                
                <Text style={styles.profileName} numberOfLines={1} ellipsizeMode="tail">
                  {profile?.firstName} {profile?.lastName}
                </Text>
                <Text style={styles.profileEmail} numberOfLines={1} ellipsizeMode="tail">{profile?.email}</Text>

              <TouchableOpacity
                style={styles.editProfileButton}
                onPress={() => router.push('/patient/patient-edit-profile' as any)}
              >
                  <LinearGradient
                    colors={['rgba(16, 185, 129, 0.2)', 'rgba(52, 211, 153, 0.2)'] as const}
                    style={styles.editProfileGradient}
                  >
                    <Ionicons name="create-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.editProfileText}>{t('profile.editProfile')}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </View>

            {/* Personal Information Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('profile.personalInfo')}</Text>
              <View style={styles.sectionCard}>
                <LinearGradient
                  colors={COLORS.cardBg}
                  style={styles.sectionGradient}
                >
                {renderSettingItem(
                  'call',
                  t('profile.phone'),
                  profile?.phoneNumber,
                  () => router.push('/patient/patient-edit-profile' as any),
                  false
                )}
                </LinearGradient>
              </View>
            </View>

            {/* Preferences Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('profile.preferences')}</Text>
              <View style={styles.sectionCard}>
                <LinearGradient
                  colors={COLORS.cardBg}
                  style={styles.sectionGradient}
                >
                  {renderSettingItem(
                    'notifications',
                    t('profile.notifications'),
                    t('profile.notificationsDesc'),
                    undefined,
                    false,
                    <Switch
                      value={notificationsEnabled}
                      onValueChange={handleNotificationToggle}
                      trackColor={{ false: '#767577', true: COLORS.primary }}
                      thumbColor={notificationsEnabled ? '#fff' : '#f4f3f4'}
                    />
                  )}
                  {renderSettingItem(
                    'language',
                    t('language.title'),
                    currentLanguage === 'fr' ? t('language.french') : currentLanguage === 'ar' ? t('language.arabic') : t('language.english'),
                    () => setShowLanguagePicker(true)
                  )}
                  {renderSettingItem(
                    'time',
                    t('profile.timezone'),
                    profile?.timezone || 'Africa/Tunis',
                    () => {},
                    false
                  )}
                </LinearGradient>
              </View>
            </View>

            {/* Health Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('profile.health')}</Text>
              <View style={styles.sectionCard}>
                <LinearGradient
                  colors={COLORS.cardBg}
                  style={styles.sectionGradient}
                >
                  {renderSettingItem(
                    'medical',
                    t('profile.medications'),
                    t('profile.medicationsDesc'),
                    () => router.push('/patient/patient-dashboard')
                  )}
                  {renderSettingItem(
                    'stats-chart',
                    t('profile.adherenceHistory'),
                    t('profile.adherenceHistoryDesc'),
                    () => router.push('/patient/patient-adherence-history' as any)
                  )}
                </LinearGradient>
              </View>
            </View>

            {/* Security Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('profile.security')}</Text>
              <View style={styles.sectionCard}>
                <LinearGradient
                  colors={COLORS.cardBg}
                  style={styles.sectionGradient}
                >
                  {renderSettingItem(
                    'lock-closed',
                    t('profile.changePassword'),
                    t('profile.changePasswordDesc'),
                    () => router.push('/auth/forgot-password')
                  )}
                  {renderSettingItem(
                    'shield-checkmark',
                    t('profile.twoFactor'),
                    t('profile.twoFactorDesc'),
                    () => {},
                    false
                  )}
                </LinearGradient>
              </View>
            </View>

            {/* Legal Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('profile.legal')}</Text>
              <View style={styles.sectionCard}>
                <LinearGradient
                  colors={COLORS.cardBg}
                  style={styles.sectionGradient}
                >
                  {renderSettingItem(
                    'document-text',
                    t('profile.terms'),
                    t('profile.termsDesc'),
                    () => router.push('/shared/terms' as any)
                  )}
                  {renderSettingItem(
                    'shield',
                    t('profile.privacy'),
                    t('profile.privacyDesc'),
                    () => router.push('/shared/privacy-policy' as any)
                  )}
                  {renderSettingItem(
                    'information-circle',
                    t('profile.about'),
                    t('profile.version'),
                    () => {},
                    false
                  )}
                </LinearGradient>
              </View>
            </View>

            {/* Logout Button */}
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <LinearGradient
                colors={COLORS.error}
                style={styles.logoutGradient}
              >
                <Ionicons name="log-out-outline" size={22} color="white" />
                <Text style={styles.logoutText}>{t('profile.logout')}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.bottomSpacing} />
          </ScrollView>

          {/* Feedback Modal */}
          <FeedbackModal
            visible={feedbackModal.visible}
            type={feedbackModal.type}
            title={feedbackModal.title}
            message={feedbackModal.message}
            onConfirm={feedbackModal.onConfirm}
            onCancel={() => setFeedbackModal(prev => ({ ...prev, visible: false }))}
            confirmText={t('common.confirm')}
            cancelText={t('common.cancel')}
          />

          {/* Language Picker Modal */}
          <LanguagePickerModal
            visible={showLanguagePicker}
            currentLanguage={currentLanguage}
            onSelect={handleLanguageChangeWithAPI}
            onClose={() => setShowLanguagePicker(false)}
            theme="patient"
          />
        </LinearGradient>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textTertiary,
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
  profileCard: {
    marginTop: 24,
    borderRadius: 20,
    overflow: 'hidden',
  },
  profileCardGradient: {
    padding: 24,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  profileEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  editProfileButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  editProfileGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  sectionGradient: {
    padding: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    marginBottom: 2,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: COLORS.textTertiary,
  },
  logoutButton: {
    marginTop: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  logoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  bottomSpacing: {
    height: 40,
  },
});

