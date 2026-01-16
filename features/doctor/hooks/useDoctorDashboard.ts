import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDoctorPatients, getDoctorDashboard, deletePatient } from '../../../shared/services/api/caregiver';
import { Patient, DoctorDashboardStats } from '../../../shared/types';
import { useAuthToken } from '../../../shared/hooks/useAuthToken';
import { useTranslation } from 'react-i18next';

export function useDoctorDashboard() {
  const router = useRouter();
  const { t } = useTranslation();
  const { token, isLoading: isTokenLoading } = useAuthToken();
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<DoctorDashboardStats | null>(null);
  const [userType, setUserType] = useState<'medecin' | 'tuteur' | null>(null);
  const [userName, setUserName] = useState<string>('');

  const filteredPatients = useMemo(() => {
    if (searchQuery.trim() === '') {
      return patients;
    }
    
    return patients.filter(patient => {
      const name = patient.name || `${patient.firstName} ${patient.lastName}`;
      return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.phoneNumber.includes(searchQuery);
    });
  }, [patients, searchQuery]);

  const loadPatients = useCallback(async () => {
    if (isTokenLoading) {
      return;
    }
    
    try {
      if (!token) {
        router.push('/(auth)/login' as any);
        return;
      }

      const result = await getDoctorPatients(token);

      if (result.success && result.data && Array.isArray(result.data)) {
        const transformedPatients = result.data.map((patient: any) => ({
          id: patient.id,
          name: `${patient.firstName} ${patient.lastName}`,
          age: patient.age || 0,
          phoneNumber: patient.phoneNumber,
          email: patient.email,
          createdAt: patient.createdAt || new Date(),
          lastLogin: patient.lastLogin || patient.lastVisit,
          adherenceRate: patient.adherenceRate || 0,
          medications: patient.medications || [],
          medicationCount: patient.medicationCount || 0,
          lastActivity: patient.lastActivity || patient.lastVisit || 'N/A',
          firstName: patient.firstName,
          lastName: patient.lastName,
        }));

        setPatients(transformedPatients);

        setDashboardStats(prev => ({
          totalPatients: transformedPatients.length,
          recentPatients: transformedPatients.slice(0, 5),
          upcomingAppointments: prev?.upcomingAppointments || [],
          medicationAlerts: prev?.medicationAlerts || [],
        }));
      } else {
        setPatients([]);
      }
    } catch (error: any) {
      console.error('❌ Error loading patients:', error);
      setPatients([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [token, isTokenLoading, router]);

  const loadDashboardData = useCallback(async () => {
    if (isTokenLoading || !token) {
      return;
    }

    try {
      const result = await getDoctorDashboard(token);

      if (result.success && result.data) {
        setDashboardStats(prev => ({
          totalPatients: prev?.totalPatients || 0,
          recentPatients: prev?.recentPatients || [],
          upcomingAppointments: (result.data as any).upcomingAppointments || [],
          medicationAlerts: (result.data as any).medicationAlerts || (result.data as any).alerts?.missedMedications || [],
        }));
      }
    } catch (error: any) {
      console.error('❌ Error loading dashboard data:', error);
    }
  }, [token, isTokenLoading]);

  const handleDeletePatient = useCallback(async (patient: Patient) => {
    if (!token) return { success: false, message: t('dashboard.doctor.sessionExpired') };

    try {
      const result = await deletePatient(token, patient.id);

      if (result.success) {
        setPatients(prev => prev.filter(p => p.id !== patient.id));
        setDashboardStats(prev => prev ? {
          ...prev,
          totalPatients: prev.totalPatients - 1,
          recentPatients: prev.recentPatients?.filter(p => p.id !== patient.id) || []
        } : null);

        await loadPatients();
        await loadDashboardData();

        return { 
          success: true, 
          message: `${patient.firstName} ${patient.lastName} ${t('dashboard.doctor.patientDeleted')}` 
        };
      } else {
        return { success: false, message: result.message || t('dashboard.doctor.deletePatientError') };
      }
    } catch (error: any) {
      console.error('Error deleting patient:', error);
      return { success: false, message: error.message || t('dashboard.doctor.deletePatientError') };
    }
  }, [token, loadPatients, loadDashboardData, t]);

  const handleLogout = useCallback(async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      router.replace('/(auth)/login' as any);
    } catch (error) {
      console.error('Error during logout:', error);
      router.replace('/(auth)/login' as any);
    }
  }, [router]);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
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

  useEffect(() => {
    if (!isTokenLoading && token) {
      loadPatients();
      loadDashboardData();
    }
  }, [token, isTokenLoading, loadPatients, loadDashboardData]);

  return {
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
    isTokenLoading,
  };
}





