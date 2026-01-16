import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getThemeColors } from '../../config/theme';
import { changePassword } from '../../shared/services/api/common';
import { useModal } from '../../shared/hooks/useModal';
import CustomModal from '../../shared/components/ui/Modal';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { visible, modalData, showModal, hideModal } = useModal();
  const [userType, setUserType] = useState<'medecin' | 'tuteur' | 'patient' | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [showPasswords, setShowPasswords] = useState({
    oldPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('userToken');
        setToken(storedToken);
        
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const user = JSON.parse(userData);
          setUserType(user.userType);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };
    loadUserData();
  }, []);

  const { colors, gradientColors, primaryGradient } = useMemo(() => {
    const themeColors = getThemeColors(userType || 'patient');
    const bgColors = (themeColors.background || ['#1a1a2e', '#1B2E1F', '#1D3020']) as [string, string, string];
    const primGradient = (themeColors.gradient || ['#10B981', '#34D399']) as [string, string];
    return {
      colors: themeColors,
      gradientColors: bgColors,
      primaryGradient: primGradient,
    };
  }, [userType]);

  const validateForm = () => {
    if (!formData.oldPassword.trim()) {
      showModal('error', t('auth.error'), t('auth.oldPasswordRequired') || 'Ancien mot de passe requis');
      return false;
    }
    
    if (!formData.newPassword.trim()) {
      showModal('error', t('auth.error'), t('auth.newPasswordRequired') || 'Nouveau mot de passe requis');
      return false;
    }
    
    if (formData.newPassword.length < 6) {
      showModal('error', t('auth.error'), t('auth.passwordMinLength') || 'Le mot de passe doit contenir au moins 6 caractères');
      return false;
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      showModal('error', t('auth.error'), t('auth.passwordsDoNotMatch') || 'Les mots de passe ne correspondent pas');
      return false;
    }
    
    if (formData.oldPassword === formData.newPassword) {
      showModal('error', t('auth.error'), t('auth.samePassword') || 'Le nouveau mot de passe doit être différent de l\'ancien');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!token) {
      showModal('error', t('auth.error'), t('auth.notAuthenticated') || 'Non authentifié');
      return;
    }

    setIsLoading(true);
    try {
      const result = await changePassword(token, formData.oldPassword, formData.newPassword);
      
      if (result.success) {
        showModal('success', t('auth.success'), t('auth.passwordChanged') || 'Mot de passe modifié avec succès');
        setTimeout(() => {
          hideModal();
          router.back();
        }, 2000);
      } else {
        showModal('error', t('auth.error'), result.message || t('auth.passwordChangeFailed') || 'Échec de la modification du mot de passe');
      }
    } catch (error: any) {
      console.error('Error changing password:', error);
      const errorMessage = error.message || t('auth.passwordChangeFailed') || 'Échec de la modification du mot de passe';
      showModal('error', t('auth.error'), errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = (field: 'oldPassword' | 'newPassword' | 'confirmPassword') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
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
          <Text style={styles.headerTitle}>{t('profile.changePassword')}</Text>
          <View style={styles.headerSpacer} />
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.formCard}>
            <LinearGradient
              colors={[`${colors.primary}15`, `${colors.primary}08`]}
              style={styles.formGradient}
            >
              <View style={styles.iconContainer}>
                <Ionicons name="lock-closed" size={48} color={colors.primary} />
              </View>

              <Text style={styles.description}>
                {t('auth.changePasswordDesc') || 'Entrez votre ancien mot de passe et choisissez un nouveau mot de passe sécurisé'}
              </Text>

              {/* Old Password */}
              <View style={styles.inputSection}>
                <Text style={[styles.label, { color: colors.primary }]}>
                  {t('auth.oldPassword') || 'Ancien mot de passe'}
                </Text>
                <View style={[styles.inputContainer, { borderColor: `${colors.primary}40` }]}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.textTertiary} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder={t('auth.oldPassword') || 'Ancien mot de passe'}
                    placeholderTextColor={colors.textTertiary}
                    value={formData.oldPassword}
                    onChangeText={(value) => setFormData(prev => ({ ...prev, oldPassword: value }))}
                    secureTextEntry={!showPasswords.oldPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => togglePasswordVisibility('oldPassword')}>
                    <Ionicons
                      name={showPasswords.oldPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.textTertiary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* New Password */}
              <View style={styles.inputSection}>
                <Text style={[styles.label, { color: colors.primary }]}>
                  {t('auth.newPassword') || 'Nouveau mot de passe'}
                </Text>
                <View style={[styles.inputContainer, { borderColor: `${colors.primary}40` }]}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.textTertiary} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder={t('auth.newPassword') || 'Nouveau mot de passe'}
                    placeholderTextColor={colors.textTertiary}
                    value={formData.newPassword}
                    onChangeText={(value) => setFormData(prev => ({ ...prev, newPassword: value }))}
                    secureTextEntry={!showPasswords.newPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => togglePasswordVisibility('newPassword')}>
                    <Ionicons
                      name={showPasswords.newPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.textTertiary}
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.hint}>
                  {t('auth.passwordMinLength') || 'Minimum 6 caractères'}
                </Text>
              </View>

              {/* Confirm Password */}
              <View style={styles.inputSection}>
                <Text style={[styles.label, { color: colors.primary }]}>
                  {t('auth.confirmPassword') || 'Confirmer le mot de passe'}
                </Text>
                <View style={[styles.inputContainer, { borderColor: `${colors.primary}40` }]}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.textTertiary} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder={t('auth.confirmPassword') || 'Confirmer le mot de passe'}
                    placeholderTextColor={colors.textTertiary}
                    value={formData.confirmPassword}
                    onChangeText={(value) => setFormData(prev => ({ ...prev, confirmPassword: value }))}
                    secureTextEntry={!showPasswords.confirmPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => togglePasswordVisibility('confirmPassword')}>
                    <Ionicons
                      name={showPasswords.confirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.textTertiary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={primaryGradient}
                  style={styles.submitGradient}
                >
                  {isLoading ? (
                    <Text style={styles.submitText}>{t('common.loading') || 'Chargement...'}</Text>
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="white" />
                      <Text style={styles.submitText}>
                        {t('auth.changePassword') || 'Changer le mot de passe'}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </ScrollView>

        <CustomModal
          visible={visible}
          title={modalData.title}
          message={modalData.message}
          type={modalData.type}
          onClose={hideModal}
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
  formCard: {
    marginTop: 24,
    marginBottom: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  formGradient: {
    padding: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  inputSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    minHeight: 20,
  },
  hint: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 6,
    marginLeft: 4,
  },
  submitButton: {
    marginTop: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

