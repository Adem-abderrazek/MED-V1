import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiService from '../../shared/services/api';
import CustomModal from '../../shared/components/ui/Modal';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../shared/constants/colors';

interface AdherenceStats {
  overall: number;
  last7Days: number;
  last30Days: number;
  currentStreak: number;
  bestStreak: number;
  totalMedications: number;
  totalTaken: number;
  totalMissed: number;
}

interface DailyAdherence {
  date: string;
  total: number;
  taken: number;
  missed: number;
  rate: number;
}

export default function PatientAdherenceHistoryScreen() {
  const router = useRouter();
  const { i18n } = useTranslation();
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState<AdherenceStats>({
    overall: 85,
    last7Days: 90,
    last30Days: 87,
    currentStreak: 5,
    bestStreak: 12,
    totalMedications: 120,
    totalTaken: 102,
    totalMissed: 18,
  });
  const [dailyHistory, setDailyHistory] = useState<DailyAdherence[]>([
    { date: '2025-10-08', total: 4, taken: 4, missed: 0, rate: 100 },
    { date: '2025-10-07', total: 4, taken: 4, missed: 0, rate: 100 },
    { date: '2025-10-06', total: 4, taken: 3, missed: 1, rate: 75 },
    { date: '2025-10-05', total: 4, taken: 4, missed: 0, rate: 100 },
    { date: '2025-10-04', total: 4, taken: 4, missed: 0, rate: 100 },
    { date: '2025-10-03', total: 4, taken: 3, missed: 1, rate: 75 },
    { date: '2025-10-02', total: 4, taken: 4, missed: 0, rate: 100 },
  ]);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info',
  });

  useEffect(() => {
    const loadToken = async () => {
      const storedToken = await AsyncStorage.getItem('userToken');
      setToken(storedToken);
      setIsLoading(false);
    };
    loadToken();
  }, []);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // In future, load real data from API
    setTimeout(() => setIsRefreshing(false), 1000);
  }, []);

  const getAdherenceColor = (rate: number) => {
    if (rate >= 90) return COLORS.patient.primary;
    if (rate >= 75) return COLORS.info[0];
    if (rate >= 60) return COLORS.warning[0];
    return COLORS.error[0];
  };

  const getAdherenceGrade = (rate: number) => {
    if (rate >= 90) return 'Excellent';
    if (rate >= 75) return 'Bien';
    if (rate >= 60) return 'Passable';
    return 'À améliorer';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const locale = i18n.language === 'ar' ? 'ar-TN' : i18n.language === 'fr' ? 'fr-FR' : 'en-US';
    return date.toLocaleDateString(locale, {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      numberingSystem: 'latn' // Force Western numerals
    });
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={COLORS.patient.background} style={styles.background}>
          {/* Header */}
          <LinearGradient
            colors={[COLORS.patient.primary, COLORS.patient.primaryLight] as const}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.header}
          >
            <TouchableOpacity style={styles.backButton} onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(patient)/dashboard');
              }
            }}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Historique d'Observance</Text>
            <View style={styles.headerSpacer} />
          </LinearGradient>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                tintColor="white"
                colors={[COLORS.primary] as const}
              />
            }
          >
            {/* Overall Stats Card */}
            <View style={styles.statsCard}>
              <LinearGradient
                colors={COLORS.patient.cardBg}
                style={styles.statsCardGradient}
              >
                <View style={styles.overallContainer}>
                  <View style={styles.overallCircle}>
                    <LinearGradient
                      colors={[COLORS.patient.primary, COLORS.patient.primaryLight] as const}
                      style={styles.circleGradient}
                    >
                      <Text style={styles.overallRate}>{stats.overall}%</Text>
                    </LinearGradient>
                  </View>
                  <Text style={styles.overallLabel}>Observance globale</Text>
                  <Text style={[styles.overallGrade, { color: getAdherenceColor(stats.overall) }]}>
                    {getAdherenceGrade(stats.overall)}
                  </Text>
                </View>

                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Ionicons name="calendar" size={24} color={COLORS.patient.primary} />
                    <Text style={styles.statValue}>{stats.last7Days}%</Text>
                    <Text style={styles.statLabel}>7 derniers jours</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="calendar-outline" size={24} color={COLORS.patient.primary} />
                    <Text style={styles.statValue}>{stats.last30Days}%</Text>
                    <Text style={styles.statLabel}>30 derniers jours</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* Streaks Card */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔥 Séries</Text>
              <View style={styles.card}>
                <LinearGradient
                  colors={COLORS.patient.cardBg}
                  style={styles.cardGradient}
                >
                  <View style={styles.streakRow}>
                    <View style={styles.streakItem}>
                      <View style={styles.streakIcon}>
                        <Ionicons name="flame" size={32} color={COLORS.warning[0]} />
                      </View>
                      <Text style={styles.streakValue}>{stats.currentStreak}</Text>
                      <Text style={styles.streakLabel}>Série actuelle</Text>
                      <Text style={styles.streakSubLabel}>jours consécutifs</Text>
                    </View>
                    <View style={styles.streakDivider} />
                    <View style={styles.streakItem}>
                      <View style={styles.streakIcon}>
                        <Ionicons name="trophy" size={32} color="#FFD700" />
                      </View>
                      <Text style={styles.streakValue}>{stats.bestStreak}</Text>
                      <Text style={styles.streakLabel}>Meilleure série</Text>
                      <Text style={styles.streakSubLabel}>record personnel</Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            </View>

            {/* Summary Card */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📊 Résumé</Text>
              <View style={styles.card}>
                <LinearGradient
                  colors={COLORS.patient.cardBg}
                  style={styles.cardGradient}
                >
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                      <Ionicons name="medical" size={20} color={COLORS.textSecondary} />
                      <Text style={styles.summaryLabel}>Total prescrit</Text>
                      <Text style={styles.summaryValue}>{stats.totalMedications}</Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Ionicons name="checkmark-circle" size={20} color={COLORS.patient.primary} />
                      <Text style={styles.summaryLabel}>Pris</Text>
                      <Text style={[styles.summaryValue, { color: COLORS.patient.primary }]}>{stats.totalTaken}</Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Ionicons name="close-circle" size={20} color={COLORS.error[0]} />
                      <Text style={styles.summaryLabel}>Manqués</Text>
                      <Text style={[styles.summaryValue, { color: COLORS.error[0] }]}>{stats.totalMissed}</Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            </View>

            {/* Daily History */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📅 Historique quotidien</Text>
              {dailyHistory.map((day, index) => (
                <View key={day.date} style={styles.historyCard}>
                  <LinearGradient
                    colors={COLORS.patient.cardBg}
                    style={styles.historyCardGradient}
                  >
                    <View style={styles.historyHeader}>
                      <Text style={styles.historyDate}>{formatDate(day.date)}</Text>
                      <View style={[styles.rateBadge, { backgroundColor: `${getAdherenceColor(day.rate)}20` }]}>
                        <Text style={[styles.rateText, { color: getAdherenceColor(day.rate) }]}>
                          {day.rate}%
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.historyStats}>
                      <View style={styles.historyStatItem}>
                        <Ionicons name="medical-outline" size={16} color={COLORS.textTertiary} />
                        <Text style={styles.historyStatText}>{day.total} total</Text>
                      </View>
                      <View style={styles.historyStatItem}>
                        <Ionicons name="checkmark" size={16} color={COLORS.patient.primary} />
                        <Text style={styles.historyStatText}>{day.taken} pris</Text>
                      </View>
                      {day.missed > 0 && (
                        <View style={styles.historyStatItem}>
                          <Ionicons name="close" size={16} color={COLORS.error[0]} />
                          <Text style={styles.historyStatText}>{day.missed} manqués</Text>
                        </View>
                      )}
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressBarContainer}>
                      <View style={styles.progressBarBg}>
                        <View 
                          style={[
                            styles.progressBarFill, 
                            { 
                              width: `${day.rate}%`,
                              backgroundColor: getAdherenceColor(day.rate)
                            }
                          ]} 
                        />
                      </View>
                    </View>
                  </LinearGradient>
                </View>
              ))}
            </View>

            {/* Tips Card */}
            <View style={styles.section}>
              <View style={styles.tipsCard}>
                <LinearGradient
                  colors={[`${COLORS.info[0]}1A`, `${COLORS.info[0]}0D`] as const}
                  style={styles.tipsGradient}
                >
                  <View style={styles.tipsHeader}>
                    <Ionicons name="bulb" size={24} color={COLORS.info[0]} />
                    <Text style={[styles.tipsTitle, { color: COLORS.info[0] }]}>Conseils pour améliorer votre observance</Text>
                  </View>
                  <Text style={styles.tipText}>
                    • Prenez vos médicaments à la même heure chaque jour{'\n'}
                    • Utilisez les rappels de l'application{'\n'}
                    • Gardez vos médicaments dans un endroit visible{'\n'}
                    • Parlez à votre tuteur en cas de difficultés
                  </Text>
                </LinearGradient>
              </View>
            </View>

            <View style={styles.bottomSpacing} />
          </ScrollView>

          {/* Modal */}
          <CustomModal
            visible={modalVisible}
            title={modalConfig.title}
            message={modalConfig.message}
            type={modalConfig.type}
            onClose={() => setModalVisible(false)}
          />
        </LinearGradient>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },

  // Stats Card
  statsCard: {
    marginTop: 24,
    borderRadius: 20,
    overflow: 'hidden',
  },
  statsCardGradient: {
    padding: 24,
  },
  overallContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  overallCircle: {
    marginBottom: 16,
  },
  circleGradient: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.patient.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  overallRate: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
  },
  overallLabel: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  overallGrade: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: 16,
    borderRadius: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textTertiary,
    textAlign: 'center',
  },

  // Streaks
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 20,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakItem: {
    flex: 1,
    alignItems: 'center',
  },
  streakIcon: {
    marginBottom: 12,
  },
  streakValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  streakLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  streakSubLabel: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  streakDivider: {
    width: 1,
    height: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 16,
  },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 8,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },

  // Daily History
  historyCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  historyCardGradient: {
    padding: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyDate: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  rateBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  rateText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  historyStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  historyStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyStatText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  progressBarContainer: {
    marginTop: 4,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Tips Card
  tipsCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  tipsGradient: {
    padding: 20,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
    flex: 1,
  },
  tipText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },

  bottomSpacing: {
    height: 40,
  },
});

