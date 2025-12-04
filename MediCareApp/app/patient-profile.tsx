import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  RefreshControl,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../services/api';
import AddPrescriptionModal from '../components/AddPrescriptionModal';
import FeedbackModal from '../components/FeedbackModal';
import VoiceRecorderModal from '../components/VoiceRecorderModal';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { formatTime, formatDate, formatDateTime } from '../utils/timeFormatting';

const { width } = Dimensions.get('window');

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  lastVisit?: Date;
  medicationCount: number;
}

interface Medication {
  id: string;
  name: string;
  dosage?: string;
  frequency?: string;
  startDate?: Date;
  endDate?: Date;
  isActive: boolean;
  instructions?: string;
  customDosage?: string;
  medication?: {
    id: string;
    name: string;
    dosage?: string;
    form?: string;
    genericName?: string;
    description?: string;
  };
  schedules?: Array<{
    time: string;
    days: number[];
  }>;
  isChronic?: boolean;
  scheduleType?: 'daily' | 'weekly' | 'interval';
  intervalHours?: number;
}

export default function PatientProfileScreen() {
  const router = useRouter();
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<Medication | null>(null);
  
  // Feedback modals
  const [feedbackModal, setFeedbackModal] = useState<{
    visible: boolean;
    type: 'success' | 'error' | 'confirm';
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
  }>({
    visible: false,
    type: 'success',
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    visible: boolean;
    medication: Medication | null;
  }>({
    visible: false,
    medication: null,
  });

  // Voice messages state
  const [voiceMessages, setVoiceMessages] = useState<any[]>([]);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [currentPlayingVoice, setCurrentPlayingVoice] = useState<string | null>(null);
  const [currentVoiceUri, setCurrentVoiceUri] = useState<string | null>(null);
  
  // Adherence history state
  const [adherenceHistory, setAdherenceHistory] = useState<any>(null);
  const [adherenceLoading, setAdherenceLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'medications' | 'adherence' | 'voices'>('medications');
  
  // Initialize audio player for voice messages
  const voicePlayer = useAudioPlayer(currentVoiceUri ? { uri: currentVoiceUri } : null);

  // Load token on mount
  useEffect(() => {
    const loadToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('userToken');
        setToken(storedToken);
      } catch (error) {
        console.error('Error loading token:', error);
      }
    };
    loadToken();
  }, []);

  // Load patient data
  const loadPatientData = useCallback(async () => {
    if (!token || !patientId) return;

    try {
      setIsLoading(true);
      
      // Load patient details
      const patientResult = await apiService.getPatientDetails(token, patientId);
      console.log('📋 Patient details result:', patientResult);
      if (patientResult.success && patientResult.data) {
        // The tutor endpoint returns { patient, prescriptions, reminders }
        if (patientResult.data.patient) {
          setPatient(patientResult.data.patient);
          // Also use prescriptions from this response
          if (patientResult.data.prescriptions) {
            setMedications(patientResult.data.prescriptions || []);
          }
        } else {
          // Fallback if data is already the patient object
          setPatient(patientResult.data);
        }
      }

      // Load patient medications (if not already loaded from patient details)
      if (!patientResult.data?.prescriptions) {
        const medicationsResult = await apiService.getDoctorPatientMedications(token, patientId);
        if (medicationsResult.success) {
          setMedications(medicationsResult.data || []);
        }
      }

      // Load voice messages
      const voiceResult = await apiService.getPatientVoiceMessages(token, patientId);
      if (voiceResult.success) {
        console.log('🎤 Voice messages loaded:', voiceResult.data);
        console.log('🔍 First voice message details:', voiceResult.data?.[0]);
        console.log('🔍 Title check:', voiceResult.data?.[0]?.title);
        console.log('🔍 FileName check:', voiceResult.data?.[0]?.fileName);
        setVoiceMessages(voiceResult.data || []);
      }

      // Load adherence history
      await loadAdherenceHistory();
    } catch (error) {
      console.error('Error loading patient data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [token, patientId]);

  // Load adherence history
  const loadAdherenceHistory = useCallback(async () => {
    if (!token || !patientId) return;

    try {
      setAdherenceLoading(true);
      console.log('📊 Loading adherence history...');
      
      const result = await apiService.getPatientAdherenceHistory(token, patientId, 30);
      if (result.success && result.data) {
        console.log('✅ Adherence history loaded:', result.data);
        setAdherenceHistory(result.data);
      }
    } catch (error) {
      console.error('Error loading adherence history:', error);
    } finally {
      setAdherenceLoading(false);
    }
  }, [token, patientId]);

  useEffect(() => {
    loadPatientData();
  }, [loadPatientData]);

  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('📱 Patient profile screen focused - refreshing data...');
      if (token && patientId) {
        loadPatientData();
      }
    }, [token, patientId, loadPatientData])
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadPatientData();
  }, [loadPatientData]);

  const handleAddPrescription = () => {
    setSelectedPrescription(null);
    setShowPrescriptionModal(true);
  };

  const handleEditPrescription = (medication: Medication) => {
    setSelectedPrescription(medication);
    setShowPrescriptionModal(true);
  };

  const handleDeletePrescription = (medication: Medication) => {
    setDeleteConfirmModal({
      visible: true,
      medication: medication,
    });
  };

  const confirmDeletePrescription = async () => {
    if (!deleteConfirmModal.medication || !token) return;

    try {
      const result = await apiService.deletePrescription(token, deleteConfirmModal.medication.id);
      
      setDeleteConfirmModal({ visible: false, medication: null });
      
      if (result.success) {
        setFeedbackModal({
          visible: true,
          type: 'success',
          title: 'Succès',
          message: 'Prescription supprimée avec succès',
          onConfirm: () => {
            setFeedbackModal(prev => ({ ...prev, visible: false }));
            loadPatientData();
          },
        });
      } else {
        setFeedbackModal({
          visible: true,
          type: 'error',
          title: 'Erreur',
          message: result.message || 'Erreur lors de la suppression',
          onConfirm: () => setFeedbackModal(prev => ({ ...prev, visible: false })),
        });
      }
    } catch (error: any) {
      setDeleteConfirmModal({ visible: false, medication: null });
      setFeedbackModal({
        visible: true,
        type: 'error',
        title: 'Erreur',
        message: error.message || 'Erreur lors de la suppression',
        onConfirm: () => setFeedbackModal(prev => ({ ...prev, visible: false })),
      });
    }
  };

  const handleSavePrescription = async (prescriptionData: any) => {
    try {
      if (!token || !patientId) {
        throw new Error('Token ou ID patient manquant');
      }

      let result;
      if (selectedPrescription) {
        // Update existing prescription
        result = await apiService.updatePrescription(token, selectedPrescription.id, prescriptionData);
      } else {
        // Create new prescription
        result = await apiService.createPrescription(token, patientId, prescriptionData);
      }

      if (result.success) {
        setShowPrescriptionModal(false);
        setSelectedPrescription(null);
        
        // Reload data immediately
        await loadPatientData();
        
        setFeedbackModal({
          visible: true,
          type: 'success',
          title: 'Succès',
          message: selectedPrescription 
            ? 'Prescription mise à jour avec succès' 
            : 'Prescription créée avec succès',
          onConfirm: () => {
            setFeedbackModal(prev => ({ ...prev, visible: false }));
          },
        });
      } else {
        throw new Error(result.message || 'Erreur lors de la sauvegarde');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Erreur lors de la sauvegarde de la prescription');
    }
  };

  // Voice message handlers
  const handlePlayVoiceMessage = async (messageId: string, fileUrl: string) => {
    try {
      // If currently playing the same message, pause it
      if (currentPlayingVoice === messageId && voicePlayer.playing) {
        voicePlayer.pause();
        setCurrentPlayingVoice(null);
        return;
      }

      // Set up audio mode for playback
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });

      // Set the current voice URI and play
      setCurrentVoiceUri(fileUrl);
      setCurrentPlayingVoice(messageId);
      
      // Replace the source and play
      voicePlayer.replace({ uri: fileUrl });
      voicePlayer.play();
    } catch (error) {
      console.error('Error playing voice message:', error);
      setFeedbackModal({
        visible: true,
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de lire le message vocal',
        onConfirm: () => setFeedbackModal(prev => ({ ...prev, visible: false })),
      });
    }
  };

  const handleDeleteVoiceMessage = (messageId: string) => {
    setFeedbackModal({
      visible: true,
      type: 'confirm',
      title: 'Supprimer le message',
      message: 'Êtes-vous sûr de vouloir supprimer ce message vocal ?',
      onConfirm: async () => {
        try {
          if (!token) return;
          
          const result = await apiService.deleteVoiceMessage(token, messageId);
          
          if (result.success) {
            setFeedbackModal({
              visible: true,
              type: 'success',
              title: 'Succès',
              message: 'Message vocal supprimé avec succès',
              onConfirm: () => {
                setFeedbackModal(prev => ({ ...prev, visible: false }));
                loadPatientData();
              },
            });
          }
        } catch (error: any) {
          setFeedbackModal({
            visible: true,
            type: 'error',
            title: 'Erreur',
            message: error.message || 'Erreur lors de la suppression',
            onConfirm: () => setFeedbackModal(prev => ({ ...prev, visible: false })),
          });
        }
      },
      onCancel: () => setFeedbackModal(prev => ({ ...prev, visible: false })),
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
    });
  };

  const handleSaveVoiceMessage = async (audioUri: string, duration: number, title?: string) => {
    console.log('💾 Saving voice message - URI:', audioUri, 'Duration:', duration);
    console.log('💾 Title parameter received:', title);
    console.log('💾 Title type:', typeof title);
    console.log('💾 Title length:', title?.length);
    try {
      if (!token || !patientId) {
        throw new Error('Token ou ID patient manquant');
      }

      // Read audio file as base64
      const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Upload the audio file
      const uploadResult = await apiService.uploadVoiceMessage(token, {
        fileBase64: base64Audio,
        fileName: `voice_${Date.now()}.m4a`,
        mimeType: 'audio/m4a',
      });

      if (!uploadResult.success || !uploadResult.data) {
        throw new Error('Échec du téléchargement du fichier audio');
      }

      // Create the voice message
      console.log('📤 Creating voice message with data:', {
        patientId: patientId,
        fileUrl: uploadResult.data.fileUrl,
        fileName: `voice_${Date.now()}.m4a`,
        title: title,
        durationSeconds: duration,
      });
      
      const createResult = await apiService.createVoiceMessage(token, {
        patientId: patientId,
        fileUrl: uploadResult.data.fileUrl,
        fileName: `voice_${Date.now()}.m4a`,
        title: title,
        durationSeconds: duration,
      });

      if (createResult.success) {
        setFeedbackModal({
          visible: true,
          type: 'success',
          title: 'Succès',
          message: 'Message vocal envoyé avec succès',
          onConfirm: () => {
            setFeedbackModal(prev => ({ ...prev, visible: false }));
            loadPatientData();
          },
        });
      } else {
        throw new Error(createResult.message || 'Erreur lors de la création du message');
      }
    } catch (error: any) {
      setFeedbackModal({
        visible: true,
        type: 'error',
        title: 'Erreur',
        message: error.message || 'Erreur lors de l\'envoi du message vocal',
        onConfirm: () => setFeedbackModal(prev => ({ ...prev, visible: false })),
      });
    }
  };

  const renderMedicationCard = useCallback(({ item }: { item: Medication }) => (
    <View style={styles.medicationCard}>
      <LinearGradient
        colors={["rgba(255, 255, 255, 0.1)", "rgba(255, 255, 255, 0.05)"]}
        style={styles.medicationCardGradient}
      >
        <View style={styles.medicationHeader}>
          <View style={styles.medicationIcon}>
            <Ionicons name="medical" size={24} color="#4facfe" />
          </View>
          <View style={styles.medicationInfo}>
            <Text style={styles.medicationName}>
              {item.medication?.name || item.name}
            </Text>
            <Text style={styles.medicationDosage}>
              {item.customDosage || item.medication?.dosage || item.dosage}
            </Text>
          </View>
          <View style={[
            styles.statusBadge,
            { backgroundColor: item.isActive ? '#10B981' : '#EF4444' }
          ]}>
            <Text style={styles.statusText}>
              {item.isActive ? 'Actif' : 'Inactif'}
            </Text>
          </View>
        </View>
        
        <View style={styles.medicationDetails}>
          {/* Schedule Times - Prominently Displayed */}
          {item.schedules && item.schedules.length > 0 && (
            <View style={styles.scheduleHighlight}>
              <View style={styles.scheduleHeader}>
                <Ionicons name="alarm" size={20} color="#4facfe" />
                <Text style={styles.scheduleTitle}>Horaires de prise:</Text>
              </View>
              <View style={styles.scheduleTimes}>
                {item.schedules.map((schedule, index) => (
                  <View key={index} style={styles.scheduleTimeChip}>
                    <Ionicons name="time-outline" size={14} color="white" />
                    <Text style={styles.scheduleTimeText}>{schedule.time}</Text>
                  </View>
                ))}
              </View>
              {/* Days of week if available */}
              {item.schedules[0]?.days && item.schedules[0].days.length > 0 && (
                <View style={styles.scheduleDays}>
                  <Text style={styles.scheduleDaysText}>
                    {item.schedules[0].days.map((day: number) => {
                      const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
                      return dayNames[day - 1];
                    }).join(', ')}
                  </Text>
                </View>
              )}
            </View>
          )}
          
          {item.instructions && (
            <View style={styles.detailRow}>
              <Ionicons name="information-circle" size={16} color="rgba(255, 255, 255, 0.6)" />
              <Text style={styles.detailText}>{item.instructions}</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Ionicons name="repeat" size={16} color="rgba(255, 255, 255, 0.6)" />
            <Text style={styles.detailText}>
              {item.isChronic ? 'Chronique' : 'Temporaire'}
            </Text>
          </View>
        </View>

        <View style={styles.medicationActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditPrescription(item)}
          >
            <Ionicons name="create-outline" size={20} color="#4facfe" />
            <Text style={styles.actionButtonText}>Modifier</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeletePrescription(item)}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Supprimer</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  ), []);

  const renderEmptyMedications = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Ionicons name="medical-outline" size={64} color="rgba(255, 255, 255, 0.3)" />
      <Text style={styles.emptyTitle}>Aucun médicament</Text>
      <Text style={styles.emptySubtitle}>
        Ce patient n'a pas encore de prescription active
      </Text>
    </View>
  ), []);

  if (!patient) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={["#1a1a2e", "#16213e", "#0f3460"]}
          style={styles.background}
        >
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#1a1a2e", "#16213e", "#0f3460"]}
        style={styles.background}
      >
        {/* Header */}
        <LinearGradient
          colors={["#4facfe", "#00f2fe"]}
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
          <Text style={styles.headerTitle}>Profil Patient</Text>
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
          {/* Patient Contact Info */}
          <View style={styles.card}>
            <LinearGradient
              colors={["rgba(255, 255, 255, 0.1)", "rgba(255, 255, 255, 0.05)"]}
              style={styles.cardGradient}
            >
              <View style={styles.patientHeader}>
                <View style={styles.patientAvatar}>
                  <Text style={styles.patientInitials}>
                    {(patient.firstName || 'P').charAt(0)}{(patient.lastName || 'I').charAt(0)}
                  </Text>
                </View>
                <View style={styles.patientInfo}>
                  <Text style={styles.patientName} numberOfLines={1} ellipsizeMode="tail">
                    {patient.firstName || 'Patient'} {patient.lastName || 'Inconnu'}
                  </Text>
                  <Text style={styles.patientSubtitle} numberOfLines={1} ellipsizeMode="tail">
                    {medications.length} médicament(s) actif(s)
                  </Text>
                </View>
              </View>

              <View style={styles.contactInfo}>
                <View style={styles.contactRow}>
                  <View style={styles.contactIcon}>
                    <Ionicons name="mail" size={20} color="#4facfe" />
                  </View>
                  <View style={styles.contactDetails}>
                    <Text style={styles.contactLabel}>Email</Text>
                    <Text style={styles.contactValue} numberOfLines={1} ellipsizeMode="tail">{patient.email}</Text>
                  </View>
                </View>

                <View style={styles.contactRow}>
                  <View style={styles.contactIcon}>
                    <Ionicons name="call" size={20} color="#4facfe" />
                  </View>
                  <View style={styles.contactDetails}>
                    <Text style={styles.contactLabel}>Téléphone</Text>
                    <Text style={styles.contactValue} numberOfLines={1} ellipsizeMode="tail">{patient.phoneNumber}</Text>
                  </View>
                </View>

                {patient.lastVisit && (
                  <View style={styles.contactRow}>
                    <View style={styles.contactIcon}>
                      <Ionicons name="calendar" size={20} color="#4facfe" />
                    </View>
                    <View style={styles.contactDetails}>
                      <Text style={styles.contactLabel}>Dernière visite</Text>
                      <Text style={styles.contactValue}>
                        {formatDate(patient.lastVisit)}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </LinearGradient>
          </View>

          {/* Tab Selector - 3 Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, selectedTab === 'medications' && styles.tabActive]}
              onPress={() => setSelectedTab('medications')}
            >
              <Ionicons 
                name="medical" 
                size={20} 
                color={selectedTab === 'medications' ? '#4facfe' : 'rgba(255, 255, 255, 0.6)'} 
              />
              <Text style={[styles.tabText, selectedTab === 'medications' && styles.tabTextActive]} numberOfLines={1}>
                Méds
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.tab, selectedTab === 'adherence' && styles.tabActive]}
              onPress={() => setSelectedTab('adherence')}
            >
              <Ionicons 
                name="stats-chart" 
                size={20} 
                color={selectedTab === 'adherence' ? '#4facfe' : 'rgba(255, 255, 255, 0.6)'} 
              />
              <Text style={[styles.tabText, selectedTab === 'adherence' && styles.tabTextActive]} numberOfLines={1}>
                Stats
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.tab, selectedTab === 'voices' && styles.tabActive]}
              onPress={() => setSelectedTab('voices')}
            >
              <Ionicons 
                name="mic" 
                size={20} 
                color={selectedTab === 'voices' ? '#4facfe' : 'rgba(255, 255, 255, 0.6)'} 
              />
              <Text style={[styles.tabText, selectedTab === 'voices' && styles.tabTextActive]} numberOfLines={1}>
                Voix
              </Text>
            </TouchableOpacity>
          </View>

          {/* Medications Tab Content */}
          {selectedTab === 'medications' && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Prescriptions Actives</Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={handleAddPrescription}
                >
                  <Ionicons name="add-circle" size={32} color="#4facfe" />
                </TouchableOpacity>
              </View>

              <FlatList
                data={medications}
                renderItem={renderMedicationCard}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={renderEmptyMedications}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            </>
          )}

          {/* Adherence History Tab Content */}
          {selectedTab === 'adherence' && (
            <>
              {adherenceLoading ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Chargement de l'observance...</Text>
                </View>
              ) : adherenceHistory ? (
                <>
                  {/* Overall Statistics */}
                  <View style={styles.adherenceStatsContainer}>
                    <Text style={styles.sectionTitle}>
                      Statistiques Globales ({adherenceHistory.overallStats.period})
                    </Text>
                    
                    {/* Big Adherence Rate Card */}
                    <View style={styles.bigStatCard}>
                      <LinearGradient
                        colors={
                          adherenceHistory.overallStats.adherenceRate >= 80
                            ? ['#10B981', '#059669']
                            : adherenceHistory.overallStats.adherenceRate >= 60
                            ? ['#F59E0B', '#D97706']
                            : ['#EF4444', '#DC2626']
                        }
                        style={styles.bigStatGradient}
                      >
                        <Text style={styles.bigStatNumber}>
                          {adherenceHistory.overallStats.adherenceRate}%
                        </Text>
                        <Text style={styles.bigStatLabel}>Taux d'Observance</Text>
                        <View style={styles.bigStatDetails}>
                          <Text style={styles.bigStatDetailText}>
                            ✓ {adherenceHistory.overallStats.takenReminders} pris
                          </Text>
                          <Text style={styles.bigStatDetailText}>
                            ✗ {adherenceHistory.overallStats.missedReminders} manqués
                          </Text>
                        </View>
                      </LinearGradient>
                    </View>

                    {/* Stats Row */}
                    <View style={styles.statsRow}>
                      <View style={styles.miniStatCard}>
                        <Ionicons name="checkmark-circle" size={28} color="#10B981" />
                        <Text style={styles.miniStatNumber}>
                          {adherenceHistory.overallStats.takenReminders}
                        </Text>
                        <Text style={styles.miniStatLabel}>Pris</Text>
                      </View>
                      
                      <View style={styles.miniStatCard}>
                        <Ionicons name="close-circle" size={28} color="#EF4444" />
                        <Text style={styles.miniStatNumber}>
                          {adherenceHistory.overallStats.missedReminders}
                        </Text>
                        <Text style={styles.miniStatLabel}>Manqués</Text>
                      </View>
                      
                      <View style={styles.miniStatCard}>
                        <Ionicons name="time" size={28} color="#F59E0B" />
                        <Text style={styles.miniStatNumber}>
                          {adherenceHistory.overallStats.pendingReminders}
                        </Text>
                        <Text style={styles.miniStatLabel}>En attente</Text>
                      </View>
                    </View>
                  </View>

                  {/* Medication-Specific Adherence */}
                  {adherenceHistory.medicationAdherence && adherenceHistory.medicationAdherence.length > 0 && (
                    <View style={styles.medicationAdherenceSection}>
                      <Text style={styles.sectionTitle}>Par Médicament</Text>
                      {adherenceHistory.medicationAdherence.map((med: any) => (
                        <View key={med.id} style={styles.medicationAdherenceCard}>
                          <View style={styles.medicationAdherenceHeader}>
                            <Text style={styles.medicationAdherenceName} numberOfLines={1}>
                              {med.name}
                            </Text>
                            <Text style={[
                              styles.medicationAdherenceRate,
                              { color: med.adherenceRate >= 80 ? '#10B981' : med.adherenceRate >= 60 ? '#F59E0B' : '#EF4444' }
                            ]}>
                              {med.adherenceRate}%
                            </Text>
                          </View>
                          
                          {/* Progress Bar */}
                          <View style={styles.progressBarContainer}>
                            <View 
                              style={[
                                styles.progressBarFill,
                                { 
                                  width: `${med.adherenceRate}%`,
                                  backgroundColor: med.adherenceRate >= 80 ? '#10B981' : med.adherenceRate >= 60 ? '#F59E0B' : '#EF4444'
                                }
                              ]} 
                            />
                          </View>
                          
                          <View style={styles.medicationAdherenceStats}>
                            <Text style={styles.medicationAdherenceStatText}>
                              ✓ {med.taken}/{med.total} pris
                            </Text>
                            <Text style={styles.medicationAdherenceStatText}>
                              ✗ {med.missed} manqués
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Weekly Adherence Chart */}
                  {adherenceHistory.weeklyAdherence && adherenceHistory.weeklyAdherence.length > 0 && (
                    <View style={styles.weeklyAdherenceSection}>
                      <Text style={styles.sectionTitle}>4 Dernières Semaines</Text>
                      <View style={styles.weeklyChartContainer}>
                        {adherenceHistory.weeklyAdherence.map((week: any, index: number) => (
                          <View key={index} style={styles.weekBar}>
                            <View style={styles.weekBarContainer}>
                              <View 
                                style={[
                                  styles.weekBarFill,
                                  { 
                                    height: `${Math.max(week.adherenceRate, 5)}%`,
                                    backgroundColor: week.adherenceRate >= 80 ? '#10B981' : week.adherenceRate >= 60 ? '#F59E0B' : '#EF4444'
                                  }
                                ]} 
                              />
                            </View>
                            <Text style={styles.weekBarLabel}>S{week.weekNumber}</Text>
                            <Text style={styles.weekBarRate}>{week.adherenceRate}%</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Recent History */}
                  {adherenceHistory.recentHistory && adherenceHistory.recentHistory.length > 0 && (
                    <View style={styles.recentHistorySection}>
                      <Text style={styles.sectionTitle}>Historique Récent</Text>
                      {adherenceHistory.recentHistory.slice(0, 10).map((item: any) => (
                        <View key={item.id} style={styles.historyItem}>
                          <View style={styles.historyLeft}>
                            <Ionicons 
                              name={
                                item.status === 'confirmed' || item.status === 'manual_confirm' 
                                  ? 'checkmark-circle' 
                                  : item.status === 'missed' 
                                  ? 'close-circle' 
                                  : 'time'
                              }
                              size={24}
                              color={
                                item.status === 'confirmed' || item.status === 'manual_confirm'
                                  ? '#10B981'
                                  : item.status === 'missed'
                                  ? '#EF4444'
                                  : '#F59E0B'
                              }
                            />
                            <View style={styles.historyInfo}>
                              <Text style={styles.historyMedName} numberOfLines={1}>
                                {item.medicationName}
                              </Text>
                              <Text style={styles.historyDate}>
                                {formatTime(item.scheduledFor)}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.historyRight}>
                            <Text style={[
                              styles.historyStatus,
                              {
                                color: item.status === 'confirmed' || item.status === 'manual_confirm'
                                  ? '#10B981'
                                  : item.status === 'missed'
                                  ? '#EF4444'
                                  : item.status === 'scheduled' || item.status === 'sent'
                                  ? '#F59E0B'
                                  : '#999'
                              }
                            ]}>
                              {item.status === 'confirmed' || item.status === 'manual_confirm'
                                ? 'Pris'
                                : item.status === 'missed'
                                ? 'Manqué'
                                : item.status === 'scheduled' || item.status === 'sent'
                                ? 'En attente'
                                : 'Non défini'}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="stats-chart-outline" size={64} color="rgba(255, 255, 255, 0.3)" />
                  <Text style={styles.emptyTitle}>Aucune donnée d'observance</Text>
                  <Text style={styles.emptySubtitle}>
                    Les statistiques apparaîtront une fois que le patient commencera son traitement
                  </Text>
                </View>
              )}
            </>
          )}

          {/* Voices Tab Content */}
          {selectedTab === 'voices' && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Messages Vocaux</Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => setShowVoiceRecorder(true)}
                >
                  <Ionicons name="mic-circle" size={32} color="#4facfe" />
                </TouchableOpacity>
              </View>

              {voiceMessages.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="mic-outline" size={64} color="rgba(255, 255, 255, 0.3)" />
                  <Text style={styles.emptyTitle}>Aucun message vocal</Text>
                  <Text style={styles.emptySubtitle}>
                    Enregistrez un message vocal pour ce patient
                  </Text>
                </View>
              ) : (
                voiceMessages.map((message) => {
                  console.log('🎤 Rendering voice message:', message.id, 'Duration:', message.durationSeconds);
                  return (
                  <View key={message.id} style={styles.voiceMessageCard}>
                    <LinearGradient
                      colors={["rgba(255, 255, 255, 0.1)", "rgba(255, 255, 255, 0.05)"]}
                      style={styles.voiceMessageGradient}
                    >
                      <View style={styles.voiceMessageHeader}>
                        <View style={styles.voiceMessageIcon}>
                          <Ionicons name="musical-notes" size={24} color="#4facfe" />
                        </View>
                        <View style={styles.voiceMessageInfo}>
                          {message.title && (
                            <Text style={styles.voiceMessageTitle}>
                              {message.title}
                            </Text>
                          )}
                          <Text style={styles.voiceMessageDate}>
                            {formatDateTime(message.createdAt)}
                          </Text>
                          <Text style={styles.voiceMessageDuration}>
                            Durée: {message.durationSeconds 
                              ? `${Math.floor(message.durationSeconds / 60)}:${(message.durationSeconds % 60).toString().padStart(2, '0')}`
                              : '0:00'
                            }
                          </Text>
                        </View>
                      </View>

                      <View style={styles.voiceMessageActions}>
                        <TouchableOpacity
                          style={styles.voiceActionButton}
                          onPress={() => handlePlayVoiceMessage(message.id, message.fileUrl)}
                        >
                          <Ionicons
                            name={currentPlayingVoice === message.id ? 'pause-circle' : 'play-circle'}
                            size={40}
                            color="#4facfe"
                          />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.voiceActionButton, styles.deleteVoiceButton]}
                          onPress={() => handleDeleteVoiceMessage(message.id)}
                        >
                          <Ionicons name="trash-outline" size={24} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </LinearGradient>
                  </View>
                  );
                })
              )}
            </>
          )}
        </ScrollView>

        {/* Add/Edit Prescription Modal */}
        <AddPrescriptionModal
          visible={showPrescriptionModal}
          onClose={() => {
            setShowPrescriptionModal(false);
            setSelectedPrescription(null);
          }}
          onSave={handleSavePrescription}
          existingPrescription={selectedPrescription}
          patientName={patient ? `${patient.firstName || 'Patient'} ${patient.lastName || 'Inconnu'}` : 'Patient'}
          patientId={patientId || ''}
          token={token || ''}
          voiceMessages={voiceMessages}
          onVoiceMessagesUpdate={(voices) => setVoiceMessages(voices)}
        />

        {/* Delete Confirmation Modal */}
        <FeedbackModal
          visible={deleteConfirmModal.visible}
          type="confirm"
          title="Supprimer la prescription"
          message={`Êtes-vous sûr de vouloir supprimer cette prescription ?`}
          onConfirm={confirmDeletePrescription}
          onCancel={() => setDeleteConfirmModal({ visible: false, medication: null })}
          confirmText="Supprimer"
          cancelText="Annuler"
        />

        {/* Success/Error Feedback Modal */}
        <FeedbackModal
          visible={feedbackModal.visible}
          type={feedbackModal.type}
          title={feedbackModal.title}
          message={feedbackModal.message}
          onConfirm={feedbackModal.onConfirm}
          onCancel={feedbackModal.onCancel}
          confirmText={feedbackModal.confirmText}
          cancelText={feedbackModal.cancelText}
        />

        {/* Voice Recorder Modal */}
        <VoiceRecorderModal
          visible={showVoiceRecorder}
          onClose={() => setShowVoiceRecorder(false)}
          onSave={handleSaveVoiceMessage}
        />
      </LinearGradient>
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  card: {
    marginVertical: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 20,
  },
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  patientAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4facfe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  patientInitials: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  patientSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  contactInfo: {
    gap: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(79, 172, 254, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contactDetails: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
  sectionHeader: {
    marginTop: 20,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  addButton: {
    padding: 4,
  },
  medicationCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  medicationCardGradient: {
    padding: 16,
  },
  medicationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  medicationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(79, 172, 254, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 2,
  },
  medicationDosage: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  medicationDetails: {
    gap: 8,
  },
  
  // Schedule Highlight Styles
  scheduleHighlight: {
    backgroundColor: 'rgba(79, 172, 254, 0.15)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(79, 172, 254, 0.3)',
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  scheduleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4facfe',
  },
  scheduleTimes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  scheduleTimeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4facfe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  scheduleTimeText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },
  scheduleDays: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(79, 172, 254, 0.2)',
  },
  scheduleDaysText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic',
  },
  
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 12,
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
  medicationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(79, 172, 254, 0.2)',
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4facfe',
  },
  deleteButtonText: {
    color: '#EF4444',
  },
  voiceMessageCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  voiceMessageGradient: {
    padding: 16,
  },
  voiceMessageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  voiceMessageIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(79, 172, 254, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  voiceMessageInfo: {
    flex: 1,
  },
  voiceMessageTitle: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
    marginBottom: 6,
  },
  voiceMessageDate: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  voiceMessageDuration: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  voiceMessageActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  voiceActionButton: {
    padding: 8,
  },
  deleteVoiceButton: {
    padding: 8,
  },
  
  // Tab Styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 20,
    marginVertical: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 6,
  },
  tabActive: {
    backgroundColor: 'rgba(79, 172, 254, 0.2)',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  tabTextActive: {
    color: '#4facfe',
  },
  
  // Adherence Styles
  adherenceStatsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  bigStatCard: {
    marginVertical: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  bigStatGradient: {
    padding: 24,
    alignItems: 'center',
  },
  bigStatNumber: {
    fontSize: 56,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  bigStatLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 16,
  },
  bigStatDetails: {
    flexDirection: 'row',
    gap: 24,
  },
  bigStatDetailText: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  miniStatCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  miniStatNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 8,
  },
  miniStatLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  
  // Medication Adherence Styles
  medicationAdherenceSection: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  medicationAdherenceCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  medicationAdherenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  medicationAdherenceName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    flex: 1,
    marginRight: 12,
  },
  medicationAdherenceRate: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  medicationAdherenceStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  medicationAdherenceStatText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  
  // Weekly Adherence Styles
  weeklyAdherenceSection: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  weeklyChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  weekBar: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  weekBarContainer: {
    width: '80%',
    height: 150,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  weekBarFill: {
    width: '100%',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    minHeight: 10,
  },
  weekBarLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  weekBarRate: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  
  // Recent History Styles
  recentHistorySection: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 40,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  historyInfo: {
    flex: 1,
  },
  historyMedName: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  historyRight: {
    marginLeft: 12,
  },
  historyStatus: {
    fontSize: 13,
    fontWeight: '600',
  },
  
  // Loading Container
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
});
