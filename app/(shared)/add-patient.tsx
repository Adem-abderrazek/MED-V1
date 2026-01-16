import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendPatientInvitation } from '../../shared/services/api/caregiver';
import InternationalPhoneInput, { PhoneInputValue } from '../../shared/components/forms/InternationalPhoneInput';
import { extractErrorMessage } from '../../shared/utils/errorHandling';
import { useModal } from '../../shared/hooks/useModal';
import CustomModal from '../../shared/components/ui/Modal';
import { getThemeColors } from '../../config/theme';

export default function AddPatientScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { visible, modalData, showModal, hideModal } = useModal();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
  });
  const [phoneValidation, setPhoneValidation] = useState<PhoneInputValue | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [userType, setUserType] = useState<'medecin' | 'tuteur' | null>(null);

  useEffect(() => {
    const loadTokenAndUserType = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('userToken');
        setToken(storedToken);

        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const user = JSON.parse(userData);
          setUserType(user.userType);
        }
      } catch (error) {
        console.error('Error loading token:', error);
      }
    };
    loadTokenAndUserType();
  }, []);

  const handlePhoneChange = (value: PhoneInputValue) => {
    setPhoneValidation(value);
    setFormData(prev => ({ ...prev, phoneNumber: value.e164 }));
    setPhoneError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.firstName.trim()) {
      showModal('error', t('common.error'), t('auth.firstName') + ' ' + t('common.required'));
      return false;
    }

    if (!formData.lastName.trim()) {
      showModal('error', t('common.error'), t('auth.lastName') + ' ' + t('common.required'));
      return false;
    }

    if (!phoneValidation || !phoneValidation.isValid) {
      setPhoneError(t('auth.invalidPhoneMessage'));
      showModal('error', t('auth.invalidPhone'), t('auth.invalidPhoneMessage'));
      return false;
    }

    return true;
  };

  const handleSendInvitation = async () => {
    if (!validateForm()) return;

    if (!token) {
      showModal('error', t('common.error'), t('auth.loginError'));
      router.push('/(auth)/login' as any);
      return;
    }

    setIsLoading(true);

    try {
      const result = await sendPatientInvitation(token, {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phoneNumber: phoneValidation!.e164,
      });

      setIsLoading(false);

      if (result.success) {
        showModal('success', t('common.success'), t('dashboard.doctor.patientAdded') || `Invitation envoyée avec succès au ${formData.phoneNumber}`);
        setTimeout(() => {
          hideModal();
          router.back();
        }, 2000);
      } else {
        showModal('error', t('common.error'), result.message || t('common.error'));
      }
    } catch (error: any) {
      setIsLoading(false);
      console.error('Error sending invitation:', error);
      const errorMessage = extractErrorMessage(error, t('common.error'));
      showModal('error', t('common.error'), errorMessage);
    }
  };

  const colors = useMemo(() => getThemeColors(userType), [userType]);
  const gradientColors = (colors.background || ['#1a1a2e', '#16213e', '#0f3460']) as [string, string, string];
  const primaryGradient = (colors.gradient || ['#4facfe', '#00f2fe']) as [string, string];

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={gradientColors} style={styles.background}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          {/* Header */}
          <LinearGradient
            colors={primaryGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.header}
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('dashboard.doctor.addPatient') || 'Ajouter un Patient'}</Text>
            <View style={styles.headerSpacer} />
          </LinearGradient>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Patient Information Card */}
            <View style={[styles.card, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}20` }]}>
              <View style={styles.cardHeader}>
                <Ionicons name="person" size={24} color={colors.primary} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  {t('dashboard.doctor.patientInfo') || 'Informations du Patient'}
                </Text>
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: `${colors.primary}10`,
                    borderColor: `${colors.primary}20`,
                    color: colors.text
                  }]}
                  placeholder={t('auth.firstName')}
                  placeholderTextColor={colors.textTertiary}
                  value={formData.firstName}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, firstName: text }))}
                  autoCapitalize="words"
                  autoFocus={true}
                />

                <TextInput
                  style={[styles.input, {
                    backgroundColor: `${colors.primary}10`,
                    borderColor: `${colors.primary}20`,
                    color: colors.text
                  }]}
                  placeholder={t('auth.lastName')}
                  placeholderTextColor={colors.textTertiary}
                  value={formData.lastName}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, lastName: text }))}
                  autoCapitalize="words"
                />
              </View>

              {/* Phone Input */}
              <View style={styles.phoneInputWrapper}>
                <InternationalPhoneInput
                  value={formData.phoneNumber}
                  onChange={handlePhoneChange}
                  onBlur={() => {
                    if (phoneValidation && !phoneValidation.isValid) {
                      setPhoneError(t('auth.invalidPhoneMessage'));
                    }
                  }}
                  defaultCountry="TN"
                  required={true}
                  error={phoneError || undefined}
                  theme={userType || 'medecin'}
                  placeholder={t('auth.phonePlaceholder')}
                  accessibilityLabel="Patient phone number"
                  testID="add-patient-phone-input"
                />
              </View>
            </View>

            {/* Action Button */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!formData.firstName || !formData.lastName || !phoneValidation?.isValid || isLoading) && styles.disabledButton,
                  { shadowColor: colors.primary }
                ]}
                onPress={handleSendInvitation}
                disabled={!formData.firstName || !formData.lastName || !phoneValidation?.isValid || isLoading}
              >
                <LinearGradient
                  colors={(!formData.firstName || !formData.lastName || !phoneValidation?.isValid || isLoading) 
                    ? [colors.textTertiary, colors.textTertiary] 
                    : primaryGradient}
                  style={styles.sendButtonGradient}
                >
                  <Ionicons name="send" size={20} color="white" />
                  <Text style={styles.sendButtonText}>
                    {isLoading ? t('common.loading') : (t('dashboard.doctor.sendInvitation') || 'Envoyer l\'Invitation')}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Info Banner */}
            <View style={[styles.infoBanner, {
              backgroundColor: `${colors.primary}10`,
              borderColor: `${colors.primary}30`
            }]}>
              <Ionicons name="information-circle" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {t('dashboard.doctor.invitationInfo') || 'Le patient recevra un SMS avec le lien de téléchargement de l\'application et ses identifiants de connexion.'}
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>

      <CustomModal
        visible={visible}
        title={modalData.title}
        message={modalData.message}
        type={modalData.type}
        onClose={hideModal}
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
  keyboardAvoidingView: {
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
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
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  inputContainer: {
    gap: 16,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
  },
  phoneInputWrapper: {
    marginTop: 16,
  },
  buttonContainer: {
    marginTop: 24,
  },
  sendButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  sendButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 12,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  disabledButton: {
    opacity: 0.5,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    marginBottom: 40,
    borderWidth: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    marginLeft: 12,
    lineHeight: 20,
  },
});



