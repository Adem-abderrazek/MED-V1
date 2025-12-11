import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useCallback, useMemo, useEffect, memo } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
  RefreshControl,
  Dimensions,
  ScrollView,
  I18nManager,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPatientMedicationsByDate, confirmMedicationTaken } from '../../services/api/patient';
import { registerPushToken } from '../../services/api/common';
import CustomModal from '../../components/ui/Modal';
import { notificationService } from '../../services/notificationService';
import { formatTime } from '../../utils/formatting/timeFormatting';
import { useTranslation } from 'react-i18next';
import { useAuthToken } from '../../hooks/useAuthToken';

const { width } = Dimensions.get('window');

// Green theme colors for patients
const COLORS = {
  primary: '#10B981',
  primaryLight: '#34D399',
  primaryDark: '#059669',
  background: ['#1a1a2e', '#1B2E1F', '#1D3020'] as const,
  cardBg: ['rgba(16, 185, 129, 0.1)', 'rgba(16, 185, 129, 0.05)'] as const,
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.8)',
  textTertiary: 'rgba(255, 255, 255, 0.6)',
  success: ['#10B981', '#059669'] as const,
  warning: ['#F59E0B', '#D97706'] as const,
  error: ['#EF4444', '#DC2626'] as const,
  info: ['#3B82F6', '#2563EB'] as const,
};

interface Medication {
  id: string;
  medicationName: string;
  dosage: string;
  scheduledFor: string;
  status: 'pending' | 'taken' | 'missed' | 'scheduled';
  reminderId: string;
  prescriptionId: string;
}

interface DashboardStats {
  totalMedicationsToday: number;
  takenToday: number;
  adherenceRate: number;
}

interface DateItem {
  date: Date;
  dayName: string;
  dayNumber: number;
  monthName: string;
  isToday: boolean;
}

export default function PatientDashboardScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [medications, setMedications] = useState<Medication[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalMedicationsToday: 0,
    takenToday: 0,
    adherenceRate: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { token, isLoading: isTokenLoading } = useAuthToken();
  const [currentTime, setCurrentTime] = useState(new Date()); // Real-time clock for countdown

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [hasUpdates, setHasUpdates] = useState(false);
  const [hasCheckedInitialSync, setHasCheckedInitialSync] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info',
  });

  // Generate 14 days (7 past + today + 6 future)
  const datesList = useMemo(() => {
    const dates: DateItem[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = -7; i <= 6; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const dayNames = [
        t('dashboard.days.sun'),
        t('dashboard.days.mon'),
        t('dashboard.days.tue'),
        t('dashboard.days.wed'),
        t('dashboard.days.thu'),
        t('dashboard.days.fri'),
        t('dashboard.days.sat')
      ];
      const monthNames = [
        t('dashboard.months.jan'),
        t('dashboard.months.feb'),
        t('dashboard.months.mar'),
        t('dashboard.months.apr'),
        t('dashboard.months.may'),
        t('dashboard.months.jun'),
        t('dashboard.months.jul'),
        t('dashboard.months.aug'),
        t('dashboard.months.sep'),
        t('dashboard.months.oct'),
        t('dashboard.months.nov'),
        t('dashboard.months.dec')
      ];
      
      dates.push({
        date: date,
        dayName: dayNames[date.getDay()],
        dayNumber: date.getDate(),
        monthName: monthNames[date.getMonth()],
        isToday: i === 0,
      });
    }
    
    return dates;
  }, [t, i18n.language]); // Re-generate when language changes

  const showModal = useCallback((
    title: string,
    message: string,
    type: 'success' | 'error' | 'warning' | 'info'
  ) => {
    setModalConfig({ title, message, type });
    setModalVisible(true);
  }, []);

  const loadMedicationsForDate = useCallback(async (date: Date) => {
    // Wait for token to load before checking
    if (isTokenLoading) {
      console.log('⏳ Waiting for token to load...');
      return;
    }
    
    try {
      if (!token) {
        console.log('❌ No token available, redirecting to login');
        showModal(t('common.error'), t('dashboard.patient.sessionExpired'), 'error');
        router.push('/auth/login' as any);
        return;
      }

      // Register push token with backend if available
      const pushToken = notificationService.getPushToken();
      if (pushToken) {
        try {
          console.log('📱 Registering push token with backend...');
          await registerPushToken(token, pushToken);
          console.log('✅ Push token registered successfully');
        } catch (error) {
          console.error('❌ Failed to register push token:', error);
        }
      }

      // Format date to YYYY-MM-DD in local timezone (not UTC)
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      console.log('📅 Loading medications for date:', dateStr, '(local timezone)');
      
      // Call API to get medications for specific date
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
      // Only show error if token is loaded (not a loading issue)
      if (!isTokenLoading) {
        showModal(t('common.error'), t('dashboard.patient.loadMedicationsError'), 'error');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [token, isTokenLoading, router, t, showModal]);

  // Sync reminders for offline use
  const syncReminders = useCallback(async (silent: boolean = false) => {
    if (!token || isSyncing) return;

    try {
      setIsSyncing(true);
      console.log('🔄 Starting reminder sync...');

      const { default: localReminderService } = await import('../../services/localReminderService');
      const result = await localReminderService.downloadAndScheduleReminders(token);

      if (result.success) {
        // Only show modal if not silent (manual sync)
        if (!silent) {
          // Show audio download count if any were downloaded
          const audioInfo = result.audioDownloaded > 0
            ? `\n🎤 ${result.audioDownloaded} messages vocaux téléchargés`
            : '';
          showModal(
            t('common.success'),
            `${result.scheduled} rappels synchronisés${audioInfo}`,
            'success'
          );
        } else {
          console.log(`✅ Silent sync complete: ${result.scheduled} reminders, ${result.audioDownloaded} audio files`);
        }

        // Update last sync time
        const syncTime = await localReminderService.getLastSyncTime();
        setLastSyncTime(syncTime);
        setHasUpdates(false);
      } else {
        if (!silent) {
          showModal(t('dashboard.patient.syncError'), t('dashboard.patient.syncErrorMessage'), 'error');
        }
      }
    } catch (error) {
      console.error('Error syncing reminders:', error);
      if (!silent) {
        showModal(t('common.error'), t('dashboard.patient.syncRemindersError'), 'error');
      }
    } finally {
      setIsSyncing(false);
    }
  }, [token, isSyncing]);

  // Check for updates
  const checkForUpdates = useCallback(async () => {
    if (!token) return;

    try {
      const { default: localReminderService } = await import('../../services/localReminderService');
      const updateStatus = await localReminderService.checkForUpdates(token);
      
      if (updateStatus.hasUpdates) {
        setHasUpdates(true);
        console.log('⚠️ Updates available');
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
    }
  }, [token]);

  // Load last sync time
  const loadLastSyncTime = useCallback(async () => {
    try {
      const { default: localReminderService } = await import('../../services/localReminderService');
      const syncTime = await localReminderService.getLastSyncTime();
      setLastSyncTime(syncTime);
    } catch (error) {
      console.error('Error loading last sync time:', error);
    }
  }, []);

  // Listen to language changes to force re-render of dates
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      console.log(`📢 Dashboard: Language changed to ${lng}`);
      // Force re-render by updating a state that triggers datesList recalculation
      // The datesList useMemo will automatically recalculate because it depends on t and i18n.language
    };

    // Subscribe to language changes
    i18n.on('languageChanged', handleLanguageChange);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  // Load medications when screen comes into focus or date changes
  useFocusEffect(
    useCallback(() => {
      // Only load if token is ready
      if (!isTokenLoading && token) {
        loadMedicationsForDate(selectedDate);
        loadLastSyncTime();
        checkForUpdates();
      }
    }, [selectedDate, token, isTokenLoading, loadMedicationsForDate, loadLastSyncTime, checkForUpdates])
  );
  
  // Also load when token becomes available (after login)
  useEffect(() => {
    if (!isTokenLoading && token && selectedDate) {
      loadMedicationsForDate(selectedDate);
    }
  }, [token, isTokenLoading, loadMedicationsForDate, selectedDate]);

  // Separate effect for initial sync (runs once when token is available)
  useEffect(() => {
    const doInitialSync = async () => {
      if (token && !hasCheckedInitialSync && !isSyncing) {
        setHasCheckedInitialSync(true); // Prevent running again
        
        try {
          const syncTime = await AsyncStorage.getItem('@last_sync_time');
          if (!syncTime) {
            console.log('📱 No previous sync found, syncing silently in background...');
            // Silent sync - doesn't show modal, doesn't block UI
            syncReminders(true); // true = silent mode
          }
        } catch (error) {
          console.error('Error checking initial sync:', error);
        }
      }
    };
    
    // Small delay to let UI render first
    const timer = setTimeout(doInitialSync, 500);
    return () => clearTimeout(timer);
  }, [token, hasCheckedInitialSync, isSyncing, syncReminders]); // Include all dependencies

  // Real-time countdown timer - updates every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second

    return () => clearInterval(timer);
  }, []);

  // Monitor network status and pending sync count
  useEffect(() => {
    const setupNetworkMonitoring = async () => {
      const { networkMonitor } = await import('../../services/networkMonitor');
      const { offlineQueueService } = await import('../../services/offlineQueueService');
      
      // Add network listener
      const handleNetworkChange = async (online: boolean) => {
        setIsOnline(online);
        
        if (online && token) {
          console.log('🌐 Network restored, syncing queue...');
          await offlineQueueService.syncQueue(token);
          // Update pending count after sync
          const count = await offlineQueueService.getPendingCount();
          setPendingSyncCount(count);
        }
      };
      
      networkMonitor.addListener(handleNetworkChange);
      
      // Update pending count periodically
      const updatePendingCount = async () => {
        const count = await offlineQueueService.getPendingCount();
        setPendingSyncCount(count);
      };
      
      updatePendingCount();
      const interval = setInterval(updatePendingCount, 10000); // Every 10 seconds
      
      return () => {
        clearInterval(interval);
        networkMonitor.removeListener(handleNetworkChange);
      };
    };
    
    setupNetworkMonitoring();
  }, [token]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadMedicationsForDate(selectedDate);
  }, [selectedDate, loadMedicationsForDate]);

  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
  }, []);

  const handleMarkAsTaken = useCallback(async (reminderId: string) => {
    if (!token) return;

    try {
      const result = await confirmMedicationTaken(token, [reminderId]);
      
      if (result.success) {
        showModal(t('common.success'), t('dashboard.patient.medicationMarked'), 'success');
        await loadMedicationsForDate(selectedDate);
      } else {
        showModal(t('common.error'), result.message || t('dashboard.patient.markMedicationError'), 'error');
      }
    } catch (error: any) {
      console.error('Error marking medication:', error);
      
      // Enhanced error handling for time validation
      const errorMessage = error?.message || 'Une erreur est survenue';
      if (errorMessage.includes('minutes de l\'heure prévue') || errorMessage.includes('déjà été marqué')) {
        showModal('Information', errorMessage, 'warning');
      } else {
        showModal(t('common.error'), errorMessage, 'error');
      }
    }
  }, [token, selectedDate, loadMedicationsForDate, showModal, t]);

  const handleLogout = async () => {
    try {
      console.log('🚪 Logging out...');
      
      // Clear local reminders and voice files
      try {
        const { default: localReminderService } = await import('../../services/localReminderService');
        await localReminderService.clearAllLocalReminders();
        console.log('✅ Local reminders cleared');
      } catch (error) {
        console.error('⚠️ Error clearing local reminders:', error);
      }
      
      // Clear AsyncStorage
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      
      console.log('✅ Logged out successfully');
      router.replace('/auth/login' as any);
    } catch (error) {
      console.error('Error during logout:', error);
      router.replace('/auth/login' as any);
    }
  };

  // formatTime is now imported from utils/timeFormatting for consistency

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isPastDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate < today;
  };

  const isFutureDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate > today;
  };

  const getMedicationStatusIcon = (status: string) => {
    switch (status) {
      case 'taken':
        return { name: 'checkmark-circle' as const, color: COLORS.primary };
      case 'missed':
        return { name: 'close-circle' as const, color: COLORS.error[0] };
      case 'pending':
      case 'scheduled':
        return { name: 'time' as const, color: COLORS.warning[0] };
      default:
        return { name: 'radio-button-off' as const, color: COLORS.textTertiary };
    }
  };

  const getMedicationStatusText = (status: string) => {
    switch (status) {
      case 'taken':
        return t('dashboard.patient.takenStatus');
      case 'missed':
        return t('dashboard.patient.missedStatus');
      case 'pending':
        return t('dashboard.patient.pendingStatus');
      case 'scheduled':
        return t('dashboard.patient.scheduledStatus');
      default:
        return t('dashboard.patient.pendingStatus');
    }
  };

  // Render date circle
  const renderDateCircle = useCallback(({ item }: { item: DateItem }) => {
    const isSelected = item.date.toDateString() === selectedDate.toDateString();
    
    return (
      <TouchableOpacity
        onPress={() => handleDateSelect(item.date)}
        style={styles.dateCircleContainer}
      >
        <LinearGradient
          colors={isSelected 
            ? [COLORS.primary, COLORS.primaryLight] 
            : item.isToday
            ? ['rgba(16, 185, 129, 0.3)', 'rgba(16, 185, 129, 0.2)']
            : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']
          }
          style={[
            styles.dateCircle,
            isSelected && styles.dateCircleSelected,
          ]}
        >
          <Text style={[
            styles.dayName,
            isSelected && styles.dateTextSelected,
          ]}>
            {item.dayName}
          </Text>
          <Text style={[
            styles.dayNumber,
            isSelected && styles.dateTextSelected,
          ]}>
            {item.dayNumber}
          </Text>
          <Text style={[
            styles.monthName,
            isSelected && styles.dateTextSelected,
          ]}>
            {item.monthName}
          </Text>
        </LinearGradient>
        {item.isToday && !isSelected && (
          <View style={styles.todayIndicator} />
        )}
      </TouchableOpacity>
    );
  }, [selectedDate, handleDateSelect]);

  // Render medication card
  const renderMedicationCard = useCallback(({ item }: { item: Medication }) => {
    const statusIcon = getMedicationStatusIcon(item.status);
    
    // Determine date context
    const selectedIsToday = isToday(selectedDate);
    const selectedIsPast = isPastDate(selectedDate);
    const selectedIsFuture = isFutureDate(selectedDate);

    // For past dates: show "Non Pris" badge if not taken
    const showNotTakenBadge = selectedIsPast && (item.status === 'pending' || item.status === 'scheduled' || item.status === 'missed');

    // CRITICAL: Enhanced time validation for medication taking
    const now = currentTime; // Use real-time clock instead of new Date()
    const scheduledTime = new Date(item.scheduledFor);
    const gracePeriodMinutes = 5; // Allow 5 minutes before scheduled time
    const earliestAllowedTime = new Date(scheduledTime.getTime() - (gracePeriodMinutes * 60 * 1000));
    const isTimeValid = now >= earliestAllowedTime;
    
    // Calculate time remaining in hours and minutes
    const timeUntilAllowedMs = earliestAllowedTime.getTime() - now.getTime();
    const timeUntilAllowedMinutes = Math.ceil(timeUntilAllowedMs / (1000 * 60));
    const hours = Math.floor(timeUntilAllowedMinutes / 60);
    const minutes = timeUntilAllowedMinutes % 60;
    
    // Format time display
    const formatTimeRemaining = () => {
      if (hours > 0) {
        return `${hours}h ${minutes}min`;
      } else {
        return `${minutes}min`;
      }
    };

    // Only show button for today's medications that are pending/scheduled AND time is valid
    const showTakeButton = selectedIsToday && 
                          (item.status === 'pending' || item.status === 'scheduled') && 
                          isTimeValid;
    
    // Show time warning if medication is scheduled but not yet time
    const showTimeWarning = selectedIsToday && 
                           (item.status === 'pending' || item.status === 'scheduled') && 
                           !isTimeValid;
    
    return (
      <View style={styles.medicationCard}>
        <LinearGradient
          colors={showNotTakenBadge 
            ? (['rgba(239, 68, 68, 0.1)', 'rgba(239, 68, 68, 0.05)'] as const)
            : COLORS.cardBg
          }
          style={styles.medicationCardGradient}
        >
          <View style={styles.medicationHeader}>
            <View style={styles.medicationIconContainer}>
              <Ionicons name="medical" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.medicationInfo}>
              <Text style={styles.medicationName}>{item.medicationName}</Text>
              <Text style={styles.medicationDosage}>{item.dosage}</Text>
            </View>
            <View style={styles.medicationStatus}>
              <Ionicons name={statusIcon.name} size={24} color={statusIcon.color} />
            </View>
          </View>

          <View style={styles.medicationFooter}>
            <View style={styles.timeContainer}>
              <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.timeText}>{formatTime(item.scheduledFor)}</Text>
            </View>
            
            <View style={styles.statusBadge}>
              <Text style={[styles.statusText, { color: statusIcon.color }]}>
                {getMedicationStatusText(item.status)}
              </Text>
            </View>
          </View>

          {showNotTakenBadge && (
            <View style={styles.notTakenBadge}>
              <Ionicons name="close-circle" size={16} color={COLORS.error[0]} />
              <Text style={styles.notTakenText}>{t('dashboard.patient.notTaken')}</Text>
            </View>
          )}

          {showTimeWarning && (
            <View style={styles.timeWarningBadge}>
              <Ionicons name="time-outline" size={16} color={COLORS.warning[0]} />
              <Text style={styles.timeWarningText}>
                {t('dashboard.patient.availableIn')} {formatTimeRemaining()} ({formatTime(item.scheduledFor)})
              </Text>
            </View>
          )}

          {showTakeButton && (
            <TouchableOpacity
              style={styles.takeButton}
              onPress={() => handleMarkAsTaken(item.reminderId)}
            >
              <LinearGradient
                colors={COLORS.success}
                style={styles.takeButtonGradient}
              >
                <Ionicons name="checkmark" size={20} color="white" />
                <Text style={styles.takeButtonText}>{t('dashboard.patient.markAsTaken')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </LinearGradient>
      </View>
    );
  }, [handleMarkAsTaken, selectedDate, currentTime, t]);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={COLORS.background}
        style={styles.background}
      >
        {/* Header with Stats */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.welcomeText}>{t('dashboard.patient.welcome')}</Text>
                <Text style={styles.headerTitle}>{t('dashboard.patient.title')}</Text>
                {!isOnline && (
                  <View style={styles.offlineBanner}>
                    <Ionicons name="cloud-offline" size={14} color="#FF6B6B" />
                    <Text style={styles.offlineText}>{t('dashboard.patient.offlineMode')}</Text>
                  </View>
                )}
              </View>
              <View style={styles.headerButtons}>
                <TouchableOpacity
                  style={[styles.syncButton, hasUpdates && styles.syncButtonWithBadge]}
                  onPress={() => syncReminders(false)}
                  disabled={isSyncing}
                >
                  <Ionicons
                    name={isSyncing ? "sync" : "cloud-download-outline"}
                    size={24}
                    color="white"
                  />
                  {hasUpdates && <View style={styles.updateBadge} />}
                  {pendingSyncCount > 0 && (
                    <View style={styles.pendingSyncBadge}>
                      <Text style={styles.pendingSyncText}>{pendingSyncCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/patient/patient-profile-settings' as any)}>
                  <Ionicons name="person-circle-outline" size={28} color="white" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                  <Ionicons name="log-out-outline" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Stats Cards */}
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Ionicons name="checkmark-circle" size={24} color="white" />
                <Text style={styles.statNumber}>{stats.takenToday}</Text>
                <Text style={styles.statLabel}>{t('dashboard.patient.taken')}</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="medical" size={24} color="white" />
                <Text style={styles.statNumber}>{stats.totalMedicationsToday}</Text>
                <Text style={styles.statLabel}>{t('dashboard.patient.total')}</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="stats-chart" size={24} color="white" />
                <Text style={styles.statNumber}>{stats.adherenceRate}%</Text>
                <Text style={styles.statLabel}>{t('dashboard.patient.adherence')}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Update Banner */}
        {hasUpdates && (
          <View style={styles.updateBanner}>
            <Ionicons name="alert-circle" size={20} color={COLORS.warning[0]} />
            <Text style={styles.updateBannerText}>
              {t('dashboard.patient.newUpdatesAvailable')}
            </Text>
            <TouchableOpacity 
              style={styles.updateBannerButton}
              onPress={() => syncReminders(false)}
              disabled={isSyncing}
            >
              <Text style={styles.updateBannerButtonText}>
                {isSyncing ? t('dashboard.patient.syncing') : t('dashboard.patient.sync')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Last Sync Info */}
        {lastSyncTime && !hasUpdates && (
          <View style={styles.syncInfoBanner}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success[0]} />
            <Text style={styles.syncInfoText}>
              {t('dashboard.patient.lastSync')}: {new Date(lastSyncTime).toLocaleString(i18n.language === 'ar' ? 'ar-TN' : i18n.language === 'fr' ? 'fr-FR' : 'en-US', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Africa/Tunis',
                numberingSystem: 'latn' // Force Western numerals
              })}
            </Text>
          </View>
        )}

        {/* Date Selector */}
        <View style={styles.dateListContainer}>
          <FlatList
            key={i18n.language} // Force re-render when language changes
            data={datesList}
            renderItem={renderDateCircle}
            keyExtractor={(item) => item.date.toISOString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateListContent}
            initialScrollIndex={7} // Scroll to today
            getItemLayout={(data, index) => ({
              length: 80,
              offset: 80 * index,
              index,
            })}
          />
        </View>

        {/* Medications List */}
        <FlatList
          data={medications}
          renderItem={renderMedicationCard}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={64} color={COLORS.textTertiary} />
              <Text style={styles.emptyTitle}>{t('dashboard.patient.noMedications')}</Text>
              <Text style={styles.emptySubtitle}>
                {t('dashboard.patient.noMedicationsForDate')}
              </Text>
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="white"
              colors={[COLORS.primary]}
            />
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      </LinearGradient>

      {/* Custom Modal */}
      <CustomModal
        visible={modalVisible}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onClose={() => setModalVisible(false)}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  
  // Header Styles
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    marginTop: 10,
  },
  headerTop: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', // Reverse for RTL
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
  },
  headerButtons: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', // Reverse for RTL
    alignItems: 'center',
    gap: 12,
  },
  profileButton: {
    padding: 4,
  },
  logoutButton: {
    padding: 8,
  },
  syncButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    position: 'relative',
  },
  syncButtonWithBadge: {
    borderWidth: 2,
    borderColor: COLORS.warning[0],
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  offlineText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: '500',
  },
  pendingSyncBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#10B981',
  },
  pendingSyncText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  updateBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.warning[0],
  },
  
  // Update Banner Styles
  updateBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', // Reverse for RTL
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 158, 11, 0.3)',
  },
  updateBannerText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.warning[0],
    fontWeight: '600',
    marginLeft: I18nManager.isRTL ? 0 : 8,
    marginRight: I18nManager.isRTL ? 8 : 0,
  },
  updateBannerButton: {
    backgroundColor: COLORS.warning[0],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  updateBannerButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'white',
  },
  
  // Sync Info Banner Styles
  syncInfoBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', // Reverse for RTL
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(16, 185, 129, 0.2)',
  },
  syncInfoText: {
    fontSize: 12,
    color: COLORS.success[0],
    marginLeft: I18nManager.isRTL ? 0 : 6,
    marginRight: I18nManager.isRTL ? 6 : 0,
    textAlign: 'left', // Keep sync info LTR
    writingDirection: 'ltr', // Force LTR for dates/times in sync info
  },
  
  // Stats Styles
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 10,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 5,
    textAlign: 'center', // Center align numbers
    writingDirection: 'ltr', // Force LTR for numbers
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    textAlign: 'center', // Center align labels
  },
  
  // Date List Styles
  dateListContainer: {
    paddingVertical: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  dateListContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  dateCircleContainer: {
    position: 'relative',
  },
  dateCircle: {
    width: 70,
    height: 90,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  dateCircleSelected: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  dayName: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    textAlign: 'center', // Center align day names
  },
  dayNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center', // Center align numbers
    writingDirection: 'ltr', // Force LTR for numbers
    color: COLORS.text,
    marginVertical: 2,
  },
  monthName: {
    fontSize: 11,
    color: COLORS.textTertiary,
    textAlign: 'center', // Center align month names
  },
  dateTextSelected: {
    color: 'white',
  },
  todayIndicator: {
    position: 'absolute',
    bottom: -8,
    alignSelf: 'center',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  
  // Medication List Styles
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  medicationCard: {
    marginBottom: 15,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  medicationCardGradient: {
    padding: 16,
  },
  medicationHeader: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', // Reverse for RTL
    alignItems: 'center',
    marginBottom: 12,
  },
  medicationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: I18nManager.isRTL ? 0 : 12,
    marginLeft: I18nManager.isRTL ? 12 : 0,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  medicationDosage: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  medicationStatus: {
    marginLeft: I18nManager.isRTL ? 0 : 8,
    marginRight: I18nManager.isRTL ? 8 : 0,
  },
  medicationFooter: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', // Reverse for RTL
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'left', // Keep times LTR
    writingDirection: 'ltr', // Force LTR for times
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  takeButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  takeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  takeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  notTakenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.error[0],
    gap: 8,
  },
  notTakenText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.error[0],
  },
  timeWarningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.warning[0],
    gap: 8,
  },
  timeWarningText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.warning[0],
  },
  
  // Empty State Styles
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

