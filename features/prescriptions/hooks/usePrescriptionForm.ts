import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { PrescriptionData, VoiceMessage } from '../../../shared/types';
import { MedicationOption } from '../../../shared/constants/medications';
import { uploadVoiceFile, createVoice, getVoiceMessages } from '../services/prescriptionService';
import { createPrescription, updatePrescription } from '../../../shared/services/api/caregiver';

interface UsePrescriptionFormProps {
  patientId: string;
  token: string;
  existingPrescription?: PrescriptionData | null;
  onSave: (prescriptionData: any) => Promise<void>;
  onVoiceMessagesUpdate?: (voices: VoiceMessage[]) => void;
}

export function usePrescriptionForm({
  patientId,
  token,
  existingPrescription,
  onSave,
  onVoiceMessagesUpdate,
}: UsePrescriptionFormProps) {
  const [medicationName, setMedicationName] = useState('');
  const [selectedMedication, setSelectedMedication] = useState<MedicationOption | null>(null);
  const [customDosage, setCustomDosage] = useState('');
  const [instructions, setInstructions] = useState('');
  const [schedules, setSchedules] = useState<Array<{ time: string; days: number[] }>>([
    { time: '08:00', days: [1, 2, 3, 4, 5, 6, 7] }
  ]);
  const [isChronic, setIsChronic] = useState(true);
  const [repeatWeeks, setRepeatWeeks] = useState('1');
  const [selectedVoiceMessageId, setSelectedVoiceMessageId] = useState<string | null>(null);
  const [voiceMessages, setVoiceMessages] = useState<VoiceMessage[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingVoice, setIsUploadingVoice] = useState(false);
  const [showCustomMedForm, setShowCustomMedForm] = useState(false);
  const [customMedData, setCustomMedData] = useState({
    name: '',
    genericName: '',
    dosage: '',
    form: 'Comprimé',
    description: '',
  });

  useEffect(() => {
    const loadVoiceMessages = async () => {
      try {
        const voices = await getVoiceMessages(token, patientId);
        setVoiceMessages(voices);
        if (onVoiceMessagesUpdate) {
          onVoiceMessagesUpdate(voices);
        }
      } catch (error) {
        console.error('Error loading voice messages:', error);
      }
    };

    if (token && patientId) {
      loadVoiceMessages();
    }
  }, [token, patientId, onVoiceMessagesUpdate]);

  useEffect(() => {
    if (existingPrescription) {
      setMedicationName(existingPrescription.medication?.name || '');
      setCustomDosage(existingPrescription.customDosage || '');
      setInstructions(existingPrescription.instructions || '');
      if (existingPrescription.schedules && existingPrescription.schedules.length > 0) {
        const sanitizedSchedules = existingPrescription.schedules.map(schedule => ({
          ...schedule,
          days: schedule.days || [1, 2, 3, 4, 5, 6, 7]
        }));
        setSchedules(sanitizedSchedules);
      }
      setIsChronic(existingPrescription.isChronic ?? true);
      setRepeatWeeks(String(existingPrescription.repeatWeeks || 1));
      const voiceMessageId = (existingPrescription as any).voiceMessageId;
      setSelectedVoiceMessageId(voiceMessageId || null);
    } else {
      setMedicationName('');
      setSelectedMedication(null);
      setCustomDosage('');
      setInstructions('');
      setSchedules([{ time: '08:00', days: [1, 2, 3, 4, 5, 6, 7] }]);
      setIsChronic(true);
      setRepeatWeeks('1');
      setSelectedVoiceMessageId(null);
    }
  }, [existingPrescription]);

  const handleSaveVoiceMessage = async (audioUri: string, duration: number, title?: string) => {
    try {
      setIsUploadingVoice(true);
      
      const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const uploadResult = await uploadVoiceFile(token, {
        fileBase64: base64Audio,
        fileName: `voice_${Date.now()}.m4a`,
        mimeType: 'audio/m4a',
      });

      if (!uploadResult.success || !uploadResult.data) {
        throw new Error('Échec du téléchargement du fichier audio');
      }

      const createResult = await createVoice(token, {
        patientId: patientId,
        fileUrl: uploadResult.data.fileUrl,
        fileName: `voice_${Date.now()}.m4a`,
        title: title,
        durationSeconds: duration,
      });

      if (createResult.success && createResult.data) {
        const voices = await getVoiceMessages(token, patientId);
        setVoiceMessages(voices);
        if (onVoiceMessagesUpdate) {
          onVoiceMessagesUpdate(voices);
        }
        const voiceId = (createResult.data as any).id || (createResult.data as any).data?.id;
        if (voiceId) {
          setSelectedVoiceMessageId(voiceId);
        }
        return { success: true };
      }
      return { success: false, message: 'Erreur lors de la création du message vocal' };
    } catch (error: any) {
      console.error('Error saving voice message:', error);
      return { success: false, message: error.message || 'Erreur lors de l\'enregistrement du message vocal' };
    } finally {
      setIsUploadingVoice(false);
    }
  };

  const handleSave = async (): Promise<{ success: boolean; message?: string }> => {
    if (!medicationName.trim()) {
      return { success: false, message: 'Veuillez sélectionner ou saisir un nom de médicament' };
    }

    if (schedules.length === 0) {
      return { success: false, message: 'Veuillez définir au moins un horaire' };
    }

    for (const schedule of schedules) {
      if (!schedule.days || schedule.days.length === 0) {
        return { success: false, message: 'Veuillez sélectionner au moins un jour pour chaque horaire' };
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
      return { success: true };
    } catch (error: any) {
      return { success: false, message: error.message || 'Erreur lors de la sauvegarde de la prescription' };
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectMedication = (med: MedicationOption) => {
    setSelectedMedication(med);
    setMedicationName(med.name);
    setCustomDosage(med.dosage || '');
    setShowCustomMedForm(false);
  };

  const handleAddCustomMedication = () => {
    setShowCustomMedForm(true);
    setSelectedMedication(null);
    setCustomMedData({
      name: medicationName || '',
      genericName: '',
      dosage: '',
      form: 'Comprimé',
      description: '',
    });
  };

  const handleSaveCustomMedication = (medication: MedicationOption) => {
    setSelectedMedication(medication);
    setMedicationName(medication.name);
    setCustomDosage(medication.dosage || '');
    setShowCustomMedForm(false);
  };

  return {
    // State
    medicationName,
    selectedMedication,
    customDosage,
    instructions,
    schedules,
    isChronic,
    repeatWeeks,
    selectedVoiceMessageId,
    voiceMessages,
    isSaving,
    isUploadingVoice,
    showCustomMedForm,
    customMedData,
    // Setters
    setMedicationName,
    setCustomDosage,
    setInstructions,
    setSchedules,
    setIsChronic,
    setRepeatWeeks,
    setSelectedVoiceMessageId,
    setShowCustomMedForm,
    setCustomMedData,
    // Handlers
    handleSave,
    handleSaveVoiceMessage,
    handleSelectMedication,
    handleAddCustomMedication,
  };
}

