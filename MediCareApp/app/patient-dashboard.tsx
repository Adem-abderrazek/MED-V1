import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
  RefreshControl,
  Dimensions,
  ScrollView,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPatientMedicationsByDate, confirmMedicationTaken } from '../services/api/patient';
import { registerPushToken } from '../services/api/common';
import CustomModal from '../components/Modal';
import { notificationService } from '../services/notificationService';

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
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [medications, setMedications] = useState<Medication[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalMedicationsToday: 0,
    takenToday: 0,
    adherenceRate: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [token, setToken] = useState<string | null>(null);
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
      
      const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
      const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
      
      dates.push({
        date: date,
        dayName: dayNames[date.getDay()],
        dayNumber: date.getDate(),
        monthName: monthNames[date.getMonth()],
        isToday: i === 0,
      });
    }
    
    return dates;
  }, []);

  const showModal = useCallback((
    title: string,
    message: string,
    type: 'success' | 'error' | 'warning' | 'info'
  ) => {
    setModalConfig({ title, message, type });
    setModalVisible(true);
  }, []);

  const loadMedicationsForDate = async (date: Date) => {
    try {
      const storedToken = await AsyncStorage.getItem('userToken');
      if (!storedToken) {
        showModal('Erreur', 'Session expirée. Veuillez vous reconnecter.', 'error');
        router.push('/login');
        return;
      }

      setToken(storedToken);

      // Register push token with backend if available
      const pushToken = notificationService.getPushToken();
      if (pushToken) {
        try {
          console.log('📱 Registering push token with backend...');
          await registerPushToken(storedToken, pushToken);
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
      const result = await getPatientMedicationsByDate(storedToken, dateStr);
      
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
      showModal('Erreur', 'Impossible de charger les médicaments', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Sync reminders for offline use
  const syncReminders = useCallback(async (silent: boolean = false) => {
    if (!token || isSyncing) return;

    try {
      setIsSyncing(true);
      console.log('🔄 Starting reminder sync...');
      
      const { default: localReminderService } = await import('../services/localReminderService');
      const result = await localReminderService.downloadAndScheduleReminders(token);
      
      if (result.success) {
        // Only show modal if not silent (manual sync)
        if (!silent) {
          showModal(
            'Synchronisation réussie',
            `${result.scheduled} rappels synchronisés`,
            'success'
          );
        } else {
          console.log(`✅ Silent sync complete: ${result.scheduled} reminders`);
        }
        
        // Update last sync time
        const syncTime = await localReminderService.getLastSyncTime();
        setLastSyncTime(syncTime);
        setHasUpdates(false);
      } else {
        if (!silent) {
          showModal('Erreur de synchronisation', 'Une erreur est survenue lors de la synchronisation', 'error');
        }
      }
    } catch (error) {
      console.error('Error syncing reminders:', error);
      if (!silent) {
        showModal('Erreur', 'Impossible de synchroniser les rappels', 'error');
      }
    } finally {
      setIsSyncing(false);
    }
  }, [token, isSyncing]);

  // Check for updates
  const checkForUpdates = useCallback(async () => {
    if (!token) return;

    try {
      const { default: localReminderService } = await import('../services/localReminderService');
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
      const { default: localReminderService } = await import('../services/localReminderService');
      const syncTime = await localReminderService.getLastSyncTime();
      setLastSyncTime(syncTime);
    } catch (error) {
      console.error('Error loading last sync time:', error);
    }
  }, []);

  // Load medications when screen comes into focus or date changes
  useFocusEffect(
    useCallback(() => {
      loadMedicationsForDate(selectedDate);
      loadLastSyncTime();
      checkForUpdates();
    }, [selectedDate])
  );

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
      const { networkMonitor } = await import('../services/networkMonitor');
      const { offlineQueueService } = await import('../services/offlineQueueService');
      
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
  }, [selectedDate]);

  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
  }, []);

  const handleMarkAsTaken = useCallback(async (reminderId: string) => {
    if (!token) return;

    try {
      const result = await confirmMedicationTaken(token, [reminderId]);
      
      if (result.success) {
        showModal('Succès', 'Médicament marqué comme pris!', 'success');
        await loadMedicationsForDate(selectedDate);
      } else {
        showModal('Erreur', result.message || 'Impossible de marquer le médicament', 'error');
      }
    } catch (error: any) {
      console.error('Error marking medication:', error);
      
      // Enhanced error handling for time validation
      const errorMessage = error?.message || 'Une erreur est survenue';
      if (errorMessage.includes('minutes de l\'heure prévue') || errorMessage.includes('déjà été marqué')) {
        showModal('Information', errorMessage, 'warning');
      } else {
        showModal('Erreur', errorMessage, 'error');
      }
    }
  }, [token, selectedDate]);

  const handleLogout = async () => {
    try {
      console.log('🚪 Logging out...');
      
      // Clear local reminders and voice files
      try {
        const { default: localReminderService } = await import('../services/localReminderService');
        await localReminderService.clearAllLocalReminders();
        console.log('✅ Local reminders cleared');
      } catch (error) {
        console.error('⚠️ Error clearing local reminders:', error);
      }
      
      // Clear AsyncStorage
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      
      console.log('✅ Logged out successfully');
      router.replace('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      router.replace('/login');
    }
  };

  const formatTime = (dateString: string) => {
    // Backend stores time in UTC, we need to display local time correctly
    const date = new Date(dateString);
    
    // Use toLocaleTimeString to get proper local time formatting
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

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
        return 'Pris';
      case 'missed':
        return 'Manqué';
      case 'pending':
        return 'En attente';
      case 'scheduled':
        return 'Programmé';
      default:
        return 'Non défini';
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
              <Text style={styles.notTakenText}>Non Pris</Text>
            </View>
          )}

          {showTimeWarning && (
            <View style={styles.timeWarningBadge}>
              <Ionicons name="time-outline" size={16} color={COLORS.warning[0]} />
              <Text style={styles.timeWarningText}>
                Disponible dans {formatTimeRemaining()} ({formatTime(item.scheduledFor)})
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
                <Text style={styles.takeButtonText}>Marquer comme pris</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </LinearGradient>
      </View>
    );
  }, [handleMarkAsTaken, selectedDate]);

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
                <Text style={styles.welcomeText}>Bonjour, Patient</Text>
                <Text style={styles.headerTitle}>Mon Traitement</Text>
                {!isOnline && (
                  <View style={styles.offlineBanner}>
                    <Ionicons name="cloud-offline" size={14} color="#FF6B6B" />
                    <Text style={styles.offlineText}>Mode hors ligne</Text>
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
                <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/patient-profile-settings' as any)}>
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
                <Text style={styles.statLabel}>Pris</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="medical" size={24} color="white" />
                <Text style={styles.statNumber}>{stats.totalMedicationsToday}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="stats-chart" size={24} color="white" />
                <Text style={styles.statNumber}>{stats.adherenceRate}%</Text>
                <Text style={styles.statLabel}>Observance</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Update Banner */}
        {hasUpdates && (
          <View style={styles.updateBanner}>
            <Ionicons name="alert-circle" size={20} color={COLORS.warning[0]} />
            <Text style={styles.updateBannerText}>
              Nouvelles modifications disponibles
            </Text>
            <TouchableOpacity 
              style={styles.updateBannerButton}
              onPress={() => syncReminders(false)}
              disabled={isSyncing}
            >
              <Text style={styles.updateBannerButtonText}>
                {isSyncing ? 'Synchronisation...' : 'Synchroniser'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Last Sync Info */}
        {lastSyncTime && !hasUpdates && (
          <View style={styles.syncInfoBanner}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success[0]} />
            <Text style={styles.syncInfoText}>
              Dernière sync: {new Date(lastSyncTime).toLocaleString('fr-FR', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
        )}

        {/* Date Selector */}
        <View style={styles.dateListContainer}>
          <FlatList
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
              <Text style={styles.emptyTitle}>Aucun médicament</Text>
              <Text style={styles.emptySubtitle}>
                Pas de médicament programmé pour cette date
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
    flexDirection: 'row',
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
    flexDirection: 'row',
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
    flexDirection: 'row',
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
    marginLeft: 8,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(16, 185, 129, 0.2)',
  },
  syncInfoText: {
    fontSize: 12,
    color: COLORS.success[0],
    marginLeft: 6,
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
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
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
  },
  dayNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginVertical: 2,
  },
  monthName: {
    fontSize: 11,
    color: COLORS.textTertiary,
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
    flexDirection: 'row',
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
    marginRight: 12,
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
    marginLeft: 8,
  },
  medicationFooter: {
    flexDirection: 'row',
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

