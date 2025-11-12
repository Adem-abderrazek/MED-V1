import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Audio } from 'expo-av';
import FeedbackModal from './FeedbackModal';
import VoiceRecorderModal from './VoiceRecorderModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import apiService from '../services/api';

interface PrescriptionSchedule {
  time: string;
  days: number[];
}

interface Medication {
  id: string;
  name: string;
  dosage?: string;
  form?: string;
  genericName?: string;
  description?: string;
}

interface PrescriptionData {
  id?: string;
  medication?: Medication;
  customDosage?: string;
  instructions?: string;
  schedules?: PrescriptionSchedule[];
  isChronic?: boolean;
  scheduleType?: 'daily' | 'weekly' | 'interval' | 'monthly' | 'custom';
  intervalHours?: number;
  repeatWeeks?: number;
}

interface VoiceMessage {
  id: string;
  fileName: string;
  fileUrl: string;
  title?: string;
  durationSeconds: number;
  isActive: boolean;
  createdAt: string;
}

interface AddPrescriptionModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (prescriptionData: any) => Promise<void>;
  existingPrescription?: PrescriptionData | null;
  patientName: string;
  patientId: string;
  token: string;
  voiceMessages?: VoiceMessage[];
  onVoiceMessagesUpdate?: (voices: VoiceMessage[]) => void;
}

const MEDICATIONS = [
  { id: '1', name: 'Paracétamol', genericName: 'Acétaminophène', dosage: '500mg', form: 'Comprimé', description: 'Douleur, fièvre' },
  { id: '2', name: 'Amoxicilline', genericName: 'Amoxicilline', dosage: '500mg', form: 'Gélule', description: 'Infections bactériennes' },
  { id: '3', name: 'Ibuprofène', genericName: 'Ibuprofène', dosage: '400mg', form: 'Comprimé', description: 'Anti-inflammatoire' },
  { id: '4', name: 'Oméprazole', genericName: 'Oméprazole', dosage: '20mg', form: 'Gélule gastro-résistante', description: 'Ulcères gastriques' },
  { id: '5', name: 'Metformine', genericName: 'Metformine HCl', dosage: '850mg', form: 'Comprimé pelliculé', description: 'Diabète type 2' },
  { id: '6', name: 'Atorvastatine', genericName: 'Atorvastatine', dosage: '20mg', form: 'Comprimé', description: 'Cholestérol' },
];

const WEEK_DAYS = [
  { short: 'L', full: 'Lundi' },
  { short: 'M', full: 'Mardi' },
  { short: 'M', full: 'Mercredi' },
  { short: 'J', full: 'Jeudi' },
  { short: 'V', full: 'Vendredi' },
  { short: 'S', full: 'Samedi' },
  { short: 'D', full: 'Dimanche' },
];

export default function AddPrescriptionModal({
  visible,
  onClose,
  onSave,
  existingPrescription,
  patientName,
  patientId,
  token,
  voiceMessages = [],
  onVoiceMessagesUpdate
}: AddPrescriptionModalProps) {
  const [medicationName, setMedicationName] = useState('');
  const [selectedMedication, setSelectedMedication] = useState<typeof MEDICATIONS[0] | null>(null);
  const [customDosage, setCustomDosage] = useState('');
  const [instructions, setInstructions] = useState('');
  const [schedules, setSchedules] = useState<PrescriptionSchedule[]>([
    { time: '08:00', days: [1, 2, 3, 4, 5, 6, 7] }
  ]);
  const [isChronic, setIsChronic] = useState(true);
  const [repeatWeeks, setRepeatWeeks] = useState('1');
  const [showMedicationPicker, setShowMedicationPicker] = useState(false);
  const [showCustomMedForm, setShowCustomMedForm] = useState(false);
  const [medSearch, setMedSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedVoiceMessageId, setSelectedVoiceMessageId] = useState<string | null>(null);
  const [customMedData, setCustomMedData] = useState({
    name: '',
    genericName: '',
    dosage: '',
    form: 'Comprimé',
    description: '',
  });
  const [errorModal, setErrorModal] = useState({
    visible: false,
    message: '',
  });
  
  // Time picker state
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [editingScheduleIndex, setEditingScheduleIndex] = useState<number | null>(null);
  const [tempTime, setTempTime] = useState(new Date());
  
  // Voice playback state
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [currentSound, setCurrentSound] = useState<Audio.Sound | null>(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [isUploadingVoice, setIsUploadingVoice] = useState(false);

  useEffect(() => {
    if (visible) {
      console.log('📝 Prescription modal opened');
      console.log('🎤 Voice messages received:', voiceMessages.length);
      if (voiceMessages.length > 0) {
        console.log('🔍 First voice:', voiceMessages[0]);
        console.log('🔍 Voice title:', voiceMessages[0]?.title);
        console.log('🔍 Voice fileName:', voiceMessages[0]?.fileName);
      }
    }
    
    if (existingPrescription && visible) {
      const medName = existingPrescription.medication?.name || '';
      setMedicationName(medName);
      
      const matchingMed = MEDICATIONS.find(m => 
        m.name.toLowerCase() === medName.toLowerCase()
      );
      setSelectedMedication(matchingMed || null);
      
      setCustomDosage(existingPrescription.customDosage || '');
      setInstructions(existingPrescription.instructions || '');
      if (existingPrescription.schedules && existingPrescription.schedules.length > 0) {
        // Ensure all schedules have a valid days array
        const sanitizedSchedules = existingPrescription.schedules.map(schedule => ({
          ...schedule,
          days: schedule.days || [1, 2, 3, 4, 5, 6, 7]
        }));
        setSchedules(sanitizedSchedules);
      }
      setIsChronic(existingPrescription.isChronic ?? true);
      setRepeatWeeks(String(existingPrescription.repeatWeeks || 1));
      
      // ✅ FIX: Load voice message ID from existing prescription
      const voiceMessageId = (existingPrescription as any).voiceMessageId;
      if (voiceMessageId) {
        console.log('🎤 Loading existing voice message ID:', voiceMessageId);
        setSelectedVoiceMessageId(voiceMessageId);
      } else {
        setSelectedVoiceMessageId(null);
      }
    } else if (!existingPrescription && visible) {
      setMedicationName('');
      setSelectedMedication(null);
      setCustomDosage('');
      setInstructions('');
      setSchedules([{ time: '08:00', days: [1, 2, 3, 4, 5, 6, 7] }]);
      setIsChronic(true);
      setRepeatWeeks('1');
      setSelectedVoiceMessageId(null);
    }
  }, [existingPrescription, visible]);

  const addSchedule = () => {
    setSchedules([...schedules, { time: '12:00', days: [1, 2, 3, 4, 5, 6, 7] }]);
  };

  const updateScheduleTime = (index: number, time: string) => {
    const newSchedules = [...schedules];
    newSchedules[index].time = time;
    setSchedules(newSchedules);
  };

  const openTimePicker = (index: number) => {
    const schedule = schedules[index];
    // Parse existing time or use current time
    const [hours, minutes] = schedule.time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours || 8);
    date.setMinutes(minutes || 0);
    setTempTime(date);
    setEditingScheduleIndex(index);
    setShowTimePicker(true);
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    
    if (selectedDate && editingScheduleIndex !== null) {
      const nativeEvent = (event as any)?.nativeEvent;
      let selectedHours: number | undefined = typeof nativeEvent?.hour === 'number'
        ? nativeEvent.hour
        : undefined;
      let selectedMinutes: number | undefined = typeof nativeEvent?.minute === 'number'
        ? nativeEvent.minute
        : undefined;

      if (selectedHours === undefined) {
        selectedHours = selectedDate.getHours();
        const utcHours = selectedDate.getUTCHours();
        const offsetHours = selectedDate.getTimezoneOffset() / 60;

        if (offsetHours > 0 && Math.abs(utcHours - selectedHours) === Math.abs(offsetHours)) {
          selectedHours = (utcHours + 24) % 24;
        }
      }

      if (selectedMinutes === undefined) {
        selectedMinutes = selectedDate.getMinutes();
      }

      console.log(
        '🕒 Time picker change (Android)',
        {
          iso: selectedDate.toISOString(),
          localHours: selectedDate.getHours(),
          utcHours: selectedDate.getUTCHours(),
          timezoneOffset: selectedDate.getTimezoneOffset(),
          derivedHours: selectedHours,
          derivedMinutes: selectedMinutes,
        }
      );

      const hours = selectedHours.toString().padStart(2, '0');
      const minutes = selectedMinutes.toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      updateScheduleTime(editingScheduleIndex, timeString);
      
      if (Platform.OS === 'ios') {
        setTempTime(selectedDate);
      }
    }
  };

  const closeTimePicker = () => {
    setShowTimePicker(false);
    setEditingScheduleIndex(null);
  };

  const confirmTimePicker = () => {
    // For iOS, ensure the time is updated from tempTime when user confirms
    if (Platform.OS === 'ios' && editingScheduleIndex !== null && tempTime) {
      let hoursValue = tempTime.getHours();
      const utcHours = tempTime.getUTCHours();
      const offsetHours = tempTime.getTimezoneOffset() / 60;

      if (offsetHours > 0 && Math.abs(utcHours - hoursValue) === Math.abs(offsetHours)) {
        hoursValue = (utcHours + 24) % 24;
      }

      const minutesValue = tempTime.getMinutes();

      console.log(
        '🕒 Time picker confirm (iOS)',
        {
          iso: tempTime.toISOString(),
          localHours: tempTime.getHours(),
          utcHours,
          timezoneOffset: tempTime.getTimezoneOffset(),
          derivedHours: hoursValue,
          derivedMinutes: minutesValue,
        }
      );

      const hours = hoursValue.toString().padStart(2, '0');
      const minutes = minutesValue.toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      updateScheduleTime(editingScheduleIndex, timeString);
    }
    closeTimePicker();
  };

  // Voice playback functions
  const togglePlayVoice = async (voice: VoiceMessage) => {
    try {
      if (playingVoiceId === voice.id) {
        // Stop current
        await currentSound?.pauseAsync();
        setPlayingVoiceId(null);
      } else {
        // Stop any currently playing sound
        if (currentSound) {
          await currentSound.unloadAsync();
        }
        
        // Play new voice
        const { sound } = await Audio.Sound.createAsync(
          { uri: voice.fileUrl },
          { shouldPlay: true }
        );
        setCurrentSound(sound);
        setPlayingVoiceId(voice.id);
        
        // Auto-stop when finished
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            setPlayingVoiceId(null);
          }
        });
      }
    } catch (error) {
      console.error('Error playing voice:', error);
    }
  };

  // Handle voice recorder save
  const handleSaveVoiceMessage = async (audioUri: string, duration: number, title?: string) => {
    try {
      setIsUploadingVoice(true);
      
      if (!token) {
        throw new Error('Token manquant');
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
      const createResult = await apiService.createVoiceMessage(token, {
        patientId: patientId,
        fileUrl: uploadResult.data.fileUrl,
        fileName: `voice_${Date.now()}.m4a`,
        title: title,
        durationSeconds: duration,
      });

      if (createResult.success && createResult.data) {
        // Reload voice messages
        const voiceResult = await apiService.getPatientVoiceMessages(token, patientId);
        if (voiceResult.success && voiceResult.data && onVoiceMessagesUpdate) {
          onVoiceMessagesUpdate(voiceResult.data);
          
          // Auto-select the new voice
          setSelectedVoiceMessageId(createResult.data.id);
        }
        
        setShowVoiceRecorder(false);
      }
    } catch (error) {
      console.error('Error saving voice message:', error);
      setErrorModal({
        visible: true,
        message: 'Erreur lors de l\'enregistrement du message vocal',
      });
    } finally {
      setIsUploadingVoice(false);
    }
  };

  // Clean up sound on unmount
  useEffect(() => {
    return () => {
      if (currentSound) {
        currentSound.unloadAsync();
      }
    };
  }, [currentSound]);

  const toggleDay = (scheduleIndex: number, dayIndex: number) => {
    const newSchedules = [...schedules];
    const currentDays = newSchedules[scheduleIndex].days || [];
    const dayNum = dayIndex + 1;
    
    if (currentDays.includes(dayNum)) {
      newSchedules[scheduleIndex].days = currentDays.filter(d => d !== dayNum);
    } else {
      newSchedules[scheduleIndex].days = [...currentDays, dayNum].sort();
    }
    
    setSchedules(newSchedules);
  };

  const removeSchedule = (index: number) => {
    if (schedules.length > 1) {
      const newSchedules = schedules.filter((_, i) => i !== index);
      setSchedules(newSchedules);
    }
  };

  const handleSelectMedication = (med: typeof MEDICATIONS[0]) => {
    setSelectedMedication(med);
    setMedicationName(med.name);
    setCustomDosage(med.dosage || '');
    setShowMedicationPicker(false);
    setShowCustomMedForm(false);
  };

  const handleAddCustomMedication = () => {
    setShowMedicationPicker(false);
    setShowCustomMedForm(true);
    setSelectedMedication(null);
    setCustomMedData({
      name: medicationName || medSearch || '',
      genericName: '',
      dosage: '',
      form: 'Comprimé',
      description: '',
    });
  };

  const handleSaveCustomMedication = () => {
    if (!customMedData.name.trim()) {
      setErrorModal({
        visible: true,
        message: 'Le nom du médicament est requis',
      });
      return;
    }

    const customMed = {
      id: 'custom-' + Date.now(),
      name: customMedData.name,
      genericName: customMedData.genericName || customMedData.name,
      dosage: customMedData.dosage,
      form: customMedData.form,
      description: customMedData.description,
    };

    setSelectedMedication(customMed);
    setMedicationName(customMed.name);
    setCustomDosage(customMed.dosage || '');
    setShowCustomMedForm(false);
  };

  const handleSave = async () => {
    if (!medicationName.trim()) {
      setErrorModal({
        visible: true,
        message: 'Veuillez sélectionner ou saisir un nom de médicament',
      });
      return;
    }

    if (schedules.length === 0) {
      setErrorModal({
        visible: true,
        message: 'Veuillez définir au moins un horaire',
      });
      return;
    }

    for (const schedule of schedules) {
      if (!schedule.days || schedule.days.length === 0) {
        setErrorModal({
          visible: true,
          message: 'Veuillez sélectionner au moins un jour pour chaque horaire',
        });
        return;
      }
    }

    setIsSaving(true);

    try {
      const prescriptionData = {
        medicationName,
        medicationGenericName: selectedMedication?.genericName,
        medicationDosage: selectedMedication?.dosage,
        medicationForm: selectedMedication?.form,
        medicationDescription: selectedMedication?.description,
        customDosage: customDosage || undefined,
        instructions: instructions || undefined,
        schedules,
        voiceMessageId: selectedVoiceMessageId || undefined,
        isChronic,
        endDate: !isChronic ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : undefined,
        scheduleType: 'weekly' as const,
        repeatWeeks: parseInt(repeatWeeks) || 1,
      };

      await onSave(prescriptionData);
      onClose();
    } catch (error: any) {
      setErrorModal({
        visible: true,
        message: error.message || 'Erreur lors de la sauvegarde de la prescription',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredMedications = MEDICATIONS.filter(m =>
    !medSearch.trim() || m.name.toLowerCase().includes(medSearch.toLowerCase())
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={["#1a1a2e", "#16213e", "#0f3460"]}
            style={styles.modalContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>
                {existingPrescription ? 'Modifier' : 'Nouvelle'} Prescription
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              {/* 1. PATIENT NAME */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>PATIENT</Text>
                <View style={styles.patientCard}>
                  <View style={styles.patientAvatar}>
                    <Ionicons name="person" size={24} color="#4facfe" />
                  </View>
                  <View style={styles.patientInfo}>
                    <Text style={styles.patientName}>{patientName}</Text>
                    <Text style={styles.patientSubtitle}>Nouvelle prescription</Text>
                  </View>
                </View>
              </View>

              {/* 2. MÉDICAMENT */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>MÉDICAMENT</Text>
                
                {/* Sélectionner un médicament button */}
                <TouchableOpacity
                  style={styles.selectMedicationButton}
                  onPress={() => setShowMedicationPicker(true)}
                >
                  <LinearGradient
                    colors={["#4facfe", "#00f2fe"]}
                    style={styles.selectButtonGradient}
                  >
                    <Ionicons name="search" size={20} color="white" />
                    <Text style={styles.selectButtonText}>Sélectionner un médicament</Text>
                  </LinearGradient>
                </TouchableOpacity>

                {selectedMedication && (
                  <View style={styles.selectedMedCard}>
                    <View style={styles.selectedMedHeader}>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                      <Text style={styles.selectedMedTitle}>{selectedMedication.name}</Text>
                    </View>
                    <Text style={styles.selectedMedDetails}>
                      {selectedMedication.genericName} • {selectedMedication.form}
                    </Text>
                    {selectedMedication.description && (
                      <Text style={styles.selectedMedDescription}>
                        {selectedMedication.description}
                      </Text>
                    )}
                  </View>
                )}

                {/* Manual medication name input */}
                <Text style={styles.inputLabel}>Nom du médicament</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Aspirine"
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={medicationName}
                  onChangeText={(text) => {
                    setMedicationName(text);
                    if (selectedMedication && text !== selectedMedication.name) {
                      setSelectedMedication(null);
                    }
                  }}
                />
              </View>

              {/* 3. DOSAGE */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>DOSAGE</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: 500mg, 2 comprimés"
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={customDosage}
                  onChangeText={setCustomDosage}
                />
                <Text style={styles.helperText}>
                  Le dosage par prise (optionnel si déjà défini dans le médicament)
                </Text>
              </View>

              {/* 4. PLANIFICATION */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>PLANIFICATION</Text>
                
                {schedules.map((schedule, index) => (
                  <View key={index} style={styles.scheduleCard}>
                    <View style={styles.scheduleHeader}>
                      <Text style={styles.scheduleTitle}>Horaire {index + 1}</Text>
                      {schedules.length > 1 && (
                        <TouchableOpacity
                          style={styles.removeScheduleButton}
                          onPress={() => removeSchedule(index)}
                        >
                          <Ionicons name="trash-outline" size={20} color="#EF4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                    
                    {/* Time input */}
                    <View style={styles.timeInputContainer}>
                      <Ionicons name="time-outline" size={20} color="#4facfe" />
                      <Text style={styles.timeLabel}>Heure de prise:</Text>
                      <TouchableOpacity
                        style={styles.timePickerButton}
                        onPress={() => openTimePicker(index)}
                      >
                        <Ionicons name="time-outline" size={20} color="#4facfe" />
                        <Text style={styles.timePickerText}>{schedule.time}</Text>
                        <Ionicons name="chevron-down" size={18} color="rgba(255, 255, 255, 0.6)" />
                      </TouchableOpacity>
                    </View>

                    {/* Days of the week */}
                    <View style={styles.daysSection}>
                      <Text style={styles.daysLabel}>Jours de la semaine:</Text>
                      <View style={styles.daysContainer}>
                        {WEEK_DAYS.map((day, dayIndex) => {
                          const isSelected = schedule.days?.includes(dayIndex + 1) ?? false;
                          return (
                            <TouchableOpacity
                              key={dayIndex}
                              style={[
                                styles.dayButton,
                                isSelected && styles.selectedDayButton
                              ]}
                              onPress={() => toggleDay(index, dayIndex)}
                            >
                              <Text style={[
                                styles.dayButtonText,
                                isSelected && styles.selectedDayButtonText
                              ]}>
                                {day.short}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                ))}

                {/* Add schedule button */}
                <TouchableOpacity
                  style={styles.addScheduleButton}
                  onPress={addSchedule}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#10B981" />
                  <Text style={styles.addScheduleText}>Ajouter un horaire</Text>
                </TouchableOpacity>

                {/* Repeat weeks */}
                <View style={styles.repeatWeeksContainer}>
                  <Text style={styles.repeatWeeksLabel}>Répéter sur</Text>
                  <TextInput
                    style={styles.repeatWeeksInput}
                    value={repeatWeeks}
                    onChangeText={setRepeatWeeks}
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  />
                  <Text style={styles.repeatWeeksLabel}>semaine(s)</Text>
                </View>
              </View>

              {/* 5. DURÉE */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>DURÉE</Text>
                <View style={styles.durationContainer}>
                  <TouchableOpacity
                    style={[styles.durationButton, isChronic && styles.durationButtonActive]}
                    onPress={() => setIsChronic(true)}
                  >
                    <Ionicons 
                      name="infinite" 
                      size={20} 
                      color={isChronic ? 'white' : 'rgba(255, 255, 255, 0.6)'} 
                    />
                    <Text style={[
                      styles.durationButtonText,
                      isChronic && styles.durationButtonTextActive
                    ]}>
                      À vie
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.durationButton, !isChronic && styles.durationButtonActive]}
                    onPress={() => setIsChronic(false)}
                  >
                    <Ionicons 
                      name="calendar-outline" 
                      size={20} 
                      color={!isChronic ? 'white' : 'rgba(255, 255, 255, 0.6)'} 
                    />
                    <Text style={[
                      styles.durationButtonText,
                      !isChronic && styles.durationButtonTextActive
                    ]}>
                      Temporaire (1 mois)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Instructions (optional) */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>INSTRUCTIONS (Optionnel)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Instructions particulières..."
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={instructions}
                  onChangeText={setInstructions}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Voice Message Selector (optional) */}
              {voiceMessages.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="mic" size={20} color="#4facfe" />
                    <Text style={styles.sectionTitle}>MESSAGE VOCAL (Optionnel)</Text>
                  </View>
                  <Text style={styles.sectionSubtitle}>
                    Choisissez un message vocal spécifique pour ce médicament
                  </Text>
                  
                  <View style={styles.voiceOptionsContainer}>
                    {/* No Voice Option */}
                    <TouchableOpacity
                      style={[
                        styles.voiceOption,
                        selectedVoiceMessageId === null && styles.voiceOptionSelected
                      ]}
                      onPress={() => setSelectedVoiceMessageId(null)}
                    >
                      <View style={styles.voiceOptionContent}>
                        <Ionicons 
                          name={selectedVoiceMessageId === null ? "radio-button-on" : "radio-button-off"} 
                          size={20} 
                          color={selectedVoiceMessageId === null ? "#4facfe" : "rgba(255, 255, 255, 0.6)"} 
                        />
                        <Text style={styles.voiceOptionText}>Aucun message vocal</Text>
                      </View>
                    </TouchableOpacity>

                    {/* Voice Message Options */}
                    {voiceMessages.map((voice) => (
                      <View
                        key={voice.id}
                        style={[
                          styles.voiceOption,
                          selectedVoiceMessageId === voice.id && styles.voiceOptionSelected
                        ]}
                      >
                        <TouchableOpacity
                          style={styles.voiceOptionSelector}
                          onPress={() => setSelectedVoiceMessageId(voice.id)}
                        >
                          <Ionicons 
                            name={selectedVoiceMessageId === voice.id ? "radio-button-on" : "radio-button-off"} 
                            size={20} 
                            color={selectedVoiceMessageId === voice.id ? "#4facfe" : "rgba(255, 255, 255, 0.6)"} 
                          />
                          <Text style={styles.voiceOptionText}>{voice.title || voice.fileName}</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={styles.voicePlayButton}
                          onPress={() => togglePlayVoice(voice)}
                        >
                          <Ionicons 
                            name={playingVoiceId === voice.id ? "pause-circle" : "play-circle"} 
                            size={32} 
                            color="#4facfe" 
                          />
                        </TouchableOpacity>
                      </View>
                    ))}
                    
                    {/* Add New Voice Button */}
                    <TouchableOpacity 
                      style={styles.addNewVoiceButton}
                      onPress={() => setShowVoiceRecorder(true)}
                      disabled={isUploadingVoice}
                    >
                      {isUploadingVoice ? (
                        <ActivityIndicator size="small" color="#4facfe" />
                      ) : (
                        <>
                          <Ionicons name="add-circle" size={20} color="#4facfe" />
                          <Text style={styles.addNewVoiceText}>Enregistrer un nouveau message</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.saveButton, isSaving && styles.disabledButton]}
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  <LinearGradient
                    colors={["#10B981", "#059669"]}
                    style={styles.saveButtonGradient}
                  >
                    <Ionicons name="checkmark-circle" size={22} color="white" />
                    <Text style={styles.saveButtonText}>
                      {isSaving ? 'Enregistrement...' : 'Enregistrer la prescription'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onClose}
                  disabled={isSaving}
                >
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </LinearGradient>
        </View>

        {/* Medication Picker Modal */}
        <Modal
          visible={showMedicationPicker}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowMedicationPicker(false)}
        >
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerContainer}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Sélectionner un médicament</Text>
                <TouchableOpacity onPress={() => setShowMedicationPicker(false)}>
                  <Ionicons name="close" size={24} color="#1F2937" />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher..."
                placeholderTextColor="#9CA3AF"
                value={medSearch}
                onChangeText={setMedSearch}
              />

              <ScrollView style={styles.medicationList}>
                {/* Add New Medication Button */}
                <TouchableOpacity
                  style={styles.addNewMedicationButton}
                  onPress={handleAddCustomMedication}
                >
                  <LinearGradient
                    colors={["#10B981", "#059669"]}
                    style={styles.addNewMedicationGradient}
                  >
                    <Ionicons name="add-circle" size={24} color="white" />
                    <Text style={styles.addNewMedicationText}>
                      Ajouter un nouveau médicament
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                {filteredMedications.map(med => (
                  <TouchableOpacity
                    key={med.id}
                    style={[
                      styles.medicationItem,
                      selectedMedication?.id === med.id && styles.selectedMedicationItem
                    ]}
                    onPress={() => handleSelectMedication(med)}
                  >
                    <View style={styles.medicationItemHeader}>
                      <Text style={styles.medicationItemName}>{med.name}</Text>
                      <Text style={styles.medicationItemDosage}>{med.dosage}</Text>
                    </View>
                    <Text style={styles.medicationItemDetails}>
                      {med.genericName} • {med.form}
                    </Text>
                    <Text style={styles.medicationItemDescription}>{med.description}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Custom Medication Form Modal */}
        <Modal
          visible={showCustomMedForm}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowCustomMedForm(false)}
        >
          <View style={styles.pickerOverlay}>
            <View style={styles.customMedContainer}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Nouveau Médicament</Text>
                <TouchableOpacity onPress={() => setShowCustomMedForm(false)}>
                  <Ionicons name="close" size={24} color="#1F2937" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.customMedForm}>
                <Text style={styles.customMedLabel}>Nom du médicament *</Text>
                <TextInput
                  style={styles.customMedInput}
                  placeholder="Ex: Aspirine"
                  placeholderTextColor="#9CA3AF"
                  value={customMedData.name}
                  onChangeText={(text) => setCustomMedData({...customMedData, name: text})}
                />

                <Text style={styles.customMedLabel}>Nom générique</Text>
                <TextInput
                  style={styles.customMedInput}
                  placeholder="Ex: Acide acétylsalicylique"
                  placeholderTextColor="#9CA3AF"
                  value={customMedData.genericName}
                  onChangeText={(text) => setCustomMedData({...customMedData, genericName: text})}
                />

                <Text style={styles.customMedLabel}>Dosage</Text>
                <TextInput
                  style={styles.customMedInput}
                  placeholder="Ex: 500mg"
                  placeholderTextColor="#9CA3AF"
                  value={customMedData.dosage}
                  onChangeText={(text) => setCustomMedData({...customMedData, dosage: text})}
                />

                <Text style={styles.customMedLabel}>Forme</Text>
                <View style={styles.formTypeContainer}>
                  {['Comprimé', 'Gélule', 'Sirop', 'Injection', 'Gouttes'].map((form) => (
                    <TouchableOpacity
                      key={form}
                      style={[
                        styles.formTypePill,
                        customMedData.form === form && styles.formTypePillActive
                      ]}
                      onPress={() => setCustomMedData({...customMedData, form})}
                    >
                      <Text style={[
                        styles.formTypePillText,
                        customMedData.form === form && styles.formTypePillTextActive
                      ]}>
                        {form}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.customMedLabel}>Description/Indication</Text>
                <TextInput
                  style={[styles.customMedInput, styles.customMedTextArea]}
                  placeholder="Ex: Douleur, fièvre, inflammation"
                  placeholderTextColor="#9CA3AF"
                  value={customMedData.description}
                  onChangeText={(text) => setCustomMedData({...customMedData, description: text})}
                  multiline
                  numberOfLines={3}
                />

                <TouchableOpacity
                  style={styles.saveCustomMedButton}
                  onPress={handleSaveCustomMedication}
                >
                  <LinearGradient
                    colors={["#10B981", "#059669"]}
                    style={styles.saveCustomMedGradient}
                  >
                    <Ionicons name="checkmark-circle" size={20} color="white" />
                    <Text style={styles.saveCustomMedText}>Utiliser ce médicament</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Error Modal */}
        <FeedbackModal
          visible={errorModal.visible}
          type="error"
          title="Erreur"
          message={errorModal.message}
          onConfirm={() => setErrorModal({ visible: false, message: '' })}
          confirmText="OK"
        />

        {/* Time Picker */}
        {showTimePicker && (
          <>
            {Platform.OS === 'ios' ? (
              <Modal
                visible={showTimePicker}
                transparent={true}
                animationType="slide"
                onRequestClose={closeTimePicker}
              >
                <View style={styles.timePickerModalOverlay}>
                  <View style={styles.timePickerModalContent}>
                    <View style={styles.timePickerHeader}>
                      <Text style={styles.timePickerTitle}>Sélectionner l'heure</Text>
                      <TouchableOpacity onPress={confirmTimePicker}>
                        <Text style={styles.timePickerDoneButton}>Terminé</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={tempTime}
                      mode="time"
                      is24Hour={true}
                      display="spinner"
                      onChange={handleTimeChange}
                      textColor="white"
                      style={styles.timePicker}
                    />
                  </View>
                </View>
              </Modal>
            ) : (
              <DateTimePicker
                value={tempTime}
                mode="time"
                is24Hour={true}
                display="default"
                onChange={handleTimeChange}
              />
            )}
          </>
        )}

        {/* Voice Recorder Modal */}
        <VoiceRecorderModal
          visible={showVoiceRecorder}
          onClose={() => setShowVoiceRecorder(false)}
          onSave={handleSaveVoiceMessage}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: '92%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalContent: {
    flex: 1,
    paddingTop: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  
  // Section
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4facfe',
    marginBottom: 12,
    letterSpacing: 0.5,
  },

  // Patient Card
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(79, 172, 254, 0.3)',
  },
  patientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(79, 172, 254, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
  },
  patientSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },

  // Select Medication Button
  selectMedicationButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  selectButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },

  // Selected Medication Card
  selectedMedCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  selectedMedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  selectedMedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  selectedMedDetails: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  selectedMedDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontStyle: 'italic',
  },

  // Input
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: 'white',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 6,
    fontStyle: 'italic',
  },

  // Schedule Card
  scheduleCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  scheduleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },
  removeScheduleButton: {
    padding: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 8,
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  timeLabel: {
    fontSize: 14,
    color: 'white',
    flex: 1,
  },
  timeInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: 'white',
    width: 100,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'rgba(79, 172, 254, 0.3)',
  },

  // Days Selection
  daysSection: {
    marginTop: 4,
  },
  daysLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 10,
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  selectedDayButton: {
    backgroundColor: '#4facfe',
    borderColor: '#4facfe',
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  selectedDayButtonText: {
    color: 'white',
  },

  // Add Schedule Button
  addScheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  addScheduleText: {
    color: '#10B981',
    fontSize: 15,
    fontWeight: '600',
  },

  // Repeat Weeks
  repeatWeeksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  repeatWeeksLabel: {
    fontSize: 14,
    color: 'white',
    fontWeight: '500',
  },
  repeatWeeksInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: 'white',
    width: 70,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'rgba(79, 172, 254, 0.3)',
  },

  // Duration Buttons
  durationContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  durationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    gap: 8,
  },
  durationButtonActive: {
    backgroundColor: '#4facfe',
    borderColor: '#4facfe',
  },
  durationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  durationButtonTextActive: {
    color: 'white',
  },

  // Action Buttons
  actionButtons: {
    marginTop: 12,
    marginBottom: 24,
    gap: 12,
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  disabledButton: {
    opacity: 0.5,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '600',
  },

  // Medication Picker
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  pickerTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1F2937',
  },
  searchInput: {
    margin: 20,
    marginTop: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
  },
  medicationList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  addNewMedicationButton: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  addNewMedicationGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  addNewMedicationText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  medicationItem: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedMedicationItem: {
    backgroundColor: '#DBEAFE',
    borderWidth: 2,
    borderColor: '#4facfe',
  },
  medicationItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  medicationItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  medicationItemDosage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4facfe',
  },
  medicationItemDetails: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 3,
  },
  medicationItemDescription: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },

  // Custom Medication Form
  customMedContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
  },
  customMedForm: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  customMedLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 14,
  },
  customMedInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
  },
  customMedTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  formTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  formTypePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  formTypePillActive: {
    backgroundColor: '#DBEAFE',
    borderColor: '#4facfe',
  },
  formTypePillText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  formTypePillTextActive: {
    color: '#4facfe',
    fontWeight: '600',
  },
  saveCustomMedButton: {
    marginTop: 24,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveCustomMedGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 8,
  },
  saveCustomMedText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },

  // Voice Message Selector
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 12,
    lineHeight: 18,
  },
  voiceOptionsContainer: {
    gap: 10,
  },
  voiceOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  voiceOptionSelected: {
    backgroundColor: 'rgba(79, 172, 254, 0.15)',
    borderColor: '#4facfe',
    borderWidth: 2,
  },
  voiceOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  voiceOptionSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  voiceOptionInfo: {
    flex: 1,
  },
  voiceOptionText: {
    fontSize: 15,
    color: 'white',
    fontWeight: '500',
  },
  voiceOptionDuration: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  voicePlayButton: {
    padding: 4,
  },
  addNewVoiceButton: {
    backgroundColor: 'rgba(79, 172, 254, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#4facfe',
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
  },
  addNewVoiceText: {
    fontSize: 15,
    color: '#4facfe',
    fontWeight: '600',
  },

  // Time Picker Button
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minWidth: 140,
  },
  timePickerText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    flex: 1,
  },

  // Time Picker Modal (iOS)
  timePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  timePickerModalContent: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  timePickerDoneButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4facfe',
  },
  timePicker: {
    height: 200,
  },
});
