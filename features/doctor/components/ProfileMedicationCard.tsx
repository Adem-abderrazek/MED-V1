import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Medication } from '../hooks/usePatientProfile';

interface ProfileMedicationCardProps {
  medication: Medication;
  onEdit: (medication: Medication) => void;
  onDelete: (medication: Medication) => void;
  colors: {
    primary: string;
    text: string;
    textSecondary: string;
    cardBg: string[];
  };
}

export default function ProfileMedicationCard({
  medication,
  onEdit,
  onDelete,
  colors,
}: ProfileMedicationCardProps) {
  const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <View style={styles.medicationCard}>
      <LinearGradient
        colors={colors.cardBg}
        style={styles.medicationCardGradient}
      >
        <View style={styles.medicationHeader}>
          <View style={[styles.medicationIcon, { backgroundColor: `${colors.primary}20` }]}>
            <Ionicons name="medical" size={24} color={colors.primary} />
          </View>
          <View style={styles.medicationInfo}>
            <Text style={[styles.medicationName, { color: colors.text }]}>
              {medication.medication?.name || medication.name}
            </Text>
            <Text style={[styles.medicationDosage, { color: colors.textSecondary }]}>
              {medication.customDosage || medication.medication?.dosage || medication.dosage}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: medication.isActive ? '#10B981' : '#EF4444' },
            ]}
          >
            <Text style={styles.statusText}>
              {medication.isActive ? 'Actif' : 'Inactif'}
            </Text>
          </View>
        </View>

        <View style={styles.medicationDetails}>
          {/* Schedule Times - Prominently Displayed */}
          {medication.schedules && medication.schedules.length > 0 && (
            <View style={[styles.scheduleHighlight, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}>
              <View style={styles.scheduleHeader}>
                <Ionicons name="alarm" size={20} color={colors.primary} />
                <Text style={[styles.scheduleTitle, { color: colors.primary }]}>Horaires de prise:</Text>
              </View>
              <View style={styles.scheduleTimes}>
                {medication.schedules.map((schedule, index) => (
                  <View key={index} style={[styles.scheduleTimeChip, { backgroundColor: colors.primary }]}>
                    <Ionicons name="time-outline" size={14} color="white" />
                    <Text style={styles.scheduleTimeText}>{schedule.time}</Text>
                  </View>
                ))}
              </View>
              {/* Days of week if available */}
              {medication.schedules[0]?.days && medication.schedules[0].days.length > 0 && (
                <View style={[styles.scheduleDays, { borderTopColor: `${colors.primary}20` }]}>
                  <Text style={[styles.scheduleDaysText, { color: colors.textSecondary }]}>
                    {medication.schedules[0].days.map((day: number) => dayNames[day - 1]).join(', ')}
                  </Text>
                </View>
              )}
            </View>
          )}

          {medication.instructions && (
            <View style={styles.detailRow}>
              <Ionicons name="information-circle" size={16} color={colors.textSecondary} />
              <Text style={[styles.detailText, { color: colors.text }]}>{medication.instructions}</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Ionicons name="repeat" size={16} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.text }]}>
              {medication.isChronic ? 'Chronique' : 'Temporaire'}
            </Text>
          </View>
        </View>

        <View style={[styles.medicationActions, { borderTopColor: `${colors.text}10` }]}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: `${colors.primary}20` }]}
            onPress={() => onEdit(medication)}
          >
            <Ionicons name="create-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: colors.primary }]}>Modifier</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => onDelete(medication)}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Supprimer</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  medicationCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  medicationCardGradient: {
    padding: 16,
  },
  medicationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  medicationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  medicationDosage: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  medicationDetails: {
    gap: 8,
  },
  scheduleHighlight: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  scheduleTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  scheduleTimes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  scheduleTimeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  scheduleTimeText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },
  scheduleDays: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  scheduleDaysText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  medicationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButtonText: {
    color: '#EF4444',
  },
});

