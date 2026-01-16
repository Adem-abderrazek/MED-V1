import { uploadVoiceMessage, createVoiceMessage, getPatientVoiceMessages } from '../../../shared/services/api/caregiver';
import { VoiceMessage } from '../../../shared/types';

export async function uploadVoiceFile(
  token: string,
  payload: { fileBase64: string; fileName?: string; mimeType?: string }
) {
  return uploadVoiceMessage(token, payload);
}

export async function createVoice(
  token: string,
  payload: {
    patientId: string;
    fileUrl: string;
    fileName: string;
    title?: string;
    durationSeconds: number;
  }
) {
  return createVoiceMessage(token, payload);
}

export async function getVoiceMessages(
  token: string,
  patientId: string
): Promise<VoiceMessage[]> {
  const result = await getPatientVoiceMessages(token, patientId);
  if (result.success && result.data) {
    return result.data as VoiceMessage[];
  }
  return [];
}





