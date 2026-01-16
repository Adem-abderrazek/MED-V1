import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { formatDate } from '../../../shared/utils/formatting/timeFormatting';
import { Patient } from '../hooks/usePatientProfile';

interface PatientInfoCardProps {
  patient: Patient;
  medicationCount: number;
  colors: {
    primary: string;
    text: string;
    textSecondary: string;
    cardBg: string[];
  };
}

export default function PatientInfoCard({ patient, medicationCount, colors }: PatientInfoCardProps) {
  return (
    <View style={styles.card}>
      <LinearGradient
        colors={colors.cardBg}
        style={styles.cardGradient}
      >
        <View style={styles.patientHeader}>
          <View style={[styles.patientAvatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.patientInitials}>
              {(patient.firstName || 'P').charAt(0)}{(patient.lastName || 'I').charAt(0)}
            </Text>
          </View>
          <View style={styles.patientInfo}>
            <Text style={[styles.patientName, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">
              {patient.firstName || 'Patient'} {patient.lastName || 'Inconnu'}
            </Text>
            <Text style={[styles.patientSubtitle, { color: colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">
              {medicationCount} médicament(s) actif(s)
            </Text>
          </View>
        </View>

        <View style={styles.contactInfo}>
          <View style={styles.contactRow}>
            <View style={[styles.contactIcon, { backgroundColor: `${colors.primary}20` }]}>
              <Ionicons name="mail" size={20} color={colors.primary} />
            </View>
            <View style={styles.contactDetails}>
              <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>Email</Text>
              <Text style={[styles.contactValue, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">
                {patient.email}
              </Text>
            </View>
          </View>

          <View style={styles.contactRow}>
            <View style={[styles.contactIcon, { backgroundColor: `${colors.primary}20` }]}>
              <Ionicons name="call" size={20} color={colors.primary} />
            </View>
            <View style={styles.contactDetails}>
              <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>Téléphone</Text>
              <Text style={[styles.contactValue, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">
                {patient.phoneNumber}
              </Text>
            </View>
          </View>

          {patient.lastVisit && (
            <View style={styles.contactRow}>
              <View style={[styles.contactIcon, { backgroundColor: `${colors.primary}20` }]}>
                <Ionicons name="calendar" size={20} color={colors.primary} />
              </View>
              <View style={styles.contactDetails}>
                <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>Dernière visite</Text>
                <Text style={[styles.contactValue, { color: colors.text }]}>
                  {formatDate(patient.lastVisit)}
                </Text>
              </View>
            </View>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 20,
  },
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  patientAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  patientInitials: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  patientSubtitle: {
    fontSize: 14,
  },
  contactInfo: {
    gap: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contactDetails: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 16,
    fontWeight: '500',
  },
});

