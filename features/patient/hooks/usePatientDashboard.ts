import { useState, useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPatientMedicationsByDate, confirmMedicationTaken } from '../../../shared/services/api/patient';
import { registerPushToken } from '../../../shared/services/api/auth';
import { notificationService } from '../../../shared/services/notificationService';
import { offlineQueueService } from '../../../shared/services/offlineQueueService';
import { DashboardStats, Medication } from '../../../shared/types';
import { useAuthToken } from '../../../shared/hooks/useAuthToken';
import { useTranslation } from 'react-i18next';
import { performLogout } from '../../../shared/utils/logout';

const STORAGE_KEYS = {
  MEDICATIONS_BY_DATE: '@patient_medications_by_date',
  STATS_BY_DATE: '@patient_medication_stats_by_date',
};

const PREFETCH_DAYS_AHEAD = 30;

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getMedicationsCacheKey = (dateKey: string) => `${STORAGE_KEYS.MEDICATIONS_BY_DATE}:${dateKey}`;
const getStatsCacheKey = (dateKey: string) => `${STORAGE_KEYS.STATS_BY_DATE}:${dateKey}`;

export function usePatientDashboard() {
  const router = useRouter();
  const { t } = useTranslation();
  const { token, isLoading: isTokenLoading } = useAuthToken();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [medications, setMedications] = useState<Medication[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalMedicationsToday: 0,
    takenToday: 0,
    adherenceRate: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [hasUpdates, setHasUpdates] = useState(false);
  const [hasCheckedInitialSync, setHasCheckedInitialSync] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const refreshTokenRef = useRef<string | null>(null);
  const prefetchingRef = useRef(false);
  const lastAutoSyncRef = useRef<number>(0);

  const loadCachedMedications = useCallback(async (dateKey: string) => {
    try {
      const [medsEntry, statsEntry] = await AsyncStorage.multiGet([
        getMedicationsCacheKey(dateKey),
        getStatsCacheKey(dateKey),
      ]);

      const medsJson = medsEntry?.[1];
      if (!medsJson) {
        return null;
      }

      const meds = JSON.parse(medsJson) as Medication[];
      let stats: DashboardStats | null = null;

      if (statsEntry?.[1]) {
        stats = JSON.parse(statsEntry[1]) as DashboardStats;
      } else {
        const total = meds.length;
        const taken = meds.filter(m => m.status === 'taken').length;
        const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 0;
        stats = {
          totalMedicationsToday: total,
          takenToday: taken,
          adherenceRate,
        };
      }

      return { meds, stats };
    } catch (error) {
      console.error('Error loading cached medications:', error);
      return null;
    }
  }, []);

  const saveCachedMedications = useCallback(
    async (dateKey: string, meds: Medication[], stats: DashboardStats) => {
      try {
        await AsyncStorage.multiSet([
          [getMedicationsCacheKey(dateKey), JSON.stringify(meds)],
          [getStatsCacheKey(dateKey), JSON.stringify(stats)],
        ]);
      } catch (error) {
        console.error('Error saving cached medications:', error);
      }
    },
    []
  );

  const applyLocalConfirmations = useCallback(async (meds: Medication[], stats?: DashboardStats) => {
    try {
      const confirmationsJson = await AsyncStorage.getItem('@medication_confirmations');
      const confirmations = confirmationsJson ? (JSON.parse(confirmationsJson) as Array<{ reminderId: string }>) : [];
      const queue = await offlineQueueService.getQueue();
      const pendingQueue = queue.filter(action => !action.synced && action.type === 'confirm');
      const confirmedIds = new Set<string>();

      confirmations.forEach(entry => {
        if (entry.reminderId) {
          confirmedIds.add(entry.reminderId);
        }
      });
      pendingQueue.forEach(entry => {
        if (entry.reminderId) {
          confirmedIds.add(entry.reminderId);
        }
      });

      if (!confirmedIds.size) {
        if (stats) {
          return { meds, stats };
        }
        const total = meds.length;
        const taken = meds.filter(m => m.status === 'taken').length;
        const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 0;
        return { meds, stats: { totalMedicationsToday: total, takenToday: taken, adherenceRate } };
      }

      const updatedMeds = meds.map(med =>
        confirmedIds.has(med.reminderId) ? { ...med, status: 'taken' } : med
      );

      const total = updatedMeds.length;
      const taken = updatedMeds.filter(m => m.status === 'taken').length;
      const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 0;

      return {
        meds: updatedMeds,
        stats: { totalMedicationsToday: total, takenToday: taken, adherenceRate },
      };
    } catch (error) {
      console.error('Error applying local confirmations:', error);
      if (stats) {
        return { meds, stats };
      }
      const total = meds.length;
      const taken = meds.filter(m => m.status === 'taken').length;
      const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 0;
      return { meds, stats: { totalMedicationsToday: total, takenToday: taken, adherenceRate } };
    }
  }, []);

  const loadMedicationsForDate = useCallback(async (date: Date) => {
    if (isTokenLoading) {
      return;
    }
    
    try {
      if (!token) {
        router.push('/(auth)/login' as any);
        return;
      }

      const dateKey = formatDateKey(date);

      if (!isOnline) {
        const cached = await loadCachedMedications(dateKey);
        if (cached) {
          const applied = await applyLocalConfirmations(cached.meds, cached.stats);
          setMedications(applied.meds);
          setStats(applied.stats);
        } else {
          setMedications([]);
        }
        return;
      }

      const pushToken = notificationService.getPushToken();
      if (pushToken) {
        try {
          await registerPushToken(token, pushToken);
        } catch (error) {
          console.error('❌ Failed to register push token:', error);
        }
      }

      const result = await getPatientMedicationsByDate(token, dateKey);
      
      if (result.success && result.data) {
        const data = result.data as any;
        const meds = data.medications || [];
        const newStats = {
          totalMedicationsToday: data.total || 0,
          takenToday: data.taken || 0,
          adherenceRate: data.adherenceRate || 0,
        };
        const applied = await applyLocalConfirmations(meds, newStats);
        setMedications(applied.meds);
        setStats(applied.stats);
        await saveCachedMedications(dateKey, applied.meds, applied.stats);
      } else {
        setMedications([]);
      }
    } catch (error: any) {
      console.error('Error loading medications:', error);
      const dateKey = formatDateKey(date);
      const cached = await loadCachedMedications(dateKey);
      if (cached) {
        setMedications(cached.meds);
        setStats(cached.stats);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [token, isTokenLoading, router, isOnline, loadCachedMedications, saveCachedMedications]);

  const prefetchFutureDates = useCallback(async () => {
    if (!token || !isOnline || prefetchingRef.current) {
      return;
    }

    prefetchingRef.current = true;

    try {
      const today = new Date();

      for (let offset = 1; offset <= PREFETCH_DAYS_AHEAD; offset += 1) {
        if (!isOnline) {
          break;
        }

        const date = new Date(today);
        date.setDate(today.getDate() + offset);
        const dateKey = formatDateKey(date);

        const result = await getPatientMedicationsByDate(token, dateKey);

        if (result.success && result.data) {
          const data = result.data as any;
          const meds = data.medications || [];
          const total = typeof data.total === 'number' ? data.total : meds.length;
          const taken = typeof data.taken === 'number' ? data.taken : meds.filter(m => m.status === 'taken').length;
          const adherenceRate =
            typeof data.adherenceRate === 'number'
              ? data.adherenceRate
              : total > 0
                ? Math.round((taken / total) * 100)
                : 0;

          await saveCachedMedications(dateKey, meds, {
            totalMedicationsToday: total,
            takenToday: taken,
            adherenceRate,
          });
        }
      }
    } catch (error) {
      console.error('Error prefetching future medications:', error);
    } finally {
      prefetchingRef.current = false;
    }
  }, [token, isOnline, saveCachedMedications]);

  const syncReminders = useCallback(async (silent: boolean = false) => {
    if (!token || isSyncing) return;

    try {
      setIsSyncing(true);
      console.log('🔄 Starting reminder sync...');

      const { default: localReminderService } = await import('../../../shared/services/localReminderService');
      const result = await localReminderService.downloadAndScheduleReminders(token, {
        force: !silent,
      });

      if (result.success) {
        // Only show modal if not silent (manual sync)
        if (!silent) {
          // Show audio download count if any were downloaded
          const audioInfo = result.audioDownloaded > 0
            ? `\n🎤 ${result.audioDownloaded} messages vocaux téléchargés`
            : '';
          console.log(`✅ Sync complete: ${result.scheduled} reminders, ${result.audioDownloaded} audio files`);
        } else {
          console.log(`✅ Silent sync complete: ${result.scheduled} reminders, ${result.audioDownloaded} audio files`);
        }

        // Update last sync time
        const syncTime = await localReminderService.getLastSyncTime();
        setLastSyncTime(syncTime);
        setHasUpdates(false);

        if (isOnline) {
          await loadMedicationsForDate(selectedDate);
          await prefetchFutureDates();
        }
      }
    } catch (error) {
      console.error('Error syncing reminders:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [token, isSyncing, isOnline, loadMedicationsForDate, prefetchFutureDates, selectedDate]);

  // Check for updates - only when viewing today's date
  const checkForUpdates = useCallback(async (): Promise<boolean> => {
    if (!token) return;
    
    // Only check for updates when viewing today's date, not when browsing past/future dates
    const viewingToday = isToday(selectedDate);
    if (!viewingToday) {
      setHasUpdates(false); // Clear updates flag when viewing other dates
      return false;
    }

    try {
      const { default: localReminderService } = await import('../../../shared/services/localReminderService');
      const apiService = await import('../../../shared/services/api/patient');
      
      // Use proper API endpoint with lastSyncTime to detect actual updates
      const lastSync = await localReminderService.getLastSyncTime();
      const result = await apiService.checkForUpdates(token, lastSync || undefined);
      
      // Only show updates if backend confirms there are actual new reminders
      if (result.success && result.data) {
        const hasActualUpdates = (result.data as any)?.hasUpdates === true;
        setHasUpdates(hasActualUpdates);
        if (hasActualUpdates) {
          console.log('⚠️ Actual updates available from backend');
        } else {
          console.log('✅ No updates available');
        }
        return hasActualUpdates;
      } else {
        setHasUpdates(false);
        return false;
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
      setHasUpdates(false);
      return false;
    }
  }, [token, selectedDate]);

  const loadLastSyncTime = useCallback(async () => {
    try {
      const { default: localReminderService } = await import('../../../shared/services/localReminderService');
      const syncTime = await localReminderService.getLastSyncTime();
      setLastSyncTime(syncTime);
    } catch (error) {
      console.error('Error loading last sync time:', error);
    }
  }, []);

  const handleMarkAsTaken = useCallback(async (reminderId: string) => {
    if (!token) return;

    try {
      if (!isOnline) {
        const { offlineQueueService } = await import('../../../shared/services/offlineQueueService');
        const { default: localReminderService } = await import('../../../shared/services/localReminderService');
        await offlineQueueService.addAction('confirm', reminderId);
        await localReminderService.confirmReminderLocally(reminderId);

        const dateKey = formatDateKey(selectedDate);
        let updatedMedications: Medication[] = [];
        setMedications(prev => {
          updatedMedications = prev.map(m =>
            m.reminderId === reminderId ? { ...m, status: 'taken' } : m
          );
          return updatedMedications;
        });

        const total = updatedMedications.length;
        const taken = updatedMedications.filter(m => m.status === 'taken').length;
        const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 0;
        const newStats = { totalMedicationsToday: total, takenToday: taken, adherenceRate };
        setStats(newStats);
        await saveCachedMedications(dateKey, updatedMedications, newStats);

        return { success: true, message: t('dashboard.patient.medicationMarked') };
      }

      const result = await confirmMedicationTaken(token, [reminderId]);
      
      if (result.success) {
        await loadMedicationsForDate(selectedDate);
        return { success: true, message: t('dashboard.patient.medicationMarked') };
      } else {
        return { success: false, message: result.message || t('dashboard.patient.markMedicationError') };
      }
    } catch (error: any) {
      console.error('Error marking medication:', error);
      const errorMessage = error?.message || t('dashboard.patient.markMedicationError');
      return { success: false, message: errorMessage };
    }
  }, [token, selectedDate, loadMedicationsForDate, t, isOnline, saveCachedMedications]);

  const handleLogout = useCallback(async () => {
    await performLogout(() => {
      router.replace('/(auth)/login' as any);
    });
  }, [router]);

  // Helper function to check if date is today
  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active' && !isTokenLoading) {
        setTimeout(async () => {
          try {
            const refreshToken = await AsyncStorage.getItem('@patient_dashboard_refresh');
            if (refreshToken && refreshToken !== refreshTokenRef.current) {
              refreshTokenRef.current = refreshToken;
            }
          } catch (error) {
            console.error('Error checking dashboard refresh flag:', error);
          }
          loadMedicationsForDate(selectedDate);
        }, 300);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [selectedDate, isTokenLoading, loadMedicationsForDate]);

  useEffect(() => {
    if (!token || isTokenLoading) return;
    let isMounted = true;
    const interval = setInterval(async () => {
      if (!isMounted || !isOnline || isSyncing) return;
      const viewingToday = isToday(selectedDate);
      if (!viewingToday) return;

      const hasActualUpdates = await checkForUpdates();
      if (hasActualUpdates) {
        const now = Date.now();
        if (now - lastAutoSyncRef.current >= 30000) {
          lastAutoSyncRef.current = now;
          await syncReminders(true);
        }
      }
    }, 60000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [token, isTokenLoading, isOnline, isSyncing, selectedDate, checkForUpdates, syncReminders]);

  // Automatic sync when app opens (runs once when token is available)
  useEffect(() => {
    const doAutomaticSync = async () => {
      if (token && !hasCheckedInitialSync && !isSyncing) {
        setHasCheckedInitialSync(true); // Prevent running again
        
        try {
          console.log('📱 App opened - automatically syncing reminders with audio...');
          // Always sync automatically when app opens (silent mode - doesn't show modal)
          await syncReminders(true); // true = silent mode
          console.log('✅ Automatic sync completed');
        } catch (error) {
          console.error('Error during automatic sync:', error);
        }
      }
    };
    
    // Small delay to let UI render first
    const timer = setTimeout(doAutomaticSync, 1000);
    return () => clearTimeout(timer);
  }, [token, hasCheckedInitialSync, isSyncing, syncReminders]);

  useEffect(() => {
    let isMounted = true;
    let interval: ReturnType<typeof setInterval> | null = null;
    let removeListener: (() => void) | null = null;

    const setupNetworkMonitoring = async () => {
      const { networkMonitor } = await import('../../../shared/services/networkMonitor');
      const { offlineQueueService } = await import('../../../shared/services/offlineQueueService');

      if (!isMounted) {
        return;
      }

      const handleNetworkChange = async (online: boolean) => {
        if (!isMounted) return;
        setIsOnline(online);

        if (online && token) {
          await offlineQueueService.syncQueue(token);
          const count = await offlineQueueService.getPendingCount();
          if (isMounted) {
            setPendingSyncCount(count);
          }
        }
      };

      networkMonitor.addListener(handleNetworkChange);
      removeListener = () => networkMonitor.removeListener(handleNetworkChange);

      const updatePendingCount = async () => {
        const count = await offlineQueueService.getPendingCount();
        if (isMounted) {
          setPendingSyncCount(count);
        }
      };

      await updatePendingCount();
      interval = setInterval(updatePendingCount, 10000);
    };

    setupNetworkMonitoring();

    return () => {
      isMounted = false;
      if (interval) {
        clearInterval(interval);
      }
      if (removeListener) {
        removeListener();
      }
    };
  }, [token]);

  return {
    selectedDate,
    setSelectedDate,
    medications,
    stats,
    isLoading,
    isRefreshing,
    setIsRefreshing,
    currentTime,
    isSyncing,
    lastSyncTime,
    hasUpdates,
    isOnline,
    pendingSyncCount,
    loadMedicationsForDate,
    syncReminders,
    checkForUpdates,
    loadLastSyncTime,
    handleMarkAsTaken,
    handleLogout,
    isTokenLoading,
  };
}


