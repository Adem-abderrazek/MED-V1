import React, { useCallback, useMemo } from 'react';
import { View, FlatList, RefreshControl, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useDoctorDashboard } from '../../features/doctor/hooks/useDoctorDashboard';
import PatientCard from '../../features/doctor/components/PatientCard';
import SearchBar from '../../features/doctor/components/SearchBar';
import CustomModal from '../../shared/components/ui/Modal';
import EmptyState from '../../shared/components/ui/EmptyState';
import { useModal } from '../../shared/hooks/useModal';
import { Patient } from '../../shared/types';
import { getThemeColors } from '../../config/theme';

export default function DoctorDashboardScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { visible, modalData, showModal, hideModal } = useModal();
  const {
    searchQuery,
    setSearchQuery,
    filteredPatients,
    isLoading,
    isRefreshing,
    setIsRefreshing,
    dashboardStats,
    userType,
    userName,
    loadPatients,
    loadDashboardData,
    handleDeletePatient,
    handleLogout,
  } = useDoctorDashboard();

  const colors = useMemo(() => getThemeColors(userType), [userType]);

  useFocusEffect(
    useCallback(() => {
      loadPatients();
      loadDashboardData();
    }, [loadPatients, loadDashboardData])
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadPatients();
    loadDashboardData();
  }, [loadPatients, loadDashboardData, setIsRefreshing]);

  const onViewProfile = useCallback((patient: Patient) => {
    router.push({
      pathname: '/(patient)/profile' as any,
      params: { patientId: patient.id }
    });
  }, [router]);

  const onDelete = useCallback(async (patient: Patient) => {
    const result = await handleDeletePatient(patient);
    if (result.success) {
      showModal('success', t('common.success'), result.message);
    } else {
      showModal('error', t('common.error'), result.message);
    }
  }, [handleDeletePatient, showModal, t]);

  const renderPatientCard = useCallback(({ item }: { item: Patient }) => (
    <PatientCard
      patient={item}
      onViewProfile={onViewProfile}
      onDelete={onDelete}
      themeColors={{ primary: colors.primary, gradient: colors.gradient }}
    />
  ), [onViewProfile, onDelete, colors]);

  const renderHeader = () => (
    <LinearGradient
      colors={colors.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.headerGradient}
    >
      <View style={styles.headerContent}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.welcomeText}>
              {t('dashboard.doctor.welcome')}, {userName || (userType === 'tuteur' ? t('dashboard.doctor.tutor') : t('dashboard.doctor.doctor'))}
            </Text>
            <Text style={styles.headerTitle}>{t('dashboard.doctor.title')}</Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.profileButton} 
              onPress={() => router.push('/(doctor)/profile' as any)}
            >
              <Ionicons name="person-circle-outline" size={28} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {dashboardStats && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Ionicons name="people" size={24} color="white" />
              <Text style={styles.statNumber}>{dashboardStats.totalPatients}</Text>
              <Text style={styles.statLabel}>{t('dashboard.doctor.patients')}</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="alert-circle" size={24} color="white" />
              <Text style={styles.statNumber}>{dashboardStats.medicationAlerts?.length || 0}</Text>
              <Text style={styles.statLabel}>{t('dashboard.doctor.alerts')}</Text>
            </View>
          </View>
        )}
      </View>
    </LinearGradient>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={colors.background}
        style={styles.background}
      >
        {renderHeader()}

        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClear={() => setSearchQuery('')}
        />

        <FlatList
          data={filteredPatients}
          renderItem={renderPatientCard}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={() => (
            <EmptyState
              icon="people-outline"
              title="Aucun patient trouvé"
              subtitle={searchQuery ? t('dashboard.doctor.noPatients') : t('dashboard.doctor.startByAdding')}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="white"
              colors={[colors.primary]}
            />
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />

        <TouchableOpacity
          style={[styles.addButton, { shadowColor: colors.primary }]}
          onPress={() => router.push('/(shared)/add-patient' as any)}
        >
          <LinearGradient
            colors={colors.gradient}
            style={styles.addButtonGradient}
          >
            <Ionicons name="add" size={28} color="white" />
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>

      <CustomModal
        visible={visible}
        title={modalData.title}
        message={modalData.message}
        type={modalData.type}
        onClose={hideModal}
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
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: 'white',
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
    color: 'white',
    marginTop: 5,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  listContainer: {
    paddingBottom: 100,
  },
  addButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 16,
  },
  addButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
});



