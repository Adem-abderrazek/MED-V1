import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserProfile, updateUserProfile } from '../../shared/services/api/common';
import { useModal } from '../../shared/hooks/useModal';
import CustomModal from '../../shared/components/ui/Modal';
import { getThemeColors } from '../../config/theme';
import { networkMonitor } from '../../shared/services/networkMonitor';
import { loadCachedProfile, saveCachedProfile } from '../../shared/utils/profileCache';

interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
}

export default function DoctorEditProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { visible, modalData, showModal, hideModal } = useModal();
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userType, setUserType] = useState<'medecin' | 'tuteur' | 'patient' | null>(null);
  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
  });

  useEffect(() => {
    const loadProfile = async () => {
      let resolvedUserId: string | null = null;
      const storedToken = await AsyncStorage.getItem('userToken');
      setToken(storedToken);

      // Load user type
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          setUserType(user.userType);
          resolvedUserId = user?.id || null;
          setUserId(resolvedUserId);
        } catch {
          setUserType(null);
          setUserId(null);
        }
      }

      if (storedToken) {
        try {
          const online = await networkMonitor.isOnline();
          if (!online) {
            const cached = await loadCachedProfile<any>(resolvedUserId);
            if (cached) {
              setFormData({
                firstName: cached.firstName || '',
                lastName: cached.lastName || '',
                email: cached.email || '',
                phoneNumber: cached.phoneNumber || cached.phone || '',
              });
              if (cached.userType) {
                setUserType(cached.userType);
              }
            }
            return;
          }

          const result = await getUserProfile(storedToken);
          if (result.success && result.data) {
            const data = result.data as any;
            setFormData({
              firstName: data.firstName || '',
              lastName: data.lastName || '',
              email: data.email || '',
              phoneNumber: data.phoneNumber || '',
            });
            await saveCachedProfile(data, resolvedUserId);
            // Also set userType from profile if available
            if (data.userType) {
              setUserType(data.userType);
            }
          } else {
            const cached = await loadCachedProfile<any>(resolvedUserId);
            if (cached) {
              setFormData({
                firstName: cached.firstName || '',
                lastName: cached.lastName || '',
                email: cached.email || '',
                phoneNumber: cached.phoneNumber || cached.phone || '',
              });
              if (cached.userType) {
                setUserType(cached.userType);
              }
            }
          }
        } catch (error) {
          console.error('Error loading profile:', error);
          const cached = await loadCachedProfile<any>(resolvedUserId);
          if (cached) {
            setFormData({
              firstName: cached.firstName || '',
              lastName: cached.lastName || '',
              email: cached.email || '',
              phoneNumber: cached.phoneNumber || cached.phone || '',
            });
            if (cached.userType) {
              setUserType(cached.userType);
            }
          } else {
            showModal('error', t('common.error'), t('common.errorMessage'));
          }
        } finally {
          setIsLoading(false);
        }
      }
    };
    loadProfile();
  }, []);

  const handleSave = async () => {
    if (!token) return;

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      showModal('error', t('common.error'), t('auth.firstName') + ' ' + t('common.required'));
      return;
    }

    if (!formData.email.trim() || !formData.email.includes('@')) {
      showModal('error', t('common.error'), t('auth.invalidEmailMessage'));
      return;
    }

    setIsSaving(true);

    try {
      const result = await updateUserProfile(token, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phoneNumber,
      });

      if (result.success) {
        const cached = await loadCachedProfile<any>(userId);
        const updatedProfile = {
          ...(cached || {}),
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          phone: formData.phoneNumber,
          userType: userType || (cached ? cached.userType : undefined),
        };
        await saveCachedProfile(updatedProfile, userId);
        showModal('success', t('common.success'), t('profile.editProfile') + ' ' + t('common.success'));
        setTimeout(() => {
          hideModal();
          router.back();
        }, 1500);
      } else {
        throw new Error(result.message || t('common.error'));
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      showModal('error', t('common.error'), error.message || t('common.errorMessage'));
    } finally {
      setIsSaving(false);
    }
  };

  const colors = useMemo(() => getThemeColors(userType), [userType]);
  const gradientColors = (colors.background || ['#1a1a2e', '#16213e', '#0f3460']) as [string, string, string];
  const primaryGradient = (colors.gradient || ['#4facfe', '#00f2fe']) as [string, string];

  if (isLoading) {
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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
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
            <Text style={styles.headerTitle}>{t('profile.editProfile')}</Text>
            <View style={styles.headerSpacer} />
          </LinearGradient>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>
                {t('profile.personalInfo')}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('auth.firstName')} *</Text>
                <View style={[styles.inputContainer, { borderColor: `${colors.primary}30` }]}>
                  <Ionicons name="person" size={20} color={colors.textTertiary} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={formData.firstName}
                    onChangeText={(text) => setFormData({ ...formData, firstName: text })}
                    placeholder={t('auth.firstName')}
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('auth.lastName')} *</Text>
                <View style={[styles.inputContainer, { borderColor: `${colors.primary}30` }]}>
                  <Ionicons name="person" size={20} color={colors.textTertiary} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={formData.lastName}
                    onChangeText={(text) => setFormData({ ...formData, lastName: text })}
                    placeholder={t('auth.lastName')}
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('auth.email')} *</Text>
                <View style={[styles.inputContainer, { borderColor: `${colors.primary}30` }]}>
                  <Ionicons name="mail" size={20} color={colors.textTertiary} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={formData.email}
                    onChangeText={(text) => setFormData({ ...formData, email: text })}
                    placeholder={t('auth.emailPlaceholder')}
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('auth.phoneNumber')}</Text>
                <View style={[styles.inputContainer, { borderColor: `${colors.primary}30` }]}>
                  <Ionicons name="call" size={20} color={colors.textTertiary} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={formData.phoneNumber}
                    onChangeText={(text) => setFormData({ ...formData, phoneNumber: text })}
                    placeholder={t('auth.phonePlaceholder')}
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.disabledButton]}
              onPress={handleSave}
              disabled={isSaving}
            >
              <LinearGradient colors={primaryGradient} style={styles.saveGradient}>
                <Ionicons name="checkmark-circle" size={22} color="white" />
                <Text style={styles.saveText}>
                  {isSaving ? t('common.loading') : t('common.save')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.bottomSpacing} />
          </ScrollView>
        </KeyboardAvoidingView>

        <CustomModal
          visible={visible}
          title={modalData.title}
          message={modalData.message}
          type={modalData.type}
          onClose={hideModal}
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
  keyboardView: {
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
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    marginLeft: 12,
  },
  saveButton: {
    marginTop: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  bottomSpacing: {
    height: 40,
  },
});



