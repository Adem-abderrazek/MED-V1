import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { getThemeColors } from '../config/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../services/api';
import CustomModal from '../components/Modal';

const { width } = Dimensions.get('window');

interface NewPatient {
  phoneNumber: string;
}

interface PatientInvitationResponse {
  success: boolean;
  message?: string;
  data?: {
    smsSent: boolean;
    patientId: string;
    voiceMessageId?: string;
    generatedEmail: string;
  };
}

export default function AddPatientScreen() {
  const router = useRouter();
  const [newPatient, setNewPatient] = useState<NewPatient>({
    phoneNumber: ''
  });
  
  const [sending, setSending] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [userType, setUserType] = useState<'medecin' | 'tuteur' | null>(null);
  
  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info',
    primaryButton: undefined as { text: string; onPress: () => void } | undefined,
    secondaryButton: undefined as { text: string; onPress: () => void } | undefined,
  });

  // Helper function to show modal
  const showModal = useCallback((
    title: string,
    message: string,
    type: 'success' | 'error' | 'warning' | 'info',
    primaryButton?: { text: string; onPress: () => void },
    secondaryButton?: { text: string; onPress: () => void }
  ) => {
    setModalConfig({
      title,
      message,
      type,
      primaryButton: primaryButton || undefined,
      secondaryButton: secondaryButton || undefined,
    });
    setModalVisible(true);
  }, []);

  // Load token and user type on mount
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

  const validateForm = () => {
    if (!newPatient.phoneNumber.trim()) {
      showModal(
        'Erreur',
        'Le numéro de téléphone est requis',
        'error'
      );
      return false;
    }

    return true;
  };

  const sendInvitation = async () => {
    console.log('═══════════════════════════════════════════════════');
    console.log('🚀 STARTING ADD PATIENT PROCESS');
    console.log('═══════════════════════════════════════════════════');
    
    if (!validateForm()) {
      console.log('❌ Validation failed');
      return;
    }

    if (!token) {
      console.log('❌ No token available');
      showModal(
        'Erreur',
        'Session expirée. Veuillez vous reconnecter.',
        'error',
        {
          text: 'Se connecter',
          onPress: () => router.push('/login')
        }
      );
      router.push('/login');
      return;
    }

    console.log('✅ Token available:', token.substring(0, 20) + '...');
    console.log('📝 Patient phone number:', newPatient.phoneNumber);

    setSending(true);

    try {
      console.log('───────────────────────────────────────────────────');
      console.log('📤 SENDING PATIENT INVITATION');
      console.log('───────────────────────────────────────────────────');

      // Send patient invitation using API service (without voice message)
      const invitationData = {
        phoneNumber: newPatient.phoneNumber
      };

      console.log('📝 Invitation data:', JSON.stringify(invitationData, null, 2));
      console.log('🌐 Calling API: sendPatientInvitation...');
      
      const result = await apiService.sendPatientInvitation(token, invitationData) as PatientInvitationResponse;
      
      console.log('───────────────────────────────────────────────────');
      console.log('📥 INVITATION RESULT');
      console.log('───────────────────────────────────────────────────');
      console.log('Result:', JSON.stringify(result, null, 2));
      
      if (result.success) {
        console.log('✅ Invitation sent successfully!');
        console.log('📱 SMS sent:', result.data?.smsSent);
        console.log('👤 Patient ID:', result.data?.patientId);
        console.log('📧 Generated email:', result.data?.generatedEmail);
        console.log('═══════════════════════════════════════════════════');
        
        showModal(
          'Invitation envoyée',
          `Invitation envoyée avec succès au ${newPatient.phoneNumber}.`,
          'success',
          {
            text: 'OK',
            onPress: () => {
              setModalVisible(false);
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/doctor-dashboard');
              }
            }
          }
        );
      } else {
        console.error('❌ Invitation failed:', result.message);
        throw new Error(result.message || 'Échec de l\'envoi de l\'invitation');
      }
    } catch (error: any) {
      console.error('═══════════════════════════════════════════════════');
      console.error('❌ ERROR IN ADD PATIENT PROCESS');
      console.error('═══════════════════════════════════════════════════');
      console.error('Error:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      showModal(
        'Erreur',
        error.message || 'Impossible d\'envoyer l\'invitation',
        'error'
      );
    } finally {
      setSending(false);
      console.log('═══════════════════════════════════════════════════');
      console.log('🏁 ADD PATIENT PROCESS COMPLETED');
      console.log('═══════════════════════════════════════════════════');
    }
  };

  // Always use blue doctor theme for add-patient screen (both doctors and tutors)
  const colors = getThemeColors('medecin');
  const gradientColors = (colors.background || ['#1a1a2e', '#16213e', '#0f3460']) as [string, string, string];
  const primaryGradient = (colors.gradient || ['#4facfe', '#00f2fe']) as [string, string];
  const errorGradient = (colors.error || ['#EF4444', '#DC2626']) as [string, string];
  const warningGradient = (colors.warning || ['#F59E0B', '#D97706']) as [string, string];
  const successGradient = (colors.success || ['#10B981', '#059669']) as [string, string];
  const disabledGradient = [colors.textTertiary, colors.textTertiary] as [string, string];

  return (
      <View style={styles.container}>
      <LinearGradient
        colors={gradientColors}
        style={styles.background}
      >
        {/* Custom Header */}
        <LinearGradient
          colors={primaryGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.customHeader}
        >
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/doctor-dashboard');
              }
            }}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Ajouter un Patient</Text>
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
              <Ionicons name="phone-portrait" size={24} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Numéro de Téléphone</Text>
            </View>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: `${colors.primary}10`,
                  borderColor: `${colors.primary}20`,
                  color: colors.text
                }]}
                placeholder="Numéro de téléphone du patient"
                placeholderTextColor={colors.textTertiary}
                value={newPatient.phoneNumber}
                onChangeText={(text) => setNewPatient({...newPatient, phoneNumber: text})}
                keyboardType="phone-pad"
                autoFocus={true}
              />
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[
                styles.sendButton,
                (!newPatient.phoneNumber || sending) && styles.disabledButton,
                { shadowColor: colors.primary }
              ]}
              onPress={sendInvitation}
              disabled={!newPatient.phoneNumber || sending}
            >
              <LinearGradient
                colors={(!newPatient.phoneNumber || sending) ? disabledGradient : primaryGradient}
                style={styles.sendButtonGradient}
              >
                <Ionicons name="send" size={20} color="white" />
                <Text style={[styles.sendButtonText, { color: colors.text }]}>
                  {sending ? 'Envoi en cours...' : 'Envoyer l\'Invitation'}
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
              Le patient recevra un SMS avec le lien de téléchargement de l'application et ses identifiants de connexion.
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
      
      {/* Custom Modal */}
      <CustomModal
        visible={modalVisible}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onClose={() => setModalVisible(false)}
        primaryButton={modalConfig.primaryButton}
        secondaryButton={modalConfig.secondaryButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  customHeader: {
    paddingTop: 50,
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
  
  // Card Styles
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
  
  // Input Styles
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
  
  // Button Styles
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
  },
  disabledButton: {
    opacity: 0.5,
  },
  
  // Info Banner
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
