import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { MEDICATIONS, MedicationOption } from '../../../shared/constants/medications';
import CustomMedicationForm from './CustomMedicationForm';

interface MedicationSelectorProps {
  selectedMedication: MedicationOption | null;
  medicationName: string;
  onSelectMedication: (medication: MedicationOption) => void;
  onMedicationNameChange: (name: string) => void;
  onAddCustom: () => void;
  showCustomForm: boolean;
  onCloseCustomForm: () => void;
  onSaveCustomMedication: (medication: MedicationOption) => void;
}

export default function MedicationSelector({
  selectedMedication,
  medicationName,
  onSelectMedication,
  onMedicationNameChange,
  onAddCustom,
  showCustomForm,
  onCloseCustomForm,
  onSaveCustomMedication,
}: MedicationSelectorProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMedications = MEDICATIONS.filter(m =>
    !searchQuery.trim() || m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectMedication = (med: MedicationOption) => {
    onSelectMedication(med);
    onMedicationNameChange(med.name);
    setShowPicker(false);
    setSearchQuery('');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.selectButton}
        onPress={() => setShowPicker(true)}
      >
        <LinearGradient
          colors={['#4facfe', '#00f2fe']}
          style={styles.selectButtonGradient}
        >
          <Ionicons name="search" size={20} color="white" />
          <Text style={styles.selectButtonText}>Sélectionner un médicament</Text>
        </LinearGradient>
      </TouchableOpacity>

      {selectedMedication && (
        <View style={styles.selectedCard}>
          <View style={styles.selectedHeader}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={styles.selectedTitle}>{selectedMedication.name}</Text>
          </View>
          <Text style={styles.selectedDetails}>
            {selectedMedication.genericName} • {selectedMedication.form}
          </Text>
          {selectedMedication.description && (
            <Text style={styles.selectedDescription}>
              {selectedMedication.description}
            </Text>
          )}
        </View>
      )}

      <Text style={styles.inputLabel}>Nom du médicament</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: Aspirine"
        placeholderTextColor="rgba(255, 255, 255, 0.4)"
        value={medicationName}
        onChangeText={(text) => {
          onMedicationNameChange(text);
        }}
      />

      <Modal
        visible={showPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Sélectionner un médicament</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#6B7280" />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
            </View>

            <FlatList
              data={filteredMedications}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.medicationItem}
                  onPress={() => handleSelectMedication(item)}
                >
                  <View style={styles.medicationInfo}>
                    <Text style={styles.medicationName}>{item.name}</Text>
                    <Text style={styles.medicationGeneric}>{item.genericName}</Text>
                    <Text style={styles.medicationDetails}>
                      {item.dosage} • {item.form}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}
              ListFooterComponent={() => (
                <TouchableOpacity
                  style={styles.addCustomButton}
                  onPress={() => {
                    setShowPicker(false);
                    onAddCustom();
                  }}
                >
                  <Ionicons name="add-circle" size={24} color="#4facfe" />
                  <Text style={styles.addCustomText}>Ajouter un médicament personnalisé</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  selectButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  selectButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  selectButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  selectedCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  selectedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  selectedDetails: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  selectedDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    color: 'white',
    fontSize: 16,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  medicationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  medicationGeneric: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  medicationDetails: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  addCustomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  addCustomText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4facfe',
  },
});

