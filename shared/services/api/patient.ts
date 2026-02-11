import { request } from './client';
import { Medication } from '../../types';

export async function getPatientMedicationsByDate(token: string, date: string) {
  return request<{ medications: Medication[]; total: number; taken: number; adherenceRate: number }>(
    `/patient/medications/by-date?date=${encodeURIComponent(date)}`,
    {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    }
  );
}

export async function confirmMedicationTaken(token: string, reminderIds: string[]) {
  return request('/patient/reminders/confirm', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ reminderIds }),
  });
}

export async function snoozeMedicationReminder(token: string, reminderIds: string[]) {
  return request('/patient/reminders/snooze', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ reminderIds }),
  });
}

export async function getUpcomingReminders(token: string, daysAhead: number = 30) {
  return request(`/patient/reminders/upcoming?days=${daysAhead}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
}

export async function checkForUpdates(token: string, lastSyncTime?: string) {
  const url = lastSyncTime
    ? `/patient/check-updates?lastSync=${encodeURIComponent(lastSyncTime)}`
    : '/patient/check-updates';

  return request(url, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
}

export async function syncOfflineActions(
  token: string,
  actions: Array<{ id: string; type: 'confirm' | 'snooze'; reminderId: string; timestamp: string }>
) {
  return request('/notifications/sync-offline-actions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ actions }),
  });
}

