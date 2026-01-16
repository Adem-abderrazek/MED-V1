import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { usePrescriptionForm } from '../hooks/usePrescriptionForm';
import MedicationSelector from './MedicationSelector';
import ScheduleSelector from './ScheduleSelector';
import VoiceMessageManager from './VoiceMessageManager';
import PrescriptionFormFields from './PrescriptionFormFields';
import VoiceRecorderModal from '../../../shared/components/modals/VoiceRecorderModal';
import FeedbackModal from '../../../shared/components/modals/FeedbackModal';
import { PrescriptionData, VoiceMessage } from '../../../shared/types';
import { MedicationOption } from '../../../shared/constants/medications';

interface PrescriptionFormProps {
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

export default function PrescriptionForm({
  visible,
  onClose,
  onSave,
  existingPrescription,
  patientName,
  patientId,
  token,
  voiceMessages = [],
  onVoiceMessagesUpdate,
}: PrescriptionFormProps) {
  const {
    medicationName,
    selectedMedication,
    customDosage,
    instructions,
    schedules,
    isChronic,
    repeatWeeks,
    selectedVoiceMessageId,
    isSaving,
    isUploadingVoice,
    showCustomMedForm,
    customMedData,
    setMedicationName,
    setCustomDosage,
    setInstructions,
    setSchedules,
    setIsChronic,
    setRepeatWeeks,
    setSelectedVoiceMessageId,
    setShowCustomMedForm,
    setCustomMedData,
    handleSave,
    handleSaveVoiceMessage,
    handleSelectMedication,
    handleAddCustomMedication,
  } = usePrescriptionForm({
    patientId,
    token,
    existingPrescription,
    onSave,
    onVoiceMessagesUpdate,
  });

  const [errorModal, setErrorModal] = React.useState({ visible: false, message: '' });
  const [showVoiceRecorder, setShowVoiceRecorder] = React.useState(false);

  const onSavePress = async () => {
    const result = await handleSave();
    if (result.success) {
      onClose();
    } else {
      setErrorModal({ visible: true, message: result.message || 'Erreur' });
    }
  };

  const onVoiceSave = async (audioUri: string, duration: number, title?: string) => {
    const result = await handleSaveVoiceMessage(audioUri, duration, title);
    if (result.success) {
      setShowVoiceRecorder(false);
    } else {
      setErrorModal({ visible: true, message: result.message || 'Erreur' });
    }
  };

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
            colors={['#1a1a2e', '#16213e', '#0f3460']}
            style={styles.modalContent}
          >
            <View style={styles.header}>
              <Text style={styles.headerTitle}>
                {existingPrescription ? 'Modifier' : 'Nouvelle'} Prescription
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>MÉDICAMENT</Text>
                <MedicationSelector
                  selectedMedication={selectedMedication}
                  medicationName={medicationName}
                  onSelectMedication={handleSelectMedication}
                  onMedicationNameChange={setMedicationName}
                  onAddCustom={handleAddCustomMedication}
                  showCustomForm={showCustomMedForm}
                  onCloseCustomForm={() => setShowCustomMedForm(false)}
                  onSaveCustomMedication={(med) => {
                    handleSelectMedication(med);
                    setShowCustomMedForm(false);
                  }}
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>PLANIFICATION</Text>
                <ScheduleSelector
                  schedules={schedules}
                  onSchedulesChange={setSchedules}
                  repeatWeeks={repeatWeeks}
                  onRepeatWeeksChange={setRepeatWeeks}
                />
              </View>

              <PrescriptionFormFields
                customDosage={customDosage}
                onCustomDosageChange={setCustomDosage}
                instructions={instructions}
                onInstructionsChange={setInstructions}
                isChronic={isChronic}
                onIsChronicChange={setIsChronic}
              />

              <View style={styles.section}>
                <VoiceMessageManager
                  voiceMessages={voiceMessages}
                  selectedVoiceMessageId={selectedVoiceMessageId}
                  onVoiceMessageSelect={setSelectedVoiceMessageId}
                  onRecordNew={() => setShowVoiceRecorder(true)}
                  isUploading={isUploadingVoice}
                />
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.saveButton, isSaving && styles.disabledButton]}
                  onPress={onSavePress}
                  disabled={isSaving}
                >
                  <LinearGradient
                    colors={['#10B981', '#059669']}
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

        <FeedbackModal
          visible={errorModal.visible}
          type="error"
          title="Erreur"
          message={errorModal.message}
          onConfirm={() => setErrorModal({ visible: false, message: '' })}
          confirmText="OK"
        />

        <VoiceRecorderModal
          visible={showVoiceRecorder}
          onClose={() => setShowVoiceRecorder(false)}
          onSave={onVoiceSave}
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
});
