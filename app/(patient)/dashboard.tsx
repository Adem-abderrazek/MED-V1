import React, { useEffect, useCallback } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { usePatientDashboard } from '../../features/patient/hooks/usePatientDashboard';
import DashboardHeader from '../../features/patient/components/DashboardHeader';
import DateSelector from '../../features/patient/components/DateSelector';
import MedicationCard from '../../features/patient/components/MedicationCard';
import SyncBanner from '../../features/patient/components/SyncBanner';
import SyncBlockingOverlay from '../../features/patient/components/SyncBlockingOverlay';
import CustomModal from '../../shared/components/ui/Modal';
import EmptyState from '../../shared/components/ui/EmptyState';
import { useModal } from '../../shared/hooks/useModal';
import { COLORS } from '../../shared/constants/colors';
import { Medication } from '../../shared/types';

export default function PatientDashboardScreen() {
  const { t, i18n } = useTranslation();
  const { visible, modalData, showModal, hideModal } = useModal();
  const {
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
  } = usePatientDashboard();

  useFocusEffect(
    useCallback(() => {
      // Only load if token is ready
      if (!isTokenLoading) {
        loadMedicationsForDate(selectedDate);
        loadLastSyncTime();
        // Only check for updates when viewing today (not when browsing dates)
        const isToday = selectedDate.toDateString() === new Date().toDateString();
        if (isToday) {
          checkForUpdates().then(hasActualUpdates => {
            if (hasActualUpdates) {
              syncReminders(true);
            }
          });
        }
      }
    }, [selectedDate, isTokenLoading, loadMedicationsForDate, loadLastSyncTime, checkForUpdates, syncReminders])
  );

  useEffect(() => {
    if (!isTokenLoading && selectedDate) {
      loadMedicationsForDate(selectedDate);
    }
  }, [selectedDate, isTokenLoading, loadMedicationsForDate]);


  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadMedicationsForDate(selectedDate);
  }, [selectedDate, loadMedicationsForDate, setIsRefreshing]);

  const onMarkAsTaken = useCallback(async (reminderId: string) => {
    const result = await handleMarkAsTaken(reminderId);
    if (result.success) {
      showModal('success', t('common.success'), result.message);
    } else {
      showModal('error', t('common.error'), result.message);
    }
  }, [handleMarkAsTaken, showModal, t]);

  const renderMedicationCard = useCallback(({ item }: { item: Medication }) => (
    <MedicationCard
      medication={item}
      selectedDate={selectedDate}
      currentTime={currentTime}
      onMarkAsTaken={onMarkAsTaken}
    />
  ), [selectedDate, currentTime, onMarkAsTaken]);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={COLORS.patient.background}
        style={styles.background}
      >
        <DashboardHeader
          stats={stats}
          isOnline={isOnline}
          onLogout={handleLogout}
        />

        <SyncBanner
          hasUpdates={hasUpdates}
          lastSyncTime={lastSyncTime}
          isSyncing={isSyncing}
          onSyncPress={() => syncReminders(false)}
          i18nLanguage={i18n.language}
        />

        <DateSelector
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
        />

        <FlatList
          data={medications}
          renderItem={renderMedicationCard}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={() => (
            <EmptyState
              icon="calendar-outline"
              title={t('dashboard.patient.noMedications')}
              subtitle={t('dashboard.patient.noMedicationsForDate')}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="white"
              colors={[COLORS.patient.primary]}
            />
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      </LinearGradient>

      <CustomModal
        visible={visible}
        title={modalData.title}
        message={modalData.message}
        type={modalData.type}
        onClose={hideModal}
      />

      <SyncBlockingOverlay visible={isSyncing} />
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
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
});
