import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  lastVisit?: Date;
  medicationCount: number;
}

interface DeleteConfirmationModalProps {
  visible: boolean;
  patient: Patient | null;
  onClose: () => void;
  onConfirm: (patient: Patient) => void;
  isDeleting?: boolean;
}

export default function DeleteConfirmationModal({
  visible,
  patient,
  onClose,
  onConfirm,
  isDeleting = false,
}: DeleteConfirmationModalProps) {
  if (!patient) return null;

  const handleConfirm = () => {
    onConfirm(patient);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#1a1a2e', '#16213e']}
            style={styles.modalGradient}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 107, 107, 0.2)' }]}>
                <Ionicons name="warning" size={32} color="#FF6B6B" />
              </View>
              <Text style={styles.title}>Supprimer le Patient</Text>
            </View>

            {/* Message */}
            <View style={styles.messageContainer}>
              <Text style={styles.message}>
                Êtes-vous sûr de vouloir supprimer{' '}
                <Text style={styles.patientNameHighlight}>
                  {patient.firstName} {patient.lastName}
                </Text>
                {' '}de votre liste de patients ?
              </Text>
              <Text style={styles.warningText}>
                Cette action est irréversible et supprimera toutes les données associées à ce patient.
              </Text>
            </View>

            {/* Patient Info */}
            <View style={styles.patientInfoContainer}>
              <View style={styles.patientInfoRow}>
                <Ionicons name="mail" size={16} color="rgba(255, 255, 255, 0.6)" />
                <Text style={styles.patientInfoText}>{patient.email}</Text>
              </View>
              <View style={styles.patientInfoRow}>
                <Ionicons name="call" size={16} color="rgba(255, 255, 255, 0.6)" />
                <Text style={styles.patientInfoText}>{patient.phoneNumber}</Text>
              </View>
              <View style={styles.patientInfoRow}>
                <Ionicons name="medical" size={16} color="rgba(255, 255, 255, 0.6)" />
                <Text style={styles.patientInfoText}>{patient.medicationCount} médicament(s)</Text>
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                disabled={isDeleting}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleConfirm}
                disabled={isDeleting}
              >
                <LinearGradient
                  colors={['#FF6B6B', '#EE5A52']}
                  style={styles.deleteButtonGradient}
                >
                  {isDeleting ? (
                    <Text style={styles.deleteButtonText}>Suppression...</Text>
                  ) : (
                    <>
                      <Ionicons name="trash" size={16} color="white" />
                      <Text style={styles.deleteButtonText}>Supprimer</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: width * 0.9,
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  modalGradient: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  messageContainer: {
    marginBottom: 20,
  },
  message: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
  },
  patientNameHighlight: {
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  warningText: {
    fontSize: 14,
    color: 'rgba(255, 107, 107, 0.8)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  patientInfoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  patientInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  patientInfoText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
  },
  deleteButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  deleteButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
