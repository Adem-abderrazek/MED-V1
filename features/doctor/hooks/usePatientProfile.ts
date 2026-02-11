import { useState, useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { useAuthToken } from '../../../shared/hooks/useAuthToken';
import { fixUrl } from '../../../config/api';
import {
  getPatientDetails,
  getDoctorPatientMedications,
  getPatientVoiceMessages,
  getPatientAdherenceHistory,
  createPrescription,
  updatePrescription,
  deletePrescription,
  uploadVoiceMessage,
  createVoiceMessage,
  deleteVoiceMessage,
} from '../../../shared/services/api/caregiver';

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  lastVisit?: Date | string;
  medicationCount?: number;
}

export interface Medication {
  id: string;
  name: string;
  dosage?: string;
  frequency?: string;
  startDate?: Date | string;
  endDate?: Date | string;
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
  scheduleType?: 'daily' | 'weekly' | 'interval' | 'monthly' | 'custom';
  intervalHours?: number;
}

export interface VoiceMessage {
  id: string;
  fileName: string;
  fileUrl: string;
  title?: string;
  durationSeconds: number;
  isActive: boolean;
  createdAt: string;
}

export interface FeedbackModalState {
  visible: boolean;
  type: 'success' | 'error' | 'confirm';
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

export function usePatientProfile(patientId: string | undefined) {
  const { token } = useAuthToken();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<Medication | null>(null);
  const [userType, setUserType] = useState<'medecin' | 'tuteur' | null>(null);

  // Feedback modals
  const [feedbackModal, setFeedbackModal] = useState<FeedbackModalState>({
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
  const [voiceMessages, setVoiceMessages] = useState<VoiceMessage[]>([]);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [currentPlayingVoice, setCurrentPlayingVoice] = useState<string | null>(null);
  const [currentVoiceUri, setCurrentVoiceUri] = useState<string | null>(null);
  const playingStateRef = useRef<{ messageId: string | null; playStartTime: number }>({ messageId: null, playStartTime: 0 });

  // Adherence history state
  const [adherenceHistory, setAdherenceHistory] = useState<any>(null);
  const [adherenceLoading, setAdherenceLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'medications' | 'adherence' | 'voices'>('medications');

  // Initialize audio player for voice messages - keep it initialized with null, use replace() to load audio
  const voicePlayer = useAudioPlayer(null);

  // Load user type
  useEffect(() => {
    const loadUserType = async () => {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        setUserType(user.userType);
      }
    };
    loadUserType();
  }, []);

  // Load adherence history
  const loadAdherenceHistory = useCallback(async () => {
    if (!token || !patientId) return;

    try {
      setAdherenceLoading(true);
      console.log('📊 Loading adherence history...');

      const result = await getPatientAdherenceHistory(token, patientId, 30);
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

  // Load patient data
  const loadPatientData = useCallback(async () => {
    if (!token || !patientId) return;

    try {
      setIsLoading(true);

      const normalizeMedications = (items: any[]) => (items || []).map((item: any) => {
        const voiceMessage = item?.voiceMessage
          ? { ...item.voiceMessage, fileUrl: fixUrl(item.voiceMessage.fileUrl) }
          : item?.voiceMessage;
        const voiceMessageId = item?.voiceMessageId || voiceMessage?.id || null;
        return { ...item, voiceMessage, voiceMessageId };
      });

      // Load patient details
      const patientResult = await getPatientDetails(token, patientId, userType || undefined);
      console.log('📋 Patient details result:', patientResult);
      if (patientResult.success && patientResult.data) {
        // The tutor endpoint returns { patient, prescriptions, reminders }
        const data = patientResult.data as any;
        if (data.patient) {
          setPatient(data.patient);
          // Also use prescriptions from this response
          if (data.prescriptions) {
            setMedications(normalizeMedications(data.prescriptions));
          }
        } else {
          // Fallback if data is already the patient object
          setPatient(data);
        }
      }

      // Load patient medications (if not already loaded from patient details)
      const data = patientResult.data as any;
      if (!data?.prescriptions) {
        const medicationsResult = await getDoctorPatientMedications(token, patientId);
        if (medicationsResult.success && Array.isArray(medicationsResult.data)) {
          setMedications(normalizeMedications(medicationsResult.data));
        } else {
          setMedications([]);
        }
      }

      // Load voice messages
      const voiceResult = await getPatientVoiceMessages(token, patientId);
      if (voiceResult.success) {
        console.log('🎤 Voice messages loaded:', voiceResult.data);
        const voiceData = voiceResult.data as any[];
        // Fix URLs that might have old IP addresses
        const fixedVoiceData = (voiceData || []).map((msg: any) => ({
          ...msg,
          fileUrl: fixUrl(msg.fileUrl),
        }));
        setVoiceMessages(fixedVoiceData);
      }

      // Load adherence history
      await loadAdherenceHistory();
    } catch (error) {
      console.error('Error loading patient data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [token, patientId, userType, loadAdherenceHistory]);

  useEffect(() => {
    if (token && patientId) {
      loadPatientData();
    }
  }, [token, patientId, loadPatientData]);

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

  const handleAddPrescription = useCallback(() => {
    setSelectedPrescription(null);
    setShowPrescriptionModal(true);
  }, []);

  const handleEditPrescription = useCallback((medication: Medication) => {
    setSelectedPrescription(medication);
    setShowPrescriptionModal(true);
  }, []);

  const handleDeletePrescription = useCallback((medication: Medication) => {
    setDeleteConfirmModal({
      visible: true,
      medication: medication,
    });
  }, []);

  const confirmDeletePrescription = useCallback(async () => {
    if (!deleteConfirmModal.medication || !token) return;

    try {
      const result = await deletePrescription(token, deleteConfirmModal.medication.id);

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
  }, [deleteConfirmModal, token, loadPatientData]);

  const handleSavePrescription = useCallback(async (prescriptionData: any) => {
    if (!token || !patientId) {
      throw new Error('Token ou ID patient manquant');
    }

    let result;
    if (selectedPrescription) {
      // Update existing prescription
      result = await updatePrescription(token, selectedPrescription.id, prescriptionData);
    } else {
      // Create new prescription
      result = await createPrescription(token, patientId, prescriptionData);
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
  }, [token, patientId, selectedPrescription, loadPatientData]);

  // Voice message handlers
  const handlePlayVoiceMessage = useCallback(async (messageId: string, fileUrl: string) => {
    const startTime = Date.now();
    // Fix URL in case it has an old IP address
    const fixedFileUrl = fixUrl(fileUrl);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ef6884b6-78e4-4a25-87fa-c5f8fa77e982',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePatientProfile.ts:318',message:'Play voice message clicked',data:{messageId,fileUrl:fixedFileUrl,currentPlayingVoice,isCurrentlyPlaying:voicePlayer.playing},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    try {
      // If currently playing the same message, pause it
      if (currentPlayingVoice === messageId && voicePlayer.playing) {
        const pauseStart = Date.now();
        voicePlayer.pause();
        setCurrentPlayingVoice(null);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ef6884b6-78e4-4a25-87fa-c5f8fa77e982',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePatientProfile.ts:325',message:'Paused existing playback',data:{pauseTime:Date.now()-pauseStart},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        return;
      }

      const audioModeStart = Date.now();
      // Set up audio mode for playback
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
      const audioModeTime = Date.now() - audioModeStart;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ef6884b6-78e4-4a25-87fa-c5f8fa77e982',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePatientProfile.ts:332',message:'Audio mode set',data:{audioModeTime},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      const replaceStart = Date.now();
      // Replace the source first (this loads the audio)
      voicePlayer.replace({ uri: fixedFileUrl });
      const replaceTime = Date.now() - replaceStart;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ef6884b6-78e4-4a25-87fa-c5f8fa77e982',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePatientProfile.ts:341',message:'Player replace called',data:{replaceTime},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion

      const playStart = Date.now();
      // Play immediately after replace
      await voicePlayer.play();
      const playCallTime = Date.now() - playStart;
      
      // Update state after play starts (for UI tracking)
      const stateUpdateStart = Date.now();
      setCurrentVoiceUri(fixedFileUrl);
      setCurrentPlayingVoice(messageId);
      const stateUpdateTime = Date.now() - stateUpdateStart;
      const totalTime = Date.now() - startTime;
      playingStateRef.current = { messageId, playStartTime: playStart };
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ef6884b6-78e4-4a25-87fa-c5f8fa77e982',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePatientProfile.ts:344',message:'Play called and state updated',data:{playCallTime,totalTime,audioModeTime,stateUpdateTime,replaceTime},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion

      // Check if playback actually started after a delay (using ref to avoid stale closure)
      setTimeout(() => {
        const timeSincePlay = Date.now() - playingStateRef.current.playStartTime;
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ef6884b6-78e4-4a25-87fa-c5f8fa77e982',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePatientProfile.ts:350',message:'Playback status check',data:{currentPlayingVoice:playingStateRef.current.messageId,timeSincePlay},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
      }, 500);
    } catch (error) {
      const errorTime = Date.now() - startTime;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ef6884b6-78e4-4a25-87fa-c5f8fa77e982',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePatientProfile.ts:355',message:'Playback error',data:{error:error instanceof Error ? error.message : String(error),errorTime},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      console.error('Error playing voice message:', error);
      setFeedbackModal({
        visible: true,
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de lire le message vocal',
        onConfirm: () => setFeedbackModal(prev => ({ ...prev, visible: false })),
      });
    }
  }, [currentPlayingVoice, voicePlayer]);

  const handleDeleteVoiceMessage = useCallback((messageId: string) => {
    setFeedbackModal({
      visible: true,
      type: 'confirm',
      title: 'Supprimer le message',
      message: 'Êtes-vous sûr de vouloir supprimer ce message vocal ?',
      onConfirm: async () => {
        try {
          if (!token) return;

          const result = await deleteVoiceMessage(token, messageId);

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
  }, [token, loadPatientData]);

  const handleSaveVoiceMessage = useCallback(async (audioUri: string, duration: number, title: string) => {
    console.log('💾 Saving voice message - URI:', audioUri, 'Duration:', duration);
    try {
      if (!token || !patientId) {
        throw new Error('Token ou ID patient manquant');
      }

      // Read audio file as base64
      const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Upload the audio file
      const uploadResult = await uploadVoiceMessage(token, {
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

      const createResult = await createVoiceMessage(token, {
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
  }, [token, patientId, loadPatientData]);

  return {
    // State
    patient,
    medications,
    isLoading,
    isRefreshing,
    showPrescriptionModal,
    selectedPrescription,
    feedbackModal,
    deleteConfirmModal,
    voiceMessages,
    showVoiceRecorder,
    currentPlayingVoice,
    adherenceHistory,
    adherenceLoading,
    selectedTab,
    userType,

    // Actions
    setShowPrescriptionModal,
    setSelectedPrescription,
    setFeedbackModal,
    setDeleteConfirmModal,
    setShowVoiceRecorder,
    setSelectedTab,
    onRefresh,
    handleAddPrescription,
    handleEditPrescription,
    handleDeletePrescription,
    confirmDeletePrescription,
    handleSavePrescription,
    handlePlayVoiceMessage,
    handleDeleteVoiceMessage,
    handleSaveVoiceMessage,
    loadPatientData,
  };
}

