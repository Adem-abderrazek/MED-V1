import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { DashboardStats } from '../../../shared/types';
import { COLORS } from '../../../shared/constants/colors';
import { useTranslation } from 'react-i18next';

interface StatsCardsProps {
  stats: DashboardStats;
}

export default function StatsCards({ stats }: StatsCardsProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
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
  );
}

const styles = StyleSheet.create({
  container: {
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
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
});





