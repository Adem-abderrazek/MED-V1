import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserProfile, updateUserProfile } from '../../shared/services/api/common';
import { useModal } from '../../shared/hooks/useModal';
import CustomModal from '../../shared/components/ui/Modal';
import LanguagePickerModal from '../../shared/components/modals/LanguagePickerModal';
import { useLanguageChange } from '../../shared/hooks/useLanguageChange';
import { getThemeColors } from '../../config/theme';
import { changeLanguage } from '../../i18n';

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  userType: string;
  notificationsEnabled: boolean;
  timezone?: string;
  language?: string;
}

export default function DoctorProfileScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { visible, modalData, showModal, hideModal } = useModal();
  const { currentLanguage, showLanguagePicker, setShowLanguagePicker } = useLanguageChange();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [userType, setUserType] = useState<'medecin' | 'tuteur' | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    const loadTokenAndUserType = async () => {
      const storedToken = await AsyncStorage.getItem('userToken');
      setToken(storedToken);
      
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        setUserType(user.userType);
      }
    };
    loadTokenAndUserType();
  }, []);

  const loadProfile = useCallback(async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      const result = await getUserProfile(token);
      
      if (result.success && result.data) {
        const data = result.data as UserProfile;
        setProfile(data);
        setNotificationsEnabled(data.notificationsEnabled ?? true);
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

  useFocusEffect(
    useCallback(() => {
      if (token) {
        loadProfile();
      }
    }, [token, loadProfile])
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadProfile();
  }, [loadProfile]);

  const handleNotificationToggle = async (value: boolean) => {
    setNotificationsEnabled(value);
    
    if (!token) return;

    try {
      await updateUserProfile(token, { notificationsEnabled: value } as any);
    } catch (error) {
      console.error('Error updating notification preference:', error);
      setNotificationsEnabled(!value);
    }
  };

  const handleLanguageChangeWithAPI = async (language: 'en' | 'fr' | 'ar') => {
    if (!token) return;

    try {
      await changeLanguage(language);
      i18n.emit('languageChanged', language);
      
      await updateUserProfile(token, { language } as any);
      
      if (profile) {
        setProfile({ ...profile, language });
      }
    } catch (error) {
      console.error('Error updating language preference:', error);
      showModal('error', t('common.error'), t('common.errorMessage'));
    }
  };

  const handleLogout = () => {
    showModal('info', t('profile.logout'), t('profile.logoutConfirm'));
    setTimeout(async () => {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      hideModal();
      router.replace('/(auth)/login' as any);
    }, 2000);
  };

  const getInitials = () => {
    if (!profile) return '?';
    return `${profile.firstName?.charAt(0) || 'D'}${profile.lastName?.charAt(0) || 'I'}`.toUpperCase();
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
        <Ionicons name={icon as any} size={22} color={colors.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle} numberOfLines={1} ellipsizeMode="tail">{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle} numberOfLines={1} ellipsizeMode="tail">{subtitle}</Text>}
      </View>
      {rightElement || (showArrow && (
        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
      ))}
    </TouchableOpacity>
  );

  // Get theme colors based on actual user type
  // Use useMemo to recalculate when userType or profile changes
  const { colors, gradientColors, primaryGradient } = useMemo(() => {
    const actualUserType = (userType || profile?.userType) as 'medecin' | 'tuteur' | 'patient' | null;
    const themeColors = getThemeColors(actualUserType || 'medecin');
    const bgColors = (themeColors.background || ['#1a1a2e', '#16213e', '#0f3460']) as [string, string, string];
    const primGradient = (themeColors.gradient || ['#4facfe', '#00f2fe']) as [string, string];
    return {
      colors: themeColors,
      gradientColors: bgColors,
      primaryGradient: primGradient,
    };
  }, [userType, profile?.userType]);

  if (isLoading && !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={gradientColors} style={styles.background}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>{t('common.loading')}</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

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
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
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
              colors={[colors.primary]}
            />
          }
        >
          {/* Profile Card */}
          <View style={styles.profileCard}>
            <LinearGradient
              colors={[`${colors.primary}10`, `${colors.primary}05`]}
              style={styles.profileCardGradient}
            >
              <View style={styles.avatarContainer}>
                <LinearGradient
                  colors={primaryGradient}
                  style={styles.avatar}
                >
                  <Text style={styles.avatarText}>{getInitials()}</Text>
                </LinearGradient>
              </View>
              
              <Text style={styles.profileName} numberOfLines={1} ellipsizeMode="tail">
                {userType === 'tuteur' ? '' : 'Dr. '}{profile?.firstName} {profile?.lastName}
              </Text>
              <Text style={styles.profileEmail} numberOfLines={1} ellipsizeMode="tail">{profile?.email}</Text>

              <TouchableOpacity
                style={styles.editProfileButton}
                onPress={() => router.push('/(doctor)/edit-profile' as any)}
              >
                <LinearGradient
                  colors={[`${colors.primary}20`, `${colors.primary}20`]}
                  style={styles.editProfileGradient}
                >
                  <Ionicons name="create-outline" size={18} color={colors.primary} />
                  <Text style={[styles.editProfileText, { color: colors.primary }]}>{t('profile.editProfile')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>

          {/* Personal Information Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t('profile.personalInfo')}</Text>
            <View style={styles.sectionCard}>
              <LinearGradient
                colors={[`${colors.primary}10`, `${colors.primary}05`]}
                style={styles.sectionGradient}
              >
                {renderSettingItem(
                  'call',
                  t('profile.phone'),
                  profile?.phoneNumber,
                  () => router.push('/(doctor)/edit-profile' as any),
                  false
                )}
              </LinearGradient>
            </View>
          </View>

          {/* Preferences Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t('profile.preferences')}</Text>
            <View style={styles.sectionCard}>
              <LinearGradient
                colors={[`${colors.primary}10`, `${colors.primary}05`]}
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
                    trackColor={{ false: '#767577', true: colors.primary }}
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

          {/* Security Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t('profile.security')}</Text>
            <View style={styles.sectionCard}>
              <LinearGradient
                colors={[`${colors.primary}10`, `${colors.primary}05`]}
                style={styles.sectionGradient}
              >
                {renderSettingItem(
                  'lock-closed',
                  t('profile.changePassword'),
                  t('profile.changePasswordDesc'),
                  () => router.push('/(auth)/change-password' as any)
                )}
              </LinearGradient>
            </View>
          </View>

          {/* Legal Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t('profile.legal')}</Text>
            <View style={styles.sectionCard}>
              <LinearGradient
                colors={[`${colors.primary}10`, `${colors.primary}05`]}
                style={styles.sectionGradient}
              >
                {renderSettingItem(
                  'document-text',
                  t('profile.terms'),
                  t('profile.termsDesc'),
                  () => router.push('/(shared)/terms' as any)
                )}
                {renderSettingItem(
                  'shield',
                  t('profile.privacy'),
                  t('profile.privacyDesc'),
                  () => router.push('/(shared)/privacy-policy' as any)
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
              colors={['#EF4444', '#DC2626']}
              style={styles.logoutGradient}
            >
              <Ionicons name="log-out-outline" size={22} color="white" />
              <Text style={styles.logoutText}>{t('profile.logout')}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.bottomSpacing} />
        </ScrollView>

        <CustomModal
          visible={visible}
          title={modalData.title}
          message={modalData.message}
          type={modalData.type}
          onClose={hideModal}
        />

        <LanguagePickerModal
          visible={showLanguagePicker}
          currentLanguage={currentLanguage}
          onSelect={handleLanguageChangeWithAPI}
          onClose={() => setShowLanguagePicker(false)}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
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
    color: 'white',
    marginBottom: 8,
  },
  profileEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
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
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
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
    backgroundColor: 'rgba(79, 172, 254, 0.1)',
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
    color: 'white',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
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


