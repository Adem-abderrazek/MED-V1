import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Medication } from '../../../shared/types';
import { formatTime } from '../../../shared/utils/formatting/timeFormatting';
import { COLORS } from '../../../shared/constants/colors';
import { useTranslation } from 'react-i18next';

interface MedicationCardProps {
  medication: Medication;
  selectedDate: Date;
  currentTime: Date;
  onMarkAsTaken: (reminderId: string) => void;
}

export default function MedicationCard({
  medication,
  selectedDate,
  currentTime,
  onMarkAsTaken,
}: MedicationCardProps) {
  const { t } = useTranslation();

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

  const getMedicationStatusIcon = (status: string) => {
    switch (status) {
      case 'taken':
        return { name: 'checkmark-circle' as const, color: COLORS.patient.primary };
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

  const selectedIsToday = isToday(selectedDate);
  const selectedIsPast = isPastDate(selectedDate);
  const showNotTakenBadge = selectedIsPast && 
    (medication.status === 'pending' || medication.status === 'scheduled' || medication.status === 'missed');

  const now = currentTime;
  const scheduledTime = new Date(medication.scheduledFor);
  const gracePeriodMinutes = 5;
  const earliestAllowedTime = new Date(scheduledTime.getTime() - (gracePeriodMinutes * 60 * 1000));
  const isTimeValid = now >= earliestAllowedTime;
  
  const timeUntilAllowedMs = earliestAllowedTime.getTime() - now.getTime();
  const timeUntilAllowedMinutes = Math.ceil(timeUntilAllowedMs / (1000 * 60));
  const hours = Math.floor(timeUntilAllowedMinutes / 60);
  const minutes = timeUntilAllowedMinutes % 60;

  const formatTimeRemaining = () => {
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    } else {
      return `${minutes}min`;
    }
  };

  const showTakeButton = selectedIsToday && 
    (medication.status === 'pending' || medication.status === 'scheduled') && 
    isTimeValid;
  
  const showTimeWarning = selectedIsToday && 
    (medication.status === 'pending' || medication.status === 'scheduled') && 
    !isTimeValid;

  const statusIcon = getMedicationStatusIcon(medication.status);

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={showNotTakenBadge 
          ? (['rgba(239, 68, 68, 0.1)', 'rgba(239, 68, 68, 0.05)'] as const)
          : COLORS.patient.cardBg
        }
        style={styles.cardGradient}
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="medical" size={24} color={COLORS.patient.primary} />
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>{medication.medicationName}</Text>
            <Text style={styles.dosage}>{medication.dosage}</Text>
          </View>
          <View style={styles.status}>
            <Ionicons name={statusIcon.name} size={24} color={statusIcon.color} />
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.timeContainer}>
            <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.timeText}>{formatTime(medication.scheduledFor)}</Text>
          </View>
          
          <View style={styles.statusBadge}>
            <Text style={[styles.statusText, { color: statusIcon.color }]}>
              {getMedicationStatusText(medication.status)}
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
              {t('dashboard.patient.availableIn')} {formatTimeRemaining()} ({formatTime(medication.scheduledFor)})
            </Text>
          </View>
        )}

        {showTakeButton && (
          <TouchableOpacity
            style={styles.takeButton}
            onPress={() => onMarkAsTaken(medication.reminderId)}
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
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 15,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardGradient: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  dosage: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  status: {
    marginLeft: 8,
  },
  footer: {
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
});





