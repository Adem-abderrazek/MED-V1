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
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiService from '../services/api';
import FeedbackModal from '../components/FeedbackModal';

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
  // Extended fields from UserSetting
  timezone?: string;
  language?: string;
}

export default function DoctorProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [userType, setUserType] = useState<'medecin' | 'tuteur' | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  useEffect(() => {
    if (profile) {
      setNotificationsEnabled(profile.notificationsEnabled);
    }
  }, [profile]);

  const handleNotificationToggle = async (value: boolean) => {
    setNotificationsEnabled(value);
    
    if (!token) return;

    try {
      // Update notifications setting in backend
      const result = await apiService.updateUserProfile(token, {
        notificationsEnabled: value,
      } as any);
      console.log('✅ Notification preference updated');
    } catch (error) {
      console.error('Error updating notification preference:', error);
      // Revert on error
      setNotificationsEnabled(!value);
    }
  };

  const [showEditModal, setShowEditModal] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState({
    visible: false,
    type: 'success' as 'success' | 'error' | 'confirm',
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    const loadUserData = async () => {
      const storedToken = await AsyncStorage.getItem('userToken');
      const userData = await AsyncStorage.getItem('userData');
      
      setToken(storedToken);
      
      if (userData) {
        const user = JSON.parse(userData);
        setUserType(user.userType);
      }
    };
    loadUserData();
  }, []);

  const loadProfile = useCallback(async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      const result = await apiService.getUserProfile(token);
      
      if (result.success && result.data) {
        setProfile(result.data);
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

  // Auto-refresh profile when screen comes into focus (e.g., after editing)
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

  const handleLogout = () => {
    setFeedbackModal({
      visible: true,
      type: 'confirm',
      title: 'Déconnexion',
      message: 'Êtes-vous sûr de vouloir vous déconnecter ?',
      onConfirm: async () => {
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userData');
        setFeedbackModal(prev => ({ ...prev, visible: false }));
        router.replace('/login');
      },
    });
  };

  const getInitials = () => {
    if (!profile) return '?';
    return `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase();
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
        <Ionicons name={icon as any} size={22} color="#4facfe" />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle} numberOfLines={1} ellipsizeMode="tail">{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle} numberOfLines={1} ellipsizeMode="tail">{subtitle}</Text>}
      </View>
      {rightElement || (showArrow && (
        <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.4)" />
      ))}
    </TouchableOpacity>
  );

  if (isLoading && !profile) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={["#1a1a2e", "#16213e", "#0f3460"]} style={styles.background}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={["#1a1a2e", "#16213e", "#0f3460"]} style={styles.background}>
          {/* Header */}
          <LinearGradient
          colors={["#4facfe", "#00f2fe"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/doctor-dashboard');
            }
          }}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profil</Text>
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
              colors={["#4facfe"]}
            />
          }
        >
          {/* Profile Card */}
          <View style={styles.profileCard}>
            <LinearGradient
              colors={["rgba(255, 255, 255, 0.1)", "rgba(255, 255, 255, 0.05)"]}
              style={styles.profileCardGradient}
            >
              <View style={styles.avatarContainer}>
                <LinearGradient
                  colors={["#4facfe", "#00f2fe"]}
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
                onPress={() => router.push('/edit-profile' as any)}
              >
                <LinearGradient
                  colors={["rgba(79, 172, 254, 0.2)", "rgba(0, 242, 254, 0.2)"]}
                  style={styles.editProfileGradient}
                >
                  <Ionicons name="create-outline" size={18} color="#4facfe" />
                  <Text style={styles.editProfileText}>Modifier le profil</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>

          {/* Personal Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations personnelles</Text>
            <View style={styles.sectionCard}>
              <LinearGradient
                colors={["rgba(255, 255, 255, 0.1)", "rgba(255, 255, 255, 0.05)"]}
                style={styles.sectionGradient}
              >
                {renderSettingItem(
                  'call',
                  'Téléphone',
                  profile?.phoneNumber,
                  () => router.push('/edit-profile' as any),
                  false
                )}
              </LinearGradient>
            </View>
          </View>

          {/* Preferences Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Préférences</Text>
            <View style={styles.sectionCard}>
              <LinearGradient
                colors={["rgba(255, 255, 255, 0.1)", "rgba(255, 255, 255, 0.05)"]}
                style={styles.sectionGradient}
              >
                {renderSettingItem(
                  'notifications',
                  'Notifications',
                  'Recevoir les alertes',
                  undefined,
                  false,
                  <Switch
                    value={notificationsEnabled}
                    onValueChange={handleNotificationToggle}
                    trackColor={{ false: '#767577', true: '#4facfe' }}
                    thumbColor={notificationsEnabled ? '#fff' : '#f4f3f4'}
                  />
                )}
                {renderSettingItem(
                  'language',
                  'Langue',
                  profile?.language === 'fr' ? 'Français' : profile?.language === 'ar' ? 'العربية' : 'English',
                  () => {}
                )}
                {renderSettingItem(
                  'time',
                  'Fuseau horaire',
                  profile?.timezone || 'Africa/Tunis',
                  () => {},
                  false
                )}
              </LinearGradient>
            </View>
          </View>

          {/* Security Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sécurité</Text>
            <View style={styles.sectionCard}>
              <LinearGradient
                colors={["rgba(255, 255, 255, 0.1)", "rgba(255, 255, 255, 0.05)"]}
                style={styles.sectionGradient}
              >
                {renderSettingItem(
                  'lock-closed',
                  'Changer le mot de passe',
                  'Modifier votre mot de passe',
                  () => router.push('/forgot-password')
                )}
                {renderSettingItem(
                  'shield-checkmark',
                  'Authentification à deux facteurs',
                  'Désactivée',
                  () => {},
                  false
                )}
              </LinearGradient>
            </View>
          </View>

          {/* Legal Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Légal</Text>
            <View style={styles.sectionCard}>
              <LinearGradient
                colors={["rgba(255, 255, 255, 0.1)", "rgba(255, 255, 255, 0.05)"]}
                style={styles.sectionGradient}
              >
                {renderSettingItem(
                  'document-text',
                  'Conditions d\'utilisation',
                  'Consulter les CGU',
                  () => router.push('/terms' as any)
                )}
                {renderSettingItem(
                  'shield',
                  'Politique de confidentialité',
                  'Protection de vos données',
                  () => router.push('/privacy-policy' as any)
                )}
                {renderSettingItem(
                  'information-circle',
                  'À propos de MediCare',
                  'Version 1.0.0',
                  () => {},
                  false
                )}
              </LinearGradient>
            </View>
          </View>

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LinearGradient
              colors={["#EF4444", "#DC2626"]}
              style={styles.logoutGradient}
            >
              <Ionicons name="log-out-outline" size={22} color="white" />
              <Text style={styles.logoutText}>Se déconnecter</Text>
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
          confirmText="Confirmer"
          cancelText="Annuler"
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
  specializationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(79, 172, 254, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
    gap: 6,
  },
  specializationText: {
    fontSize: 12,
    color: '#4facfe',
    fontWeight: '600',
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
    color: '#4facfe',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4facfe',
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
