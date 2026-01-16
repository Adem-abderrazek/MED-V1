import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPatientMedicationsByDate, confirmMedicationTaken } from '../../../shared/services/api/patient';
import { registerPushToken } from '../../../shared/services/api/auth';
import { notificationService } from '../../../shared/services/notificationService';
import { DashboardStats, Medication } from '../../../shared/types';
import { useAuthToken } from '../../../shared/hooks/useAuthToken';
import { useTranslation } from 'react-i18next';

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

  const loadMedicationsForDate = useCallback(async (date: Date) => {
    if (isTokenLoading) {
      return;
    }
    
    try {
      if (!token) {
        router.push('/(auth)/login' as any);
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

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      const result = await getPatientMedicationsByDate(token, dateStr);
      
      if (result.success && result.data) {
        const data = result.data as any;
        setMedications(data.medications || []);
        setStats({
          totalMedicationsToday: data.total || 0,
          takenToday: data.taken || 0,
          adherenceRate: data.adherenceRate || 0,
        });
      } else {
        setMedications([]);
      }
    } catch (error: any) {
      console.error('Error loading medications:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [token, isTokenLoading, router]);

  const syncReminders = useCallback(async (silent: boolean = false) => {
    if (!token || isSyncing) return;

    try {
      setIsSyncing(true);
      console.log('🔄 Starting reminder sync...');

      const { default: localReminderService } = await import('../../../shared/services/localReminderService');
      const result = await localReminderService.downloadAndScheduleReminders(token);

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
      }
    } catch (error) {
      console.error('Error syncing reminders:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [token, isSyncing]);

  // Check for updates - only when viewing today's date
  const checkForUpdates = useCallback(async () => {
    if (!token) return;
    
    // Only check for updates when viewing today's date, not when browsing past/future dates
    const viewingToday = isToday(selectedDate);
    if (!viewingToday) {
      setHasUpdates(false); // Clear updates flag when viewing other dates
      return;
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
      } else {
        setHasUpdates(false);
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
      setHasUpdates(false);
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
  }, [token, selectedDate, loadMedicationsForDate, t]);

  const handleLogout = useCallback(async () => {
    try {
      const { default: localReminderService } = await import('../../../shared/services/localReminderService');
      await localReminderService.clearAllLocalReminders();
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      router.replace('/(auth)/login' as any);
    } catch (error) {
      console.error('Error during logout:', error);
      router.replace('/(auth)/login' as any);
    }
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
    const setupNetworkMonitoring = async () => {
      const { networkMonitor } = await import('../../../shared/services/networkMonitor');
      const { offlineQueueService } = await import('../../../shared/services/offlineQueueService');
      
      const handleNetworkChange = async (online: boolean) => {
        setIsOnline(online);
        
        if (online && token) {
          await offlineQueueService.syncQueue(token);
          const count = await offlineQueueService.getPendingCount();
          setPendingSyncCount(count);
        }
      };
      
      networkMonitor.addListener(handleNetworkChange);
      
      const updatePendingCount = async () => {
        const count = await offlineQueueService.getPendingCount();
        setPendingSyncCount(count);
      };
      
      updatePendingCount();
      const interval = setInterval(updatePendingCount, 10000);
      
      return () => {
        clearInterval(interval);
        networkMonitor.removeListener(handleNetworkChange);
      };
    };
    
    setupNetworkMonitoring();
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


