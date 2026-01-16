import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { formatTime } from '../../../shared/utils/formatting/timeFormatting';
import AdherenceChart from './AdherenceChart';

interface AdherenceStatsSectionProps {
  adherenceHistory: any;
  colors: {
    primary: string;
    text: string;
    textSecondary: string;
    cardBg: string[];
  };
}

export default function AdherenceStatsSection({ adherenceHistory, colors }: AdherenceStatsSectionProps) {
  if (!adherenceHistory) return null;

  const { overallStats, medicationAdherence, weeklyAdherence, recentHistory } = adherenceHistory;

  return (
    <>
      {/* Overall Statistics */}
      <View style={styles.adherenceStatsContainer}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Statistiques Globales ({overallStats.period})
        </Text>

        {/* Big Adherence Rate Card */}
        <View style={styles.bigStatCard}>
          <LinearGradient
            colors={
              overallStats.adherenceRate >= 80
                ? ['#10B981', '#059669']
                : overallStats.adherenceRate >= 60
                ? ['#F59E0B', '#D97706']
                : ['#EF4444', '#DC2626']
            }
            style={styles.bigStatGradient}
          >
            <Text style={styles.bigStatNumber}>
              {overallStats.adherenceRate}%
            </Text>
            <Text style={styles.bigStatLabel}>Taux d'Observance</Text>
            <View style={styles.bigStatDetails}>
              <Text style={styles.bigStatDetailText}>
                ✓ {overallStats.takenReminders} pris
              </Text>
              <Text style={styles.bigStatDetailText}>
                ✗ {overallStats.missedReminders} manqués
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.miniStatCard, { backgroundColor: colors.cardBg[0] }]}>
            <Ionicons name="checkmark-circle" size={28} color="#10B981" />
            <Text style={[styles.miniStatNumber, { color: colors.text }]}>
              {overallStats.takenReminders}
            </Text>
            <Text style={[styles.miniStatLabel, { color: colors.textSecondary }]}>Pris</Text>
          </View>

          <View style={[styles.miniStatCard, { backgroundColor: colors.cardBg[0] }]}>
            <Ionicons name="close-circle" size={28} color="#EF4444" />
            <Text style={[styles.miniStatNumber, { color: colors.text }]}>
              {overallStats.missedReminders}
            </Text>
            <Text style={[styles.miniStatLabel, { color: colors.textSecondary }]}>Manqués</Text>
          </View>

          <View style={[styles.miniStatCard, { backgroundColor: colors.cardBg[0] }]}>
            <Ionicons name="time" size={28} color="#F59E0B" />
            <Text style={[styles.miniStatNumber, { color: colors.text }]}>
              {overallStats.pendingReminders}
            </Text>
            <Text style={[styles.miniStatLabel, { color: colors.textSecondary }]}>En attente</Text>
          </View>
        </View>
      </View>

      {/* Medication-Specific Adherence */}
      {medicationAdherence && medicationAdherence.length > 0 && (
        <View style={styles.medicationAdherenceSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Par Médicament</Text>
          {medicationAdherence.map((med: any) => (
            <View key={med.id} style={[styles.medicationAdherenceCard, { backgroundColor: colors.cardBg[0] }]}>
              <View style={styles.medicationAdherenceHeader}>
                <Text style={[styles.medicationAdherenceName, { color: colors.text }]} numberOfLines={1}>
                  {med.name}
                </Text>
                <Text
                  style={[
                    styles.medicationAdherenceRate,
                    {
                      color:
                        med.adherenceRate >= 80
                          ? '#10B981'
                          : med.adherenceRate >= 60
                          ? '#F59E0B'
                          : '#EF4444',
                    },
                  ]}
                >
                  {med.adherenceRate}%
                </Text>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${med.adherenceRate}%`,
                      backgroundColor:
                        med.adherenceRate >= 80
                          ? '#10B981'
                          : med.adherenceRate >= 60
                          ? '#F59E0B'
                          : '#EF4444',
                    },
                  ]}
                />
              </View>

              <View style={styles.medicationAdherenceStats}>
                <Text style={[styles.medicationAdherenceStatText, { color: colors.textSecondary }]}>
                  ✓ {med.taken}/{med.total} pris
                </Text>
                <Text style={[styles.medicationAdherenceStatText, { color: colors.textSecondary }]}>
                  ✗ {med.missed} manqués
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Weekly Adherence Chart */}
      {weeklyAdherence && weeklyAdherence.length > 0 && (
        <AdherenceChart weeklyAdherence={weeklyAdherence} colors={colors} />
      )}

      {/* Recent History */}
      {recentHistory && recentHistory.length > 0 && (
        <View style={styles.recentHistorySection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Historique Récent</Text>
          {recentHistory.slice(0, 10).map((item: any) => (
            <View key={item.id} style={[styles.historyItem, { backgroundColor: colors.cardBg[0] }]}>
              <View style={styles.historyLeft}>
                <Ionicons
                  name={
                    item.status === 'confirmed' || item.status === 'manual_confirm'
                      ? 'checkmark-circle'
                      : item.status === 'missed'
                      ? 'close-circle'
                      : 'time'
                  }
                  size={24}
                  color={
                    item.status === 'confirmed' || item.status === 'manual_confirm'
                      ? '#10B981'
                      : item.status === 'missed'
                      ? '#EF4444'
                      : '#F59E0B'
                  }
                />
                <View style={styles.historyInfo}>
                  <Text style={[styles.historyMedName, { color: colors.text }]} numberOfLines={1}>
                    {item.medicationName}
                  </Text>
                  <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
                    {formatTime(item.scheduledFor)}
                  </Text>
                </View>
              </View>
              <View style={styles.historyRight}>
                <Text
                  style={[
                    styles.historyStatus,
                    {
                      color:
                        item.status === 'confirmed' || item.status === 'manual_confirm'
                          ? '#10B981'
                          : item.status === 'missed'
                          ? '#EF4444'
                          : item.status === 'scheduled' || item.status === 'sent'
                          ? '#F59E0B'
                          : '#999',
                    },
                  ]}
                >
                  {item.status === 'confirmed' || item.status === 'manual_confirm'
                    ? 'Pris'
                    : item.status === 'missed'
                    ? 'Manqué'
                    : item.status === 'scheduled' || item.status === 'sent'
                    ? 'En attente'
                    : 'Non défini'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  adherenceStatsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  bigStatCard: {
    marginVertical: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  bigStatGradient: {
    padding: 24,
    alignItems: 'center',
  },
  bigStatNumber: {
    fontSize: 56,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  bigStatLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 16,
  },
  bigStatDetails: {
    flexDirection: 'row',
    gap: 24,
  },
  bigStatDetailText: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  miniStatCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  miniStatNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  miniStatLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  medicationAdherenceSection: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  medicationAdherenceCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  medicationAdherenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  medicationAdherenceName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  medicationAdherenceRate: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  medicationAdherenceStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  medicationAdherenceStatText: {
    fontSize: 13,
  },
  recentHistorySection: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 40,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  historyInfo: {
    flex: 1,
  },
  historyMedName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 12,
  },
  historyRight: {
    marginLeft: 12,
  },
  historyStatus: {
    fontSize: 13,
    fontWeight: '600',
  },
});

