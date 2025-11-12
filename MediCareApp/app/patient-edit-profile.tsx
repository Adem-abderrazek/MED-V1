import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getUserProfile, updateUserProfile } from '../services/api/common';
import FeedbackModal from '../components/FeedbackModal';

// Green theme colors for patients
const COLORS = {
  primary: '#10B981',
  primaryLight: '#34D399',
  primaryDark: '#059669',
  background: ['#1a1a2e', '#1B2E1F', '#1D3020'],
  cardBg: ['rgba(16, 185, 129, 0.1)', 'rgba(16, 185, 129, 0.05)'],
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.8)',
  textTertiary: 'rgba(255, 255, 255, 0.6)',
  success: ['#10B981', '#059669'],
  error: ['#EF4444', '#DC2626'],
};

interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
}

export default function PatientEditProfileScreen() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
  });
  const [feedbackModal, setFeedbackModal] = useState({
    visible: false,
    type: 'success' as 'success' | 'error',
    title: '',
    message: '',
  });

  useEffect(() => {
    const loadProfile = async () => {
      const storedToken = await AsyncStorage.getItem('userToken');
      setToken(storedToken);

      if (storedToken) {
        try {
          const result = await getUserProfile(storedToken);
          if (result.success && result.data) {
            setFormData({
              firstName: (result.data as any).firstName || '',
              lastName: (result.data as any).lastName || '',
              email: (result.data as any).email || '',
              phoneNumber: (result.data as any).phoneNumber || '',
            });
          }
        } catch (error) {
          console.error('Error loading profile:', error);
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
      setFeedbackModal({
        visible: true,
        type: 'error',
        title: 'Erreur',
        message: 'Le prénom et le nom sont obligatoires',
      });
      return;
    }

    if (!formData.email.trim() || !formData.email.includes('@')) {
      setFeedbackModal({
        visible: true,
        type: 'error',
        title: 'Erreur',
        message: 'Veuillez entrer une adresse email valide',
      });
      return;
    }

    setIsSaving(true);

    try {
      console.log('💾 Updating profile with data:', formData);
      
      const updateData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phoneNumber,
      };
      
      const result = await updateUserProfile(token, updateData);
      console.log('📥 Update result:', result);

      if (result.success) {
        setFeedbackModal({
          visible: true,
          type: 'success',
          title: 'Succès',
          message: 'Profil mis à jour avec succès',
        });
        setTimeout(() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/patient-profile-settings');
          }
        }, 1500);
      } else {
        throw new Error(result.message || 'Erreur lors de la mise à jour');
      }
    } catch (error: any) {
      console.error('❌ Error updating profile:', error);
      setFeedbackModal({
        visible: true,
        type: 'error',
        title: 'Erreur',
        message: error.message || 'Erreur lors de la mise à jour du profil',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={COLORS.background} style={styles.background}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
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
                  router.replace('/patient-profile-settings');
                }
              }}>
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Modifier le profil</Text>
              <View style={styles.headerSpacer} />
            </LinearGradient>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Basic Information */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Informations de base</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Prénom *</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="person" size={20} color={COLORS.textTertiary} />
                    <TextInput
                      style={styles.input}
                      value={formData.firstName}
                      onChangeText={(text) => setFormData({ ...formData, firstName: text })}
                      placeholder="Prénom"
                      placeholderTextColor={COLORS.textTertiary}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Nom *</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="person" size={20} color={COLORS.textTertiary} />
                    <TextInput
                      style={styles.input}
                      value={formData.lastName}
                      onChangeText={(text) => setFormData({ ...formData, lastName: text })}
                      placeholder="Nom"
                      placeholderTextColor={COLORS.textTertiary}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email *</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="mail" size={20} color={COLORS.textTertiary} />
                    <TextInput
                      style={styles.input}
                      value={formData.email}
                      onChangeText={(text) => setFormData({ ...formData, email: text })}
                      placeholder="exemple@email.com"
                      placeholderTextColor={COLORS.textTertiary}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Téléphone</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="call" size={20} color={COLORS.textTertiary} />
                    <TextInput
                      style={styles.input}
                      value={formData.phoneNumber}
                      onChangeText={(text) => setFormData({ ...formData, phoneNumber: text })}
                      placeholder="+216 XX XXX XXX"
                      placeholderTextColor={COLORS.textTertiary}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.disabledButton]}
                onPress={handleSave}
                disabled={isSaving}
              >
                <LinearGradient
                  colors={COLORS.success}
                  style={styles.saveGradient}
                >
                  <Ionicons name="checkmark-circle" size={22} color="white" />
                  <Text style={styles.saveText}>
                    {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.bottomSpacing} />
            </ScrollView>
          </KeyboardAvoidingView>

          {/* Feedback Modal */}
          <FeedbackModal
            visible={feedbackModal.visible}
            type={feedbackModal.type}
            title={feedbackModal.title}
            message={feedbackModal.message}
            onConfirm={() => setFeedbackModal(prev => ({ ...prev, visible: false }))}
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
  keyboardView: {
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
    color: '#FFFFFF',
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
    color: '#10B981',
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
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  input: {
    flex: 1,
    height: 50,
    color: 'white',
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

