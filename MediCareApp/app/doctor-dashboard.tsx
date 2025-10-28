import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  FlatList,
  RefreshControl,
  Dimensions,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import CustomModal from '../components/Modal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../services/api';

const { width, height } = Dimensions.get('window');

interface Patient {
  id: string;
  name: string;
  age: number;
  phoneNumber: string;
  email: string;
  createdAt: Date;
  lastLogin?: Date | null;
  adherenceRate: number;
  medications: Array<{
    id: string;
    name: string;
    nextDue: string;
    status: 'taken' | 'missed' | 'pending';
  }>;
  medicationCount?: number; // Total active prescriptions
  lastActivity: string;
}

interface DashboardStats {
  totalPatients: number;
  recentPatients: Patient[];
  upcomingAppointments: any[];
  medicationAlerts: any[];
}

export default function DoctorDashboardScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  
  // Modal states
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [userType, setUserType] = useState<'medecin' | 'tuteur' | null>(null);
  const [userName, setUserName] = useState<string>('');
  
  // Custom modal state
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [customModalConfig, setCustomModalConfig] = useState({
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info',
    primaryButton: undefined as { text: string; onPress: () => void } | undefined,
    secondaryButton: undefined as { text: string; onPress: () => void } | undefined,
  });

  // Memoize filtered patients to prevent unnecessary recalculations
  const filteredPatients = useMemo(() => {
    if (searchQuery.trim() === '') {
      return patients;
    }
    
    return patients.filter(patient => 
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.phoneNumber.includes(searchQuery)
    );
  }, [patients, searchQuery]);

  const loadPatients = async () => {
    try {
      // Get user token and user data
      const token = await AsyncStorage.getItem('userToken');
      const userData = await AsyncStorage.getItem('userData');
      
      console.log('🔑 Token retrieved:', token ? 'Token exists' : 'No token found');
      
      if (userData) {
        const user = JSON.parse(userData);
        console.log('👤 User type:', user.userType);
        console.log('👤 User ID:', user.id);
      }
      
      if (!token) {
        showCustomModal(
          'Erreur',
          'Session expirée. Veuillez vous reconnecter.',
          'error',
          {
            text: 'Se connecter',
            onPress: () => router.push('/login')
          }
        );
        return;
      }

      // Fetch patients using unified endpoint
      console.log('📞 Calling getDoctorPatients API (works for both doctor and tutor)...');
      const result = await apiService.getDoctorPatients(token);
      
      console.log('📋 API Response:', result);
      console.log('📋 Number of patients:', result.data?.length || 0);
      
      if (result.success && result.data && Array.isArray(result.data)) {
        console.log('✅ Patients loaded successfully:', result.data.length);
        console.log('📋 First patient medications:', result.data[0]?.medications);
        setPatients(result.data);
        
        // Update dashboard stats with patient count
        setDashboardStats(prev => ({
          totalPatients: result.data.length,
          recentPatients: result.data.slice(0, 5),
          upcomingAppointments: prev?.upcomingAppointments || [],
          medicationAlerts: prev?.medicationAlerts || [],
        }));
      } else {
        console.error('❌ Failed to load patients:', result.message);
        showCustomModal(
          'Erreur',
          result.message || 'Impossible de charger les patients',
          'error'
        );
        setPatients([]);
      }
    } catch (error: any) {
      console.error('❌ Error loading patients:', error);
      console.error('Error details:', error.message);
      showCustomModal(
        'Erreur',
        'Une erreur est survenue lors du chargement des patients',
        'error'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      // Get user token
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        console.log('❌ No token for dashboard data');
        return;
      }

      // Fetch dashboard data
      console.log('📊 Loading dashboard data...');
      const result = await apiService.getDoctorDashboard(token);
      
      console.log('📊 Dashboard data result:', result);
      
      if (result.success && result.data) {
        console.log('✅ Dashboard data loaded:', result.data);
        
        // Update only alerts and appointments, keep patient count from loadPatients
        setDashboardStats(prev => ({
          totalPatients: prev?.totalPatients || 0,
          recentPatients: prev?.recentPatients || [],
          upcomingAppointments: result.data.upcomingAppointments || [],
          medicationAlerts: result.data.alerts?.missedMedications || result.data.medicationAlerts || [],
        }));
      } else {
        console.error('❌ Dashboard data load failed');
      }
    } catch (error: any) {
      console.error('❌ Error loading dashboard data:', error);
    }
  };

  // Load token and user data on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('userToken');
        const userData = await AsyncStorage.getItem('userData');
        
        setToken(storedToken);
        
        if (userData) {
          const user = JSON.parse(userData);
          setUserType(user.userType);
          setUserName(user.firstName || '');
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };
    loadUserData();
  }, []);

  // Helper function to show custom modal
  const showCustomModal = useCallback((
    title: string,
    message: string,
    type: 'success' | 'error' | 'warning' | 'info',
    primaryButton?: { text: string; onPress: () => void },
    secondaryButton?: { text: string; onPress: () => void }
  ) => {
    setCustomModalConfig({
      title,
      message,
      type,
      primaryButton: primaryButton || undefined,
      secondaryButton: secondaryButton || undefined,
    });
    setCustomModalVisible(true);
  }, []);

  const handleAddPatient = useCallback(() => {
    router.push('/add-patient');
  }, [router]);

  const handleViewProfile = useCallback((patient: Patient) => {
    router.push({
      pathname: '/patient-profile',
      params: { patientId: patient.id }
    });
  }, [router]);

  const handleDeletePatient = useCallback((patient: Patient) => {
    setSelectedPatient(patient);
    setDeleteModalVisible(true);
  }, []);

  const confirmDeletePatient = useCallback(async (patient: Patient) => {
    if (!token) {
      showCustomModal(
        'Erreur',
        'Session expirée. Veuillez vous reconnecter.',
        'error',
        {
          text: 'Se connecter',
          onPress: () => router.push('/login')
        }
      );
      return;
    }

    try {
      setIsDeleting(true);
      
      const result = await apiService.deletePatient(token, patient.id);
      
      if (result.success) {
        // Remove patient from local state
        setPatients(prev => prev.filter(p => p.id !== patient.id));
        
        // Update dashboard stats
        setDashboardStats(prev => prev ? {
          ...prev,
          totalPatients: prev.totalPatients - 1,
          recentPatients: prev.recentPatients?.filter(p => p.id !== patient.id) || []
        } : null);
        
        // Reload dashboard data to update header stats
        await loadDashboardData();
        
        showCustomModal(
          'Patient supprimé',
          `${patient.name} a été supprimé de votre liste de patients.`,
          'success'
        );
      } else {
        throw new Error(result.message || 'Échec de la suppression');
      }
    } catch (error: any) {
      console.error('Error deleting patient:', error);
      showCustomModal(
        'Erreur',
        error.message || 'Impossible de supprimer le patient',
        'error'
      );
    } finally {
      setIsDeleting(false);
      setDeleteModalVisible(false);
    }
  }, [token, router, showCustomModal]);

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      router.replace('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      router.replace('/login');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await loadPatients();
      await loadDashboardData();
    };
    loadData();
  }, []);

  // Refresh data when screen comes into focus (e.g., after adding a patient)
  useFocusEffect(
    useCallback(() => {
      console.log('📱 Dashboard screen focused - refreshing data...');
      const refreshData = async () => {
        await loadPatients();
        await loadDashboardData();
      };
      refreshData();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadPatients();
    await loadDashboardData();
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  // Memoize the patient card renderer
  const renderPatientCard = useCallback(({ item }: { item: Patient }) => {
    const nameParts = item.name.split(' ');
    const initials = nameParts.length >= 2 
      ? `${nameParts[0].charAt(0)}${nameParts[nameParts.length - 1].charAt(0)}`
      : item.name.substring(0, 2).toUpperCase();
    
    return (
      <View style={styles.patientCard}>
        <LinearGradient
          colors={["rgba(255, 255, 255, 0.1)", "rgba(255, 255, 255, 0.05)"]}
          style={styles.patientCardGradient}
        >
          <View style={styles.patientHeader}>
            <View style={styles.patientAvatar}>
              <Text style={styles.patientInitials}>
                {initials}
              </Text>
            </View>
            <View style={styles.patientInfo}>
              <Text style={styles.patientName}>
                {item.name}
              </Text>
              <Text style={styles.patientEmail}>{item.email}</Text>
              <Text style={styles.patientPhone}>{item.phoneNumber}</Text>
            </View>
            <View style={styles.patientStats}>
              <View style={styles.medicationBadge}>
                <Ionicons name="medical" size={16} color="#4facfe" />
                <Text style={styles.medicationCount}>{item.medicationCount || item.medications?.length || 0}</Text>
              </View>
            </View>
          </View>
        
        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.viewProfileButton}
            onPress={() => handleViewProfile(item)}
          >
            <LinearGradient
              colors={['#4facfe', '#00f2fe']}
              style={styles.buttonGradient}
            >
              <Ionicons name="person" size={16} color="white" />
              <Text style={styles.buttonText}>Profil</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeletePatient(item)}
          >
            <LinearGradient
              colors={['#FF6B6B', '#EE5A52']}
              style={styles.buttonGradient}
            >
              <Ionicons name="trash" size={16} color="white" />
              <Text style={styles.buttonText}>Supprimer</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
    );
  }, [handleViewProfile, handleDeletePatient]);

  // Memoize the header to prevent unnecessary re-renders
  const renderHeader = useCallback(() => (
    <View style={styles.header}>
      <LinearGradient
        colors={["#4facfe", "#00f2fe"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.welcomeText}>
                Bonjour, {userName || (userType === 'tuteur' ? 'Tuteur' : 'Docteur')}
              </Text>
              <Text style={styles.headerTitle}>Tableau de bord</Text>
            </View>
            <View style={styles.headerButtons}>
              <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/doctor-profile' as any)}>
                <Ionicons name="person-circle-outline" size={28} color="white" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Stats Cards */}
          {dashboardStats && (
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Ionicons name="people" size={24} color="white" />
                <Text style={styles.statNumber}>{dashboardStats.totalPatients}</Text>
                <Text style={styles.statLabel}>Patients</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="alert-circle" size={24} color="white" />
                <Text style={styles.statNumber}>{dashboardStats.medicationAlerts?.length || 0}</Text>
                <Text style={styles.statLabel}>Alertes</Text>
              </View>
            </View>
          )}
        </View>
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="rgba(255, 255, 255, 0.6)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un patient..."
            placeholderTextColor="rgba(255, 255, 255, 0.6)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <Ionicons name="close-circle" size={20} color="rgba(255, 255, 255, 0.6)" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  ), [searchQuery, dashboardStats, clearSearch]);

  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={64} color="rgba(255, 255, 255, 0.3)" />
      <Text style={styles.emptyTitle}>Aucun patient trouvé</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery ? 'Aucun patient ne correspond à votre recherche' : 'Commencez par ajouter vos premiers patients'}
      </Text>
    </View>
  ), [searchQuery]);

  // Memoize keyExtractor
  const keyExtractor = useCallback((item: Patient) => item.id, []);

  return (
  <SafeAreaView style={styles.container}>
    <LinearGradient
      colors={["#1a1a2e", "#16213e", "#0f3460"]}
      style={styles.background}
    >
      {/* Header stays on top */}
      <LinearGradient
        colors={["#4facfe", "#00f2fe"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.welcomeText}>
                Bonjour, {userName || (userType === 'tuteur' ? 'Tuteur' : 'Docteur')}
              </Text>
              <Text style={styles.headerTitle}>Tableau de bord</Text>
            </View>
            <View style={styles.headerButtons}>
              <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/doctor-profile' as any)}>
                <Ionicons name="person-circle-outline" size={28} color="white" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats */}
          {dashboardStats && (
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Ionicons name="people" size={24} color="white" />
                <Text style={styles.statNumber}>{dashboardStats.totalPatients}</Text>
                <Text style={styles.statLabel}>Patients</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="alert-circle" size={24} color="white" />
                <Text style={styles.statNumber}>{dashboardStats.medicationAlerts?.length || 0}</Text>
                <Text style={styles.statLabel}>Alertes</Text>
              </View>
            </View>
          )}
        </View>
      </LinearGradient>

      {/* ✅ Search bar OUTSIDE the FlatList */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="rgba(255, 255, 255, 0.6)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un patient..."
            placeholderTextColor="rgba(255, 255, 255, 0.6)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <Ionicons name="close-circle" size={20} color="rgba(255, 255, 255, 0.6)" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ✅ FlatList below, no header */}
      <FlatList
        data={filteredPatients}
        renderItem={renderPatientCard}
        keyExtractor={keyExtractor}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="white"
            colors={["#4facfe"]}
          />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        removeClippedSubviews={false}
      />

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={handleAddPatient}
      >
        <LinearGradient
          colors={["#4facfe", "#00f2fe"]}
          style={styles.addButtonGradient}
        >
          <Ionicons name="add" size={28} color="white" />
        </LinearGradient>
      </TouchableOpacity>
    </LinearGradient>

    {/* Delete Confirmation Modal */}
    <DeleteConfirmationModal
      visible={deleteModalVisible}
      patient={selectedPatient}
      onClose={() => setDeleteModalVisible(false)}
      onConfirm={confirmDeletePatient}
      isDeleting={isDeleting}
    />

    {/* Custom Modal */}
    <CustomModal
      visible={customModalVisible}
      title={customModalConfig.title}
      message={customModalConfig.message}
      type={customModalConfig.type}
      onClose={() => setCustomModalVisible(false)}
      primaryButton={customModalConfig.primaryButton}
      secondaryButton={customModalConfig.secondaryButton}
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
  listContainer: {
    paddingBottom: 100, // Space for floating button
  },
  
  // Header Styles
  header: {
    marginBottom: 10,
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
    color: 'white',
    marginTop: 5,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  
  // Search Styles
  searchContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: 'white',
  },
  
  // Patient Card Styles
  patientCard: {
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  patientCardGradient: {
    padding: 20,
  },
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  patientAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(79, 172, 254, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  patientInitials: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4facfe',
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  patientEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 2,
  },
  patientPhone: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  patientStats: {
    alignItems: 'center',
  },
  medicationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(79, 172, 254, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  medicationCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4facfe',
    marginLeft: 4,
  },
  
  // Action Button Styles
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  viewProfileButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  deleteButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
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
    color: 'white',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 22,
  },
  
  // Add Button Styles
  addButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: '#4facfe',
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