import * as Notifications from 'expo-notifications';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import apiService from './api';
import { alarmService } from './alarmService';
import iOSAlarmService from './iOSAlarmService';
import i18n from '../../i18n';

const STORAGE_KEYS = {
  REMINDERS_V1: '@medication_reminders',
  REMINDERS_V2: '@medication_reminders_v2',
  LAST_SYNC: '@last_sync_time',
  VOICE_MESSAGES: '@voice_messages',
  SYNC_STATE: '@medication_reminder_sync_state',
  MIGRATION_V1_DONE: '@medication_reminders_migration_v1_done',
};

const DEFAULT_RECONCILE_MIN_INTERVAL_MS = 15000;
const IOS_MAX_PENDING_NOTIFICATIONS = 64;
const IOS_REPEAT_COUNT = 10;
const IOS_REPEAT_INTERVAL_MS = 60 * 1000;
const IOS_SOUND_BY_LANG: Record<string, string> = {
  ar: 'arabv.caf',
  en: 'englishv.caf',
  fr: 'frenchv.caf',
};

function getIOSSoundName(): string {
  const language = i18n.language?.split('-')[0] || 'fr';
  return IOS_SOUND_BY_LANG[language] || IOS_SOUND_BY_LANG.fr;
}

// Directory for storing voice messages locally
const VOICE_MESSAGES_DIR = `${FileSystem.documentDirectory}voice-messages/`;

// Use native alarm service for Android full-screen alarms
const useNativeAlarms = Platform.OS === 'android' && alarmService.isAvailable();

export interface LocalReminder {
  id: string;
  reminderId: string;
  prescriptionId: string;
  medicationName: string;
  dosage: string;
  instructions?: string;
  imageUrl?: string;
  scheduledFor: string;
  patientId: string;
  // Voice message fields from backend
  voiceUrl?: string | null;
  voiceFileName?: string | null;
  voiceTitle?: string | null;
  voiceDuration?: number;
  voiceChecksum?: string | null;
  voiceVersion?: number | null;
  voiceFormat?: string | null;
}

type StoredReminderV1 = {
  notificationId: string;
  medicationName: string;
  dosage: string;
};

type StoredReminderV2 = {
  reminderId: string;
  prescriptionId: string;
  patientId: string;
  scheduledFor: string;
  medicationName: string;
  dosage: string;
  instructions?: string;
  imageUrl?: string;
  voice?: {
    voiceUrl?: string | null;
    voiceFileName?: string | null;
    localPath?: string | null;
    voiceChecksum?: string | null;
    voiceVersion?: number | null;
    voiceFormat?: string | null;
  };
  schedule: {
    platform: 'android_native' | 'expo';
    alarmId?: string;
    notificationIds?: string[];
    scheduledAtMs: number;
  };
  fingerprint: string;
  lastSyncedAt: string;
};

type SyncState = {
  schemaVersion: number;
  lastSyncAt?: string;
  lastFullReconcileAt?: string;
  inProgress: boolean;
};

type ScheduleResult = {
  platform: 'android_native' | 'expo';
  alarmId?: string;
  notificationIds?: string[];
  scheduledAtMs: number;
};

let isReconciling = false;

function hashString(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return `h${Math.abs(hash)}`;
}

function buildFingerprint(reminder: LocalReminder): string {
  const payload = [
    reminder.reminderId,
    reminder.prescriptionId,
    reminder.scheduledFor,
    reminder.medicationName,
    reminder.dosage,
    reminder.instructions || '',
    reminder.imageUrl || '',
    reminder.voiceUrl || '',
    reminder.voiceFileName || '',
    reminder.voiceChecksum || '',
    reminder.voiceVersion ?? '',
    reminder.voiceFormat || '',
  ].join('|');
  return hashString(payload);
}

function normalizeVoiceFormat(format?: string | null): string | null {
  if (!format) return null;
  const normalized = format.replace(/^\./, '').trim().toLowerCase();
  return normalized || null;
}

function resolveVoiceExtension(reminder: Pick<LocalReminder, 'voiceFileName' | 'voiceFormat'>): string {
  const extensionFromFileName = reminder.voiceFileName?.split('.').pop()?.trim().toLowerCase();
  if (extensionFromFileName) {
    return extensionFromFileName;
  }
  return normalizeVoiceFormat(reminder.voiceFormat) || 'm4a';
}

function getIOSLibrarySoundsDirectory(): string | null {
  if (Platform.OS !== 'ios' || !FileSystem.documentDirectory) {
    return null;
  }
  return FileSystem.documentDirectory.replace(/Documents\/?$/, 'Library/Sounds/');
}

function buildIOSDynamicSoundName(reminder: LocalReminder): string {
  const checksumSeed = reminder.voiceChecksum || hashString(`${reminder.voiceUrl || reminder.reminderId}|${reminder.voiceVersion || ''}`);
  const safeChecksum = checksumSeed.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24);
  const safeReminder = reminder.reminderId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
  const version = Number.isFinite(Number(reminder.voiceVersion)) ? Number(reminder.voiceVersion) : 1;
  return `voice_${safeChecksum || safeReminder || 'fallback'}_v${version}.caf`;
}

async function resolveIOSNotificationSoundName(
  reminder: LocalReminder,
  localAudioPath: string | null
): Promise<string> {
  const fallbackSound = getIOSSoundName();
  if (Platform.OS !== 'ios') {
    return fallbackSound;
  }

  if (!localAudioPath || !reminder.voiceUrl) {
    return fallbackSound;
  }

  const extension = resolveVoiceExtension(reminder);
  if (extension !== 'caf') {
    console.log(`iOS dynamic sound skipped (${extension}); using bundled fallback sound`);
    return fallbackSound;
  }

  const soundsDir = getIOSLibrarySoundsDirectory();
  if (!soundsDir) {
    console.warn('Unable to resolve iOS Library/Sounds directory; using bundled fallback sound');
    return fallbackSound;
  }

  const soundName = buildIOSDynamicSoundName(reminder);
  const destinationPath = `${soundsDir}${soundName}`;

  try {
    const sourceInfo = await FileSystem.getInfoAsync(localAudioPath);
    if (!sourceInfo.exists) {
      console.warn(`Dynamic voice file not found at ${localAudioPath}; using bundled fallback sound`);
      return fallbackSound;
    }

    const dirInfo = await FileSystem.getInfoAsync(soundsDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(soundsDir, { intermediates: true });
    }

    const existingTarget = await FileSystem.getInfoAsync(destinationPath);
    if (!existingTarget.exists) {
      await FileSystem.copyAsync({
        from: localAudioPath,
        to: destinationPath,
      });
      console.log(`Prepared iOS dynamic notification sound: ${soundName}`);
    }

    return soundName;
  } catch (error) {
    console.error('Failed to prepare iOS dynamic notification sound, using bundled fallback:', error);
    return fallbackSound;
  }
}

async function loadSyncState(): Promise<SyncState> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_STATE);
    if (!stored) {
      return { schemaVersion: 2, inProgress: false };
    }
    const parsed = JSON.parse(stored) as Partial<SyncState>;
    return {
      schemaVersion:
        typeof parsed.schemaVersion === 'number' ? parsed.schemaVersion : 2,
      lastSyncAt: parsed.lastSyncAt,
      lastFullReconcileAt: parsed.lastFullReconcileAt,
      inProgress: false,
    };
  } catch (error) {
    console.error('Error loading sync state:', error);
    return { schemaVersion: 2, inProgress: false };
  }
}

async function persistSyncState(state: SyncState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SYNC_STATE, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving sync state:', error);
  }
}

async function loadRemindersV1(): Promise<Record<string, StoredReminderV1>> {
  const stored = await AsyncStorage.getItem(STORAGE_KEYS.REMINDERS_V1);
  if (!stored) {
    return {};
  }

  try {
    return JSON.parse(stored) as Record<string, StoredReminderV1>;
  } catch (error) {
    console.warn('Failed to parse stored reminders v1, resetting state', error);
    return {};
  }
}

async function persistRemindersV1(reminders: Record<string, StoredReminderV1>): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.REMINDERS_V1, JSON.stringify(reminders));
}

function buildLegacyRecord(reminderId: string, legacy: StoredReminderV1): StoredReminderV2 {
  const now = new Date().toISOString();
  return {
    reminderId,
    prescriptionId: '',
    patientId: '',
    scheduledFor: '',
    medicationName: legacy.medicationName || '',
    dosage: legacy.dosage || '',
    schedule: {
      platform: useNativeAlarms ? 'android_native' : 'expo',
      alarmId: useNativeAlarms ? reminderId : undefined,
      notificationIds: legacy.notificationId ? [legacy.notificationId] : [],
      scheduledAtMs: 0,
    },
    fingerprint: 'legacy',
    lastSyncedAt: now,
  };
}

async function migrateV1ToV2(): Promise<Record<string, StoredReminderV2>> {
  try {
    const migrationDone = await AsyncStorage.getItem(STORAGE_KEYS.MIGRATION_V1_DONE);
    if (migrationDone === 'true') {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.REMINDERS_V2);
      if (stored) {
        return JSON.parse(stored) as Record<string, StoredReminderV2>;
      }
      return {};
    }

    const legacy = await loadRemindersV1();
    const migrated: Record<string, StoredReminderV2> = {};
    Object.entries(legacy).forEach(([reminderId, entry]) => {
      migrated[reminderId] = buildLegacyRecord(reminderId, entry);
    });

    await AsyncStorage.setItem(STORAGE_KEYS.REMINDERS_V2, JSON.stringify(migrated));
    await AsyncStorage.setItem(STORAGE_KEYS.MIGRATION_V1_DONE, 'true');

    return migrated;
  } catch (error) {
    console.error('Error migrating reminders v1 to v2:', error);
    return {};
  }
}

async function loadRemindersV2(): Promise<Record<string, StoredReminderV2>> {
  const stored = await AsyncStorage.getItem(STORAGE_KEYS.REMINDERS_V2);
  if (!stored) {
    return migrateV1ToV2();
  }

  try {
    return JSON.parse(stored) as Record<string, StoredReminderV2>;
  } catch (error) {
    console.warn('Failed to parse stored reminders v2, resetting state', error);
    return migrateV1ToV2();
  }
}

async function persistRemindersV2(reminders: Record<string, StoredReminderV2>): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.REMINDERS_V2, JSON.stringify(reminders));
}


// Ensure voice messages directory exists
async function ensureVoiceMessagesDir(): Promise<void> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(VOICE_MESSAGES_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(VOICE_MESSAGES_DIR, { intermediates: true });
      console.log('📁 Created voice messages directory');
    }
  } catch (error) {
    console.error('Error creating voice messages directory:', error);
  }
}

// Download voice message audio file for offline use
async function downloadVoiceMessageLegacy(reminder: LocalReminder): Promise<string | null> {
  if (!reminder.voiceUrl) {
    console.log(`ℹ️ No voice URL for ${reminder.medicationName}`);
    return null;
  }

  try {
    await ensureVoiceMessagesDir();

    // Create unique filename based on prescription ID
    const extension = resolveVoiceExtension(reminder);
    const localFileName = `${reminder.prescriptionId}.${extension}`;
    const localPath = `${VOICE_MESSAGES_DIR}${localFileName}`;

    // Check if already downloaded
    const fileInfo = await FileSystem.getInfoAsync(localPath);
    if (fileInfo.exists) {
      console.log(`✅ Voice already cached: ${localFileName}`);
      return localPath;
    }

    console.log(`⬇️ Downloading voice for ${reminder.medicationName}...`);
    console.log(`   URL: ${reminder.voiceUrl}`);
    console.log(`   Local: ${localPath}`);

    const downloadResult = await FileSystem.downloadAsync(reminder.voiceUrl, localPath);

    if (downloadResult.status === 200) {
      console.log(`✅ Voice downloaded: ${localFileName}`);
      // Save the local path for this prescription
      await saveVoiceMessagePath(reminder.prescriptionId, localPath);
      return localPath;
    } else {
      console.error(`❌ Failed to download voice: HTTP ${downloadResult.status}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error downloading voice for ${reminder.medicationName}:`, error);
    return null;
  }
}

async function downloadVoiceMessage(
  reminder: LocalReminder,
  options?: { force?: boolean; existingPath?: string | null }
): Promise<{ path: string | null; downloaded: boolean }> {
  if (!reminder.voiceUrl) {
    console.log(`No voice URL for ${reminder.medicationName}`);
    return { path: null, downloaded: false };
  }

  try {
    await ensureVoiceMessagesDir();

    const extension = resolveVoiceExtension(reminder);
    const localFileName = `${reminder.prescriptionId}.${extension}`;
    const localPath = `${VOICE_MESSAGES_DIR}${localFileName}`;

    const fileInfo = await FileSystem.getInfoAsync(localPath);
    if (fileInfo.exists && !options?.force) {
      console.log(`Voice already cached: ${localFileName}`);
      return { path: localPath, downloaded: false };
    }

    if (options?.force && (fileInfo.exists || options.existingPath)) {
      try {
        const toDelete = options.existingPath || localPath;
        const oldInfo = await FileSystem.getInfoAsync(toDelete);
        if (oldInfo.exists) {
          await FileSystem.deleteAsync(toDelete, { idempotent: true });
        }
      } catch (error) {
        console.warn('Failed to delete previous voice file:', error);
      }
    }

    console.log(`Downloading voice for ${reminder.medicationName}...`);
    console.log(`  URL: ${reminder.voiceUrl}`);
    console.log(`  Local: ${localPath}`);

    const downloadResult = await FileSystem.downloadAsync(reminder.voiceUrl, localPath);

    if (downloadResult.status === 200) {
      console.log(`Voice downloaded: ${localFileName}`);
      await saveVoiceMessagePath(reminder.prescriptionId, localPath);
      return { path: localPath, downloaded: true };
    }

    console.error(`Failed to download voice: HTTP ${downloadResult.status}`);
    return { path: null, downloaded: false };
  } catch (error) {
    console.error(`Error downloading voice for ${reminder.medicationName}:`, error);
    return { path: null, downloaded: false };
  }
}

async function ensureVoiceMessage(
  reminder: LocalReminder,
  existing?: StoredReminderV2
): Promise<{ path: string | null; downloaded: boolean }> {
  if (!reminder.voiceUrl) {
    if (existing?.voice?.localPath) {
      try {
        console.log(`Removing cached voice for prescription ${existing.prescriptionId || 'unknown'}`);
        const info = await FileSystem.getInfoAsync(existing.voice.localPath);
        if (info.exists) {
          await FileSystem.deleteAsync(existing.voice.localPath, { idempotent: true });
        }
      } catch (error) {
        console.warn('Failed to remove unused voice file:', error);
      }
    }
    if (existing?.prescriptionId) {
      await removeVoiceMessagePath(existing.prescriptionId);
    }
    return { path: null, downloaded: false };
  }

  const existingVoice = existing?.voice;
  const voiceMatches =
    existingVoice?.voiceUrl === reminder.voiceUrl &&
    existingVoice?.voiceFileName === reminder.voiceFileName &&
    (existingVoice?.voiceChecksum || null) === (reminder.voiceChecksum || null) &&
    (existingVoice?.voiceVersion || null) === (reminder.voiceVersion || null) &&
    (existingVoice?.voiceFormat || null) === (reminder.voiceFormat || null);

  if (!voiceMatches && existingVoice?.localPath) {
    console.log(`Voice changed for reminder ${reminder.reminderId}, refreshing cache`);
  }

  const result = await downloadVoiceMessage(reminder, {
    force: !voiceMatches,
    existingPath: existingVoice?.localPath || null,
  });

  if (voiceMatches && !result.path && existingVoice?.localPath) {
    const info = await FileSystem.getInfoAsync(existingVoice.localPath);
    if (info.exists) {
      return { path: existingVoice.localPath, downloaded: false };
    }
  }

  return result;
}

function buildStoredRecord(
  reminder: LocalReminder,
  schedule: ScheduleResult,
  fingerprint: string,
  voicePath: string | null
): StoredReminderV2 {
  return {
    reminderId: reminder.reminderId,
    prescriptionId: reminder.prescriptionId,
    patientId: reminder.patientId,
    scheduledFor: reminder.scheduledFor,
    medicationName: reminder.medicationName,
    dosage: reminder.dosage,
    instructions: reminder.instructions,
    imageUrl: reminder.imageUrl,
    voice: {
      voiceUrl: reminder.voiceUrl || null,
      voiceFileName: reminder.voiceFileName || null,
      localPath: voicePath || null,
      voiceChecksum: reminder.voiceChecksum || null,
      voiceVersion: reminder.voiceVersion || null,
      voiceFormat: reminder.voiceFormat || null,
    },
    schedule,
    fingerprint,
    lastSyncedAt: new Date().toISOString(),
  };
}

async function cancelStoredSchedule(record: StoredReminderV2): Promise<void> {
  const alarmId = record.schedule.alarmId || record.reminderId;
  if (useNativeAlarms && alarmId) {
    try {
      await alarmService.cancelAlarm(alarmId);
    } catch (error) {
      console.error('Error cancelling native alarm:', error);
    }
  }

  const notificationIds = record.schedule.notificationIds || [];
  for (const notificationId of notificationIds) {
    if (!notificationId) continue;
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.warn('Error cancelling scheduled notification:', error);
    }
  }
}

async function cancelOrphanedNotifications(
  remoteIds: Set<string>,
  localMap: Record<string, StoredReminderV2>
): Promise<number> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    let cancelled = 0;
    for (const request of scheduled) {
      const data = (request.content?.data || {}) as { reminderId?: string; type?: string };
      const reminderId = data.reminderId;
      if (!reminderId) continue;
      if (data.type && data.type !== 'medication_reminder') continue;

      const local = localMap[reminderId];
      const allowedIds = new Set(local?.schedule.notificationIds || []);

      if (!remoteIds.has(reminderId)) {
        await Notifications.cancelScheduledNotificationAsync(request.identifier);
        cancelled++;
        continue;
      }

      if (!local || local.schedule.platform === 'android_native') {
        await Notifications.cancelScheduledNotificationAsync(request.identifier);
        cancelled++;
        continue;
      }

      if (!allowedIds.has(request.identifier)) {
        await Notifications.cancelScheduledNotificationAsync(request.identifier);
        cancelled++;
      }
    }
    return cancelled;
  } catch (error) {
    console.error('Error cancelling orphaned notifications:', error);
    return 0;
  }
}

async function cleanupLegacyReminders(
  remoteIds: Set<string>,
  localMap: Record<string, StoredReminderV2>
): Promise<number> {
  const legacy = await loadRemindersV1();
  let cleaned = 0;

  for (const [reminderId, legacyRecord] of Object.entries(legacy)) {
    const record = localMap[reminderId];
    const allowedIds = new Set<string>();

    if (record?.schedule?.platform === 'android_native') {
      allowedIds.add(record.schedule.alarmId || reminderId);
    }

    if (record?.schedule?.notificationIds) {
      for (const id of record.schedule.notificationIds) {
        if (id) {
          allowedIds.add(id);
        }
      }
    }

    const legacyId = legacyRecord.notificationId;
    const isRemoteMissing = !remoteIds.has(reminderId);
    const isDuplicate = legacyId && !allowedIds.has(legacyId);

    if (isRemoteMissing || isDuplicate) {
      const reason = isRemoteMissing ? 'missing_remote' : 'duplicate_local';
      console.log(`Cleaning legacy reminder ${reminderId} (${reason})`);
      try {
        if (legacyId) {
          await Notifications.cancelScheduledNotificationAsync(legacyId);
        }
      } catch (error) {
        console.warn('Error cancelling legacy notification:', error);
      }

      if (useNativeAlarms && legacyId) {
        try {
          await alarmService.cancelAlarm(legacyId);
        } catch (error) {
          console.warn('Error cancelling legacy alarm:', error);
        }
      }

      delete legacy[reminderId];
      cleaned++;
    }
  }

  if (cleaned > 0) {
    await persistRemindersV1(legacy);
  }

  return cleaned;
}

async function cleanupVoiceCache(reminders: Record<string, StoredReminderV2>): Promise<number> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.VOICE_MESSAGES);
    if (!stored) {
      return 0;
    }

    const voiceMessages = JSON.parse(stored) as Record<string, string>;
    const usedPrescriptions = new Set<string>();
    Object.values(reminders).forEach(record => {
      if (record.prescriptionId && record.voice?.localPath) {
        usedPrescriptions.add(record.prescriptionId);
      }
    });

    let removed = 0;
    for (const [prescriptionId, localPath] of Object.entries(voiceMessages)) {
      if (!usedPrescriptions.has(prescriptionId)) {
        console.log(`Removing unused voice cache for prescription ${prescriptionId}`);
        try {
          const info = await FileSystem.getInfoAsync(localPath);
          if (info.exists) {
            await FileSystem.deleteAsync(localPath, { idempotent: true });
          }
        } catch (error) {
          console.warn('Error deleting unused voice file:', error);
        }
        delete voiceMessages[prescriptionId];
        removed++;
      }
    }

    if (removed > 0) {
      await AsyncStorage.setItem(STORAGE_KEYS.VOICE_MESSAGES, JSON.stringify(voiceMessages));
    }

    return removed;
  } catch (error) {
    console.error('Error cleaning voice cache:', error);
    return 0;
  }
}

async function downloadAndScheduleRemindersLegacy(token: string): Promise<{ success: boolean; scheduled: number; audioDownloaded: number }> {
  try {
    console.log('🔄 Starting reminder sync...');

    const response = await apiService.getUpcomingReminders(token);
    const reminders = (response.data as LocalReminder[]) || [];

    console.log(`✅ Fetched ${reminders.length} upcoming reminders`);

    let audioDownloaded = 0;

    for (const reminder of reminders) {
      try {
        // First, download voice message if available
        if (reminder.voiceUrl) {
          const localAudioPath = await downloadVoiceMessageLegacy(reminder);
          if (localAudioPath) {
            audioDownloaded++;
          }
        }

        // Then schedule the reminder
        await scheduleReminderLegacy(reminder);
      } catch (error) {
        console.error(`❌ Error scheduling reminder ${reminder.reminderId}:`, error);
      }
    }

    await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());

    console.log(`📊 Sync complete: ${reminders.length} reminders, ${audioDownloaded} audio files`);

    return { success: true, scheduled: reminders.length, audioDownloaded };
  } catch (error) {
    console.error('❌ Error downloading and scheduling reminders:', error);
    throw error;
  }
}

export async function reconcileReminders(
  token: string,
  daysAhead: number = 30,
  options?: { force?: boolean; minIntervalMs?: number }
): Promise<{
  success: boolean;
  remoteCount: number;
  scheduled: number;
  updated: number;
  removed: number;
  audioDownloaded: number;
  cancelledNotifications: number;
}> {
  if (isReconciling) {
    console.log('Reminder reconcile already in progress, skipping');
    return {
      success: false,
      remoteCount: 0,
      scheduled: 0,
      updated: 0,
      removed: 0,
      audioDownloaded: 0,
      cancelledNotifications: 0,
    };
  }

  isReconciling = true;
  const syncState = await loadSyncState();
  const minIntervalMs = options?.minIntervalMs ?? DEFAULT_RECONCILE_MIN_INTERVAL_MS;
  if (!options?.force && syncState.lastFullReconcileAt) {
    const lastRunAt = new Date(syncState.lastFullReconcileAt).getTime();
    const elapsed = Date.now() - lastRunAt;
    if (!Number.isNaN(lastRunAt) && elapsed >= 0 && elapsed < minIntervalMs) {
      console.log(`Reminder reconcile skipped (last run ${elapsed}ms ago)`);
      isReconciling = false;
      return {
        success: true,
        remoteCount: 0,
        scheduled: 0,
        updated: 0,
        removed: 0,
        audioDownloaded: 0,
        cancelledNotifications: 0,
      };
    }
  }

  await persistSyncState({ ...syncState, inProgress: true });

  try {
    console.log('Starting reminder reconcile sync...');

    const response = await apiService.getUpcomingReminders(token, daysAhead);
    const reminders = (response.data as LocalReminder[]) || [];
    const remoteCount = reminders.length;
    const orderedReminders = [...reminders].sort((a, b) => {
      const aTime = new Date(a.scheduledFor).getTime();
      const bTime = new Date(b.scheduledFor).getTime();
      return aTime - bTime;
    });

    const localMap = await loadRemindersV2();
    console.log(`Reconcile snapshot: remote=${remoteCount}, local=${Object.keys(localMap).length}`);
    const remoteIds = new Set(orderedReminders.map(reminder => reminder.reminderId));
    const voiceByPrescription = new Map<string, StoredReminderV2>();
    let iosRemainingSlots = IOS_MAX_PENDING_NOTIFICATIONS;
    let iosRemainingCandidates = 0;
    const iosScheduledReminderIds = new Set<string>();
    const iosCandidateIds = new Set<string>();

    for (const record of Object.values(localMap)) {
      if (!record.prescriptionId) continue;
      if (record.voice?.voiceUrl || record.voice?.voiceFileName || record.voice?.localPath) {
        voiceByPrescription.set(record.prescriptionId, record);
      }
    }

    if (Platform.OS === 'ios') {
      try {
        const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
        iosRemainingSlots = Math.max(
          0,
          IOS_MAX_PENDING_NOTIFICATIONS - scheduledNotifications.length
        );
        for (const notification of scheduledNotifications) {
          const data = notification?.content?.data as any;
          const reminderId = data?.reminderId;
          if (reminderId) {
            iosScheduledReminderIds.add(String(reminderId));
          }
        }
        console.log(
          `iOS pending notifications: ${scheduledNotifications.length}/${IOS_MAX_PENDING_NOTIFICATIONS}`
        );
      } catch (error) {
        console.error('Failed to read iOS scheduled notifications:', error);
        iosRemainingSlots = IOS_MAX_PENDING_NOTIFICATIONS;
      }

      for (const reminder of orderedReminders) {
        const reminderId = reminder.reminderId;
        const existing = localMap[reminderId];
        const fingerprint = buildFingerprint(reminder);
        const needsSchedule =
          !existing ||
          existing.fingerprint !== fingerprint ||
          !iosScheduledReminderIds.has(reminderId);
        if (needsSchedule) {
          iosCandidateIds.add(reminderId);
        }
      }
      iosRemainingCandidates = iosCandidateIds.size;
    }

    let scheduled = 0;
    let updated = 0;
    let removed = 0;
    let audioDownloaded = 0;

    for (const reminderId of Object.keys(localMap)) {
      if (!remoteIds.has(reminderId)) {
        console.log(`Removing stale reminder ${reminderId}`);
        await cancelStoredSchedule(localMap[reminderId]);
        delete localMap[reminderId];
        removed++;
      }
    }

    let iosCapacityLogged = false;

    for (const remote of orderedReminders) {
      const reminderId = remote.reminderId;
      const fingerprint = buildFingerprint(remote);
      const existing = localMap[reminderId];
      const needsUpdate = !!existing && existing.fingerprint !== fingerprint;
      const needsReschedule =
        Platform.OS === 'ios' &&
        !!existing &&
        existing.fingerprint === fingerprint &&
        !iosScheduledReminderIds.has(reminderId);
      const isNew = !existing;

      if (!isNew && !needsUpdate && !needsReschedule) {
        continue;
      }

      if (Platform.OS === 'ios' && iosRemainingSlots <= 0) {
        if (!iosCapacityLogged) {
          console.warn('iOS notification limit reached; skipping additional reminders');
          iosCapacityLogged = true;
        }
        continue;
      }

      let iosRepeatCount: number | undefined;
      if (Platform.OS === 'ios') {
        if (iosRemainingCandidates <= 0 || iosRemainingSlots < iosRemainingCandidates) {
          iosRepeatCount = 1;
        } else {
          iosRepeatCount = Math.min(
            IOS_REPEAT_COUNT,
            Math.max(1, Math.floor(iosRemainingSlots / iosRemainingCandidates))
          );
        }
      }

      try {
        const cachedVoice =
          remote.voiceUrl && remote.prescriptionId
            ? voiceByPrescription.get(remote.prescriptionId)
            : undefined;
        const voiceResult = await ensureVoiceMessage(remote, existing || cachedVoice);
        if (voiceResult.downloaded) {
          audioDownloaded++;
        }

        if (isNew) {
          console.log(`Scheduling new reminder ${reminderId}`);
        } else if (needsUpdate) {
          console.log(`Updating reminder ${reminderId}`);
        } else {
          console.log(`Rescheduling missing reminder ${reminderId}`);
        }

        const schedule = await scheduleReminderInternal(remote, voiceResult.path, {
          iosRepeatCount,
          skipIOSCapacityCheck: Platform.OS === 'ios',
        });

        if (existing) {
          await cancelStoredSchedule(existing);
        }

        const record = buildStoredRecord(remote, schedule, fingerprint, voiceResult.path);
        localMap[reminderId] = record;
        if (record.prescriptionId) {
          voiceByPrescription.set(record.prescriptionId, record);
        }

        if (isNew) {
          scheduled++;
        } else {
          updated++;
        }

        if (Platform.OS === 'ios') {
          iosRemainingSlots = Math.max(
            0,
            iosRemainingSlots - (schedule.notificationIds?.length ?? 0)
          );
          if (iosRemainingCandidates > 0) {
            iosRemainingCandidates -= 1;
          }
        }
      } catch (error) {
        console.error(`Error scheduling reminder ${reminderId}:`, error);
      }
    }

    const cancelledNotifications = await cancelOrphanedNotifications(remoteIds, localMap);
    const cleanedLegacy = await cleanupLegacyReminders(remoteIds, localMap);
    const cleanedVoiceCache = await cleanupVoiceCache(localMap);

    await persistRemindersV2(localMap);
    const now = new Date().toISOString();
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, now);
    await persistSyncState({
      schemaVersion: 2,
      lastSyncAt: now,
      lastFullReconcileAt: now,
      inProgress: false,
    });

    console.log(
      `Reconcile complete: remote=${remoteCount}, added=${scheduled}, updated=${updated}, removed=${removed}, cancelledNotifications=${cancelledNotifications}, cleanedLegacy=${cleanedLegacy}, cleanedVoiceCache=${cleanedVoiceCache}`
    );

    return {
      success: true,
      remoteCount,
      scheduled,
      updated,
      removed,
      audioDownloaded,
      cancelledNotifications,
    };
  } catch (error) {
    console.error('Error during reminder reconcile:', error);
    await persistSyncState({ ...syncState, inProgress: false });
    return {
      success: false,
      remoteCount: 0,
      scheduled: 0,
      updated: 0,
      removed: 0,
      audioDownloaded: 0,
      cancelledNotifications: 0,
    };
  } finally {
    isReconciling = false;
  }
}

export async function downloadAndScheduleReminders(
  token: string,
  options?: { force?: boolean; minIntervalMs?: number }
): Promise<{ success: boolean; scheduled: number; audioDownloaded: number }> {
  const result = await reconcileReminders(token, 30, options);
  return {
    success: result.success,
    scheduled: result.remoteCount,
    audioDownloaded: result.audioDownloaded,
  };
}

async function scheduleReminderInternal(
  reminder: LocalReminder,
  audioPath: string | null,
  options?: { alarmIdOverride?: string; iosRepeatCount?: number; skipIOSCapacityCheck?: boolean }
): Promise<ScheduleResult> {
  const scheduledDate = new Date(reminder.scheduledFor);
  const alarmId = options?.alarmIdOverride || reminder.reminderId;

  if (useNativeAlarms) {
    try {
      const result = await alarmService.scheduleAlarm({
        alarmId,
        triggerTime: scheduledDate,
        medicationName: reminder.medicationName,
        dosage: reminder.dosage,
        instructions: reminder.instructions || '',
        reminderId: reminder.reminderId,
        patientId: reminder.patientId,
        audioPath: audioPath,
      });

      if (result.success) {
        return {
          platform: 'android_native',
          alarmId,
          scheduledAtMs: scheduledDate.getTime(),
        };
      }
    } catch (error) {
      console.error('Failed to schedule native alarm, falling back:', error);
    }
  }

  if (Platform.OS === 'ios') {
    const notificationIds: string[] = [];
    const soundName = await resolveIOSNotificationSoundName(reminder, audioPath);
    const now = Date.now();
    let baseTime = scheduledDate.getTime();
    if (baseTime <= now + 3000) {
      baseTime = now + 5000;
      console.log('iOS reminder time is in the past or too soon; scheduling immediate alert');
    }

    let repeatCount = options?.iosRepeatCount ?? IOS_REPEAT_COUNT;
    if (repeatCount <= 0) {
      throw new Error('iOS repeat count is zero; skipping reminder scheduling');
    }

    if (!options?.skipIOSCapacityCheck) {
      try {
        const pending = await Notifications.getAllScheduledNotificationsAsync();
        const availableSlots = IOS_MAX_PENDING_NOTIFICATIONS - pending.length;
        if (availableSlots <= 0) {
          console.warn('iOS notification limit reached; skipping reminder scheduling');
          throw new Error('iOS notification limit reached');
        }
        if (repeatCount > availableSlots) {
          console.log(
            `iOS repeat count capped from ${repeatCount} to ${availableSlots} to fit pending limit`
          );
          repeatCount = availableSlots;
        }
      } catch (error) {
        console.error('Failed to check iOS notification capacity:', error);
      }
    }

    for (let index = 0; index < repeatCount; index += 1) {
      const triggerDate = new Date(baseTime + index * IOS_REPEAT_INTERVAL_MS);
      try {
        const notificationId = await iOSAlarmService.scheduleMedicationReminder({
          reminderId: reminder.reminderId,
          medicationName: reminder.medicationName,
          dosage: reminder.dosage,
          instructions: reminder.instructions || '',
          scheduledTime: triggerDate,
          patientId: reminder.patientId,
          voicePath: audioPath,
          reminderTime: reminder.scheduledFor,
          soundName,
        });
        if (notificationId) {
          notificationIds.push(notificationId);
        }
      } catch (error) {
        console.error('Failed to schedule iOS reminder notification:', error);
      }
    }

    if (!notificationIds.length) {
      throw new Error('No iOS notifications scheduled for reminder');
    }

    return {
      platform: 'expo',
      notificationIds,
      scheduledAtMs: scheduledDate.getTime(),
    };
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: `ÐY'S ${reminder.medicationName}`,
      body: `Il est temps de prendre: ${reminder.dosage}`,
      data: {
        type: 'medication_reminder',
        reminderId: reminder.reminderId,
        medicationName: reminder.medicationName,
        dosage: reminder.dosage,
        patientId: reminder.patientId,
        reminderTime: reminder.scheduledFor,
        localVoicePath: audioPath || '',
      },
      categoryIdentifier: 'medication_reminder',
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    trigger: { type: 'date', date: scheduledDate } as any,
  });

  return {
    platform: 'expo',
    notificationIds: [notificationId],
    scheduledAtMs: scheduledDate.getTime(),
  };
}

async function scheduleReminderLegacy(reminder: LocalReminder): Promise<string> {
  const scheduledDate = new Date(reminder.scheduledFor);
  console.log(`⏰ Scheduling reminder for ${reminder.medicationName} at ${scheduledDate.toLocaleString()}`);

  // On Android, use native alarm service for full-screen alarm
  if (useNativeAlarms) {
    try {
      // Get the audio path for this reminder (voice message from doctor)
      const audioPath = await getVoiceMessagePath(reminder.prescriptionId);
      if (audioPath) {
        console.log(`🎵 Voice message found for ${reminder.medicationName}: ${audioPath}`);
      }

      const result = await alarmService.scheduleAlarm({
        alarmId: reminder.reminderId,
        triggerTime: scheduledDate,
        medicationName: reminder.medicationName,
        dosage: reminder.dosage,
        instructions: reminder.instructions || '',
        reminderId: reminder.reminderId,
        patientId: reminder.patientId,
        audioPath: audioPath,
      });

      await saveReminder(reminder.reminderId, {
        notificationId: reminder.reminderId,
        medicationName: reminder.medicationName,
        dosage: reminder.dosage,
      });

      console.log(`✅ Reminder scheduled via native alarm: ${result.alarmId}`);
      return result.alarmId;
    } catch (error) {
      console.error('❌ Failed to schedule native alarm, falling back to expo-notifications:', error);
      // Fall through to notification-based scheduling
    }
  }

  // Fallback: Use expo-notifications (iOS or if notifee fails)
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: `💊 ${reminder.medicationName}`,
      body: `Il est temps de prendre: ${reminder.dosage}`,
      data: {
        type: 'medication_reminder',
        reminderId: reminder.reminderId,
        medicationName: reminder.medicationName,
        dosage: reminder.dosage,
        patientId: reminder.patientId,
        reminderTime: reminder.scheduledFor,
        localVoicePath: '',
      },
      categoryIdentifier: 'medication_reminder',
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    trigger: { type: 'date', date: scheduledDate } as any,
  });

  await saveReminder(reminder.reminderId, {
    notificationId,
    medicationName: reminder.medicationName,
    dosage: reminder.dosage,
  });

  console.log(`✅ Reminder scheduled via Expo notifications, ID: ${notificationId}`);
  return notificationId;
}

export async function scheduleReminder(reminder: LocalReminder): Promise<string> {
  const reminders = await loadRemindersV2();
  const existing = reminders[reminder.reminderId];
  if (existing) {
    await cancelStoredSchedule(existing);
  }

  const voiceResult = await ensureVoiceMessage(reminder, existing);
  const schedule = await scheduleReminderInternal(reminder, voiceResult.path);
  const fingerprint = buildFingerprint(reminder);
  const record = buildStoredRecord(reminder, schedule, fingerprint, voiceResult.path);

  reminders[reminder.reminderId] = record;
  await persistRemindersV2(reminders);

  if (schedule.platform === 'android_native') {
    return schedule.alarmId || reminder.reminderId;
  }
  return schedule.notificationIds?.[0] || reminder.reminderId;
}

// Helper function to get voice message path for a prescription
async function getVoiceMessagePath(prescriptionId: string): Promise<string | null> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.VOICE_MESSAGES);
    if (stored) {
      const voiceMessages = JSON.parse(stored);
      return voiceMessages[prescriptionId] || null;
    }
    return null;
  } catch (error) {
    console.error('Error getting voice message path:', error);
    return null;
  }
}

// Save voice message path for a prescription
export async function saveVoiceMessagePath(prescriptionId: string, localPath: string): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.VOICE_MESSAGES);
    const voiceMessages = stored ? JSON.parse(stored) : {};
    voiceMessages[prescriptionId] = localPath;
    await AsyncStorage.setItem(STORAGE_KEYS.VOICE_MESSAGES, JSON.stringify(voiceMessages));
    console.log(`✅ Voice message path saved for prescription ${prescriptionId}`);
  } catch (error) {
    console.error('Error saving voice message path:', error);
  }
}

async function removeVoiceMessagePath(prescriptionId: string): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.VOICE_MESSAGES);
    if (!stored) return;
    const voiceMessages = JSON.parse(stored) as Record<string, string>;
    if (voiceMessages[prescriptionId]) {
      delete voiceMessages[prescriptionId];
      await AsyncStorage.setItem(STORAGE_KEYS.VOICE_MESSAGES, JSON.stringify(voiceMessages));
    }
  } catch (error) {
    console.error('Error removing voice message path:', error);
  }
}

export async function checkForUpdates(token: string): Promise<{ hasUpdates: boolean; lastModified: string | null }> {
  try {
    console.log('🔄 Checking for updates...');

    const response = await apiService.getUpcomingReminders(token);
    const reminders = (response.data as LocalReminder[]) || [];

    console.log(`✅ Found ${reminders.length} reminders`);

    return { hasUpdates: reminders.length > 0, lastModified: new Date().toISOString() };
  } catch (error) {
    console.error('❌ Error checking for updates:', error);
    return { hasUpdates: false, lastModified: null };
  }
}


export async function getLastSyncTime(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
  } catch (error) {
    console.error('Error getting last sync time:', error);
    return null;
  }
}

export async function cancelPendingNotifications(reminderId: string): Promise<void> {
  try {
    const reminders = await loadRemindersV2();
    const stored = reminders[reminderId];

    if (stored) {
      await cancelStoredSchedule(stored);
      if (stored.schedule.platform === 'expo') {
        stored.schedule = {
          ...stored.schedule,
          notificationIds: [],
        };
        reminders[reminderId] = stored;
        await persistRemindersV2(reminders);
      }
      return;
    }

    const legacyReminders = await loadRemindersV1();
    const legacyStored = legacyReminders[reminderId];
    if (legacyStored?.notificationId) {
      try {
        await Notifications.cancelScheduledNotificationAsync(legacyStored.notificationId);
      } catch (error) {
        console.warn('Error cancelling legacy notification:', error);
      }
    }
  } catch (error) {
    console.error('Error cancelling pending notifications:', error);
  }
}

export async function confirmReminderLocally(reminderId: string): Promise<void> {
  console.log(`✅ Confirming reminder locally: ${reminderId}`);

  const reminders = await loadRemindersV2();
  const stored = reminders[reminderId];

  if (stored) {
    await cancelStoredSchedule(stored);
    delete reminders[reminderId];
    await persistRemindersV2(reminders);
  }

  const legacyReminders = await loadRemindersV1();
  if (legacyReminders[reminderId]) {
    delete legacyReminders[reminderId];
    await persistRemindersV1(legacyReminders);
  }

  const confirmations = await AsyncStorage.getItem('@medication_confirmations').then(value => value || '[]');
  const list = JSON.parse(confirmations) as Array<{ reminderId: string; confirmedAt: string }>;
  const alreadyConfirmed = list.some(entry => entry.reminderId === reminderId);
  if (!alreadyConfirmed) {
    list.push({
      reminderId,
      confirmedAt: new Date().toISOString(),
    });
    await AsyncStorage.setItem('@medication_confirmations', JSON.stringify(list));
  }
}


async function snoozeReminderLocallyLegacy(reminderId: string): Promise<void> {
  console.log(`⏰ Snoozing reminder locally: ${reminderId}`);

  const reminders = await loadReminders();
  const stored = reminders[reminderId];

  if (stored) {
    // Cancel current alarm/notification
    if (useNativeAlarms) {
      try {
        await alarmService.cancelAlarm(reminderId);
      } catch (error) {
        console.error('Error cancelling native alarm:', error);
      }
    }
    await Notifications.cancelScheduledNotificationAsync(stored.notificationId);

    // Schedule snooze for 5 minutes
    const snoozeTime = new Date(Date.now() + 5 * 60 * 1000);

    if (useNativeAlarms) {
      try {
        const snoozeAlarmId = `${reminderId}_snooze_${Date.now()}`;
        await alarmService.scheduleAlarm({
          alarmId: snoozeAlarmId,
          triggerTime: snoozeTime,
          medicationName: stored.medicationName,
          dosage: stored.dosage,
          instructions: 'Rappel (Snooze)',
          reminderId: reminderId,
          patientId: '',
        });

        reminders[reminderId] = {
          notificationId: snoozeAlarmId,
          medicationName: stored.medicationName,
          dosage: stored.dosage,
        };

        await persistReminders(reminders);
        console.log(`✅ Snooze alarm scheduled for 5 minutes`);
        return;
      } catch (error) {
        console.error('Error scheduling snooze alarm, falling back to notification:', error);
      }
    }

    // Fallback: Use expo-notifications
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Rappel Médicament (Snooze)',
        body: `Rappel dans 5 minutes pour ${stored.medicationName}`,
        data: {
          type: 'medication_reminder',
          reminderId,
          medicationName: stored.medicationName,
          dosage: stored.dosage,
          reminderTime: snoozeTime.toISOString(),
        },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: { type: 'date', date: snoozeTime } as any,
    });

    reminders[reminderId] = {
      notificationId,
      medicationName: stored.medicationName,
      dosage: stored.dosage,
    };

    await persistReminders(reminders);
  }
}


export async function snoozeReminderLocally(reminderId: string): Promise<void> {
  console.log(`Snoozing reminder locally: ${reminderId}`);

  const reminders = await loadRemindersV2();
  let stored = reminders[reminderId];

  if (!stored) {
    const legacyReminders = await loadRemindersV1();
    const legacyStored = legacyReminders[reminderId];
    if (legacyStored) {
      stored = buildLegacyRecord(reminderId, legacyStored);
    }
  }

  if (!stored) {
    return;
  }

  await cancelStoredSchedule(stored);

  const snoozeTime = new Date(Date.now() + 5 * 60 * 1000);
  const snoozeReminder: LocalReminder = {
    id: reminderId,
    reminderId,
    prescriptionId: stored.prescriptionId,
    medicationName: stored.medicationName,
    dosage: stored.dosage,
    instructions: stored.instructions,
    imageUrl: stored.imageUrl,
    scheduledFor: snoozeTime.toISOString(),
    patientId: stored.patientId,
    voiceUrl: stored.voice?.voiceUrl || null,
    voiceFileName: stored.voice?.voiceFileName || null,
    voiceChecksum: stored.voice?.voiceChecksum || null,
    voiceVersion: stored.voice?.voiceVersion || null,
    voiceFormat: stored.voice?.voiceFormat || null,
    voiceTitle: undefined,
    voiceDuration: undefined,
  };

  const voiceResult = await ensureVoiceMessage(snoozeReminder, stored);
  const snoozeAlarmId = `${reminderId}_snooze_${Date.now()}`;
  const schedule = await scheduleReminderInternal(snoozeReminder, voiceResult.path, {
    alarmIdOverride: snoozeAlarmId,
  });

  reminders[reminderId] = {
    ...stored,
    schedule,
    lastSyncedAt: new Date().toISOString(),
  };
  await persistRemindersV2(reminders);

  const legacyReminders = await loadRemindersV1();
  if (legacyReminders[reminderId]) {
    legacyReminders[reminderId] = {
      ...legacyReminders[reminderId],
      notificationId:
        schedule.platform === 'expo'
          ? schedule.notificationIds?.[0] || legacyReminders[reminderId].notificationId
          : schedule.alarmId || legacyReminders[reminderId].notificationId,
    };
    await persistRemindersV1(legacyReminders);
  }
}

export async function clearAllLocalReminders(): Promise<void> {
  console.log('Clearing all local reminders...');

  try {
    const remindersV2 = await loadRemindersV2();
    const remindersV1 = await loadRemindersV1();
    if (useNativeAlarms) {
      const alarmIds = new Set<string>();
      Object.entries(remindersV2).forEach(([reminderId, stored]) => {
        alarmIds.add(reminderId);
        if (stored?.schedule?.alarmId) {
          alarmIds.add(stored.schedule.alarmId);
        }
      });

      Object.entries(remindersV1).forEach(([reminderId, stored]) => {
        alarmIds.add(reminderId);
        if (stored?.notificationId) {
          alarmIds.add(stored.notificationId);
        }
      });

      for (const alarmId of alarmIds) {
        try {
          await alarmService.cancelAlarm(alarmId);
        } catch (error) {
          console.error('Error cancelling native alarm:', error);
        }
      }

      try {
        await alarmService.stopAlarm();
      } catch (error) {
        console.error('Error stopping active alarm:', error);
      }

      try {
        await alarmService.clearPendingConfirmations();
      } catch (error) {
        console.error('Error clearing pending confirmations:', error);
      }
    }
  } catch (error) {
    console.error('Error clearing native alarms:', error);
  }

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error cancelling scheduled notifications:', error);
  }

  try {
    await Notifications.dismissAllNotificationsAsync();
  } catch (error) {
    console.error('Error dismissing notifications:', error);
  }

  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.REMINDERS_V1,
      STORAGE_KEYS.REMINDERS_V2,
      STORAGE_KEYS.SYNC_STATE,
      STORAGE_KEYS.MIGRATION_V1_DONE,
      STORAGE_KEYS.LAST_SYNC,
      STORAGE_KEYS.VOICE_MESSAGES,
      '@medication_confirmations',
      '@patient_dashboard_refresh',
    ]);
  } catch (error) {
    console.error('Error clearing reminder storage:', error);
  }

  try {
    const dirInfo = await FileSystem.getInfoAsync(VOICE_MESSAGES_DIR);
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(VOICE_MESSAGES_DIR, { idempotent: true });
    }
  } catch (error) {
    console.error('Error clearing voice message cache:', error);
  }

  console.log('All local reminders cleared');
}


export async function getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('❌ Error getting scheduled notifications:', error);
    return [];
  }
}


export function isAvailable(): boolean {
  return true;
}



async function loadReminders(): Promise<Record<string, StoredReminderV1>> {
  const stored = await AsyncStorage.getItem(STORAGE_KEYS.REMINDERS_V1);
  if (!stored) {
    return {};
  }

  try {
    return JSON.parse(stored) as Record<string, StoredReminderV1>;
  } catch (error) {
    console.warn('⚠️ Failed to parse stored reminders, resetting state', error);
    return {};
  }
}

async function persistReminders(reminders: Record<string, StoredReminderV1>): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.REMINDERS_V1, JSON.stringify(reminders));
}

async function saveReminder(reminderId: string, reminder: StoredReminderV1): Promise<void> {
  const reminders = await loadReminders();
  reminders[reminderId] = reminder;
  await persistReminders(reminders);
}


const localReminderServiceCompat = {
  reconcileReminders,
  downloadAndScheduleReminders,
  scheduleReminder,
  checkForUpdates,
  getLastSyncTime,
  cancelPendingNotifications,
  confirmReminderLocally,
  snoozeReminderLocally,
  clearAllLocalReminders,
  getAllScheduledNotifications,
  isAvailable,
  saveVoiceMessagePath,
};

export default localReminderServiceCompat;
