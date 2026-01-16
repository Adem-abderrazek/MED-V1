import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { MedicationDetail } from '../../../shared/types';
import { formatTime, formatDate } from '../../../shared/utils/formatting/timeFormatting';

interface PrescriptionCardProps {
  prescription: MedicationDetail;
  onEdit: (prescription: MedicationDetail) => void;
  onDelete: (prescription: MedicationDetail) => void;
  onPlayVoice?: (voiceUrl: string) => void;
}

export default function PrescriptionCard({
  prescription,
  onEdit,
  onDelete,
  onPlayVoice,
}: PrescriptionCardProps) {
  const medicationName = prescription.medication?.name || prescription.name;
  const dosage = prescription.customDosage || prescription.dosage || prescription.medication?.dosage || 'N/A';

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={['rgba(79, 172, 254, 0.1)', 'rgba(79, 172, 254, 0.05)']}
        style={styles.cardGradient}
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="medical" size={24} color="#4facfe" />
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>{medicationName}</Text>
            <Text style={styles.dosage}>{dosage}</Text>
            {prescription.instructions && (
              <Text style={styles.instructions}>{prescription.instructions}</Text>
            )}
          </View>
          <View style={styles.statusContainer}>
            {prescription.isActive ? (
              <View style={styles.activeBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.activeText}>Actif</Text>
              </View>
            ) : (
              <View style={styles.inactiveBadge}>
                <Ionicons name="close-circle" size={16} color="#EF4444" />
                <Text style={styles.inactiveText}>Inactif</Text>
              </View>
            )}
          </View>
        </View>

        {prescription.schedules && prescription.schedules.length > 0 && (
          <View style={styles.schedulesContainer}>
            <Text style={styles.schedulesTitle}>Horaires:</Text>
            {prescription.schedules.map((schedule, index) => (
              <View key={index} style={styles.scheduleItem}>
                <Ionicons name="time-outline" size={14} color="rgba(255, 255, 255, 0.7)" />
                <Text style={styles.scheduleText}>
                  {schedule.time} - {schedule.days.length} jour(s)/semaine
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <View style={styles.dateInfo}>
            {prescription.startDate && (
              <Text style={styles.dateText}>
                Début: {formatDate(prescription.startDate)}
              </Text>
            )}
            {prescription.endDate && !prescription.isChronic && (
              <Text style={styles.dateText}>
                Fin: {formatDate(prescription.endDate)}
              </Text>
            )}
            {prescription.isChronic && (
              <Text style={styles.chronicText}>Traitement à vie</Text>
            )}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => onEdit(prescription)}
            >
              <Ionicons name="create-outline" size={18} color="#4facfe" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => onDelete(prescription)}
            >
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
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
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(79, 172, 254, 0.2)',
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
    color: 'white',
    marginBottom: 4,
  },
  dosage: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  instructions: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontStyle: 'italic',
  },
  statusContainer: {
    marginLeft: 8,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  activeText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  inactiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  inactiveText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  schedulesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  schedulesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  scheduleText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  dateInfo: {
    flex: 1,
  },
  dateText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 2,
  },
  chronicText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 8,
    backgroundColor: 'rgba(79, 172, 254, 0.2)',
    borderRadius: 8,
  },
  deleteButton: {
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 8,
  },
});





