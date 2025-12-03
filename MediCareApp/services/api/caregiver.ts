import { request } from './common';

export async function getPatientDetails(token: string, patientId: string) {
  return request(`/tutor/patients/${patientId}/profile`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
}

export async function getDoctorPatientMedications(token: string, patientId: string) {
  return request(`/medecin/patients/${patientId}/medications`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
}

export async function deletePatient(token: string, patientId: string) {
  return request(`/tutor/patients/${patientId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
}

export async function createPrescription(
  token: string,
  patientId: string,
  prescriptionData: {
    medicationName: string;
    medicationGenericName?: string;
    medicationDosage?: string;
    medicationForm?: string;
    medicationDescription?: string;
    customDosage?: string;
    instructions?: string;
    schedules: Array<{ time: string; days: number[] }>;
    voiceMessageId?: string | null;
    isChronic?: boolean;
    endDate?: string;
    scheduleType?: 'daily' | 'weekly' | 'interval' | 'monthly' | 'custom';
    intervalHours?: number;
    repeatWeeks?: number;
  }
) {
  return request(`/tutor/patients/${patientId}/prescriptions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ patientId, ...prescriptionData }),
  });
}

export async function updatePrescription(
  token: string,
  prescriptionId: string,
  prescriptionData: {
    medicationName?: string;
    medicationGenericName?: string;
    medicationDosage?: string;
    medicationForm?: string;
    medicationDescription?: string;
    customDosage?: string;
    instructions?: string;
    schedules?: Array<{ time: string; days: number[] }>;
    voiceMessageId?: string | null;
    isChronic?: boolean;
    endDate?: string;
    scheduleType?: 'daily' | 'weekly' | 'interval' | 'monthly' | 'custom';
    intervalHours?: number;
    repeatWeeks?: number;
  }
) {
  return request(`/tutor/prescriptions/${prescriptionId}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(prescriptionData),
  });
}

export async function deletePrescription(token: string, prescriptionId: string) {
  return request(`/tutor/prescriptions/${prescriptionId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
}

export async function uploadVoiceMessage(
  token: string,
  payload: { fileBase64: string; fileName?: string; mimeType?: string }
) {
  return request<{ fileUrl: string; path: string }>('/tutor/voice-messages/upload', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export async function createVoiceMessage(
  token: string,
  data: { patientId: string; fileUrl: string; fileName?: string; title?: string; durationSeconds?: number }
) {
  return request('/tutor/voice-messages', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

export async function getPatientVoiceMessages(token: string, patientId: string) {
  return request(`/tutor/patients/${patientId}/voice-messages`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
}

export async function deleteVoiceMessage(token: string, messageId: string) {
  return request(`/tutor/voice-messages/${messageId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
}

export async function getPatientAdherenceHistory(token: string, patientId: string, daysBack: number = 30) {
  return request(`/tutor/patients/${patientId}/adherence-history?days=${daysBack}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
}

export async function getDoctorPatients(token: string) {
  return request('/medecin/patients', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
}

export async function getDoctorDashboard(token: string) {
  return request('/medecin/dashboard', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
}

export async function sendPatientInvitation(token: string, invitationData: { phoneNumber: string }) {
  return request('/tutor/patients/invite', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(invitationData),
  });
}


