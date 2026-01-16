import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, I18nManager } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { DashboardStats } from '../../../shared/types';
import { COLORS } from '../../../shared/constants/colors';
import { useTranslation } from 'react-i18next';
import StatsCards from './StatsCards';

interface DashboardHeaderProps {
  stats: DashboardStats;
  isOnline: boolean;
  onLogout: () => void;
}

export default function DashboardHeader({
  stats,
  isOnline,
  onLogout,
}: DashboardHeaderProps) {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <LinearGradient
      colors={[COLORS.patient.primary, COLORS.patient.primaryLight]}
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
              style={styles.profileButton} 
              onPress={() => router.push('/(patient)/profile-settings' as any)}
            >
              <Ionicons name="person-circle-outline" size={28} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
              <Ionicons name="log-out-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <StatsCards stats={stats} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
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
});


