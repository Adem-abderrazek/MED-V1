import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PrescriptionFormFieldsProps {
  customDosage: string;
  onCustomDosageChange: (dosage: string) => void;
  instructions: string;
  onInstructionsChange: (instructions: string) => void;
  isChronic: boolean;
  onIsChronicChange: (isChronic: boolean) => void;
}

export default function PrescriptionFormFields({
  customDosage,
  onCustomDosageChange,
  instructions,
  onInstructionsChange,
  isChronic,
  onIsChronicChange,
}: PrescriptionFormFieldsProps) {
  return (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DOSAGE</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: 500mg, 2 comprimés"
          placeholderTextColor="rgba(255, 255, 255, 0.4)"
          value={customDosage}
          onChangeText={onCustomDosageChange}
        />
        <Text style={styles.helperText}>
          Le dosage par prise (optionnel si déjà défini dans le médicament)
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DURÉE</Text>
        <View style={styles.durationContainer}>
          <TouchableOpacity
            style={[styles.durationButton, isChronic && styles.durationButtonActive]}
            onPress={() => onIsChronicChange(true)}
          >
            <Ionicons 
              name="infinite" 
              size={20} 
              color={isChronic ? 'white' : 'rgba(255, 255, 255, 0.6)'} 
            />
            <Text style={[
              styles.durationButtonText,
              isChronic && styles.durationButtonTextActive
            ]}>
              À vie
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.durationButton, !isChronic && styles.durationButtonActive]}
            onPress={() => onIsChronicChange(false)}
          >
            <Ionicons 
              name="calendar-outline" 
              size={20} 
              color={!isChronic ? 'white' : 'rgba(255, 255, 255, 0.6)'} 
            />
            <Text style={[
              styles.durationButtonText,
              !isChronic && styles.durationButtonTextActive
            ]}>
              Temporaire (1 mois)
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>INSTRUCTIONS (Optionnel)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Instructions particulières..."
          placeholderTextColor="rgba(255, 255, 255, 0.4)"
          value={instructions}
          onChangeText={onInstructionsChange}
          multiline
          numberOfLines={3}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 1,
    marginBottom: 12,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    color: 'white',
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 8,
  },
  durationContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  durationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 8,
  },
  durationButtonActive: {
    backgroundColor: 'rgba(79, 172, 254, 0.2)',
    borderColor: '#4facfe',
  },
  durationButtonText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
  },
  durationButtonTextActive: {
    color: 'white',
  },
});





