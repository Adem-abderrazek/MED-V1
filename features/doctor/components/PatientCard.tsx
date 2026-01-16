import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Patient } from '../../../shared/types';
import { useTranslation } from 'react-i18next';

interface PatientCardProps {
  patient: Patient;
  onViewProfile: (patient: Patient) => void;
  onDelete: (patient: Patient) => void;
  themeColors?: {
    primary: string;
    gradient: string[];
  };
}

export default function PatientCard({
  patient,
  onViewProfile,
  onDelete,
  themeColors,
}: PatientCardProps) {
  const { t } = useTranslation();
  
  // Default to blue theme if not provided
  const primaryColor = themeColors?.primary || '#4facfe';
  const gradientColors = themeColors?.gradient || ['#4facfe', '#00f2fe'];

  const nameParts = patient.name?.split(' ') || [patient.firstName, patient.lastName].filter(Boolean);
  const initials = nameParts.length >= 2 
    ? `${nameParts[0].charAt(0)}${nameParts[nameParts.length - 1].charAt(0)}`
    : (patient.name || patient.firstName || 'P').substring(0, 2).toUpperCase();

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
        style={styles.cardGradient}
      >
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: `${primaryColor}20` }]}>
            <Text style={[styles.initials, { color: primaryColor }]}>{initials}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>{patient.name || `${patient.firstName} ${patient.lastName}`}</Text>
            <Text style={styles.email}>{patient.email}</Text>
            <Text style={styles.phone}>{patient.phoneNumber}</Text>
          </View>
          <View style={styles.stats}>
            <View style={[styles.medicationBadge, { backgroundColor: `${primaryColor}20` }]}>
              <Ionicons name="medical" size={16} color={primaryColor} />
              <Text style={[styles.medicationCount, { color: primaryColor }]}>
                {patient.medicationCount || patient.medications?.length || 0}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.viewProfileButton}
            onPress={() => onViewProfile(patient)}
          >
            <LinearGradient
              colors={gradientColors}
              style={styles.buttonGradient}
            >
              <Ionicons name="person" size={16} color="white" />
              <Text style={styles.buttonText}>Profil</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => onDelete(patient)}
          >
            <LinearGradient
              colors={['#FF6B6B', '#EE5A52']}
              style={styles.buttonGradient}
            >
              <Ionicons name="trash" size={16} color="white" />
              <Text style={styles.buttonText}>{t('dashboard.doctor.delete')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
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
  cardGradient: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  initials: {
    fontSize: 18,
    fontWeight: 'bold',
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
  email: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 2,
  },
  phone: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  stats: {
    alignItems: 'center',
  },
  medicationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  medicationCount: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
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
});



